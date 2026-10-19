import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  sendSharedMessage,
  watchSharedMessages,
} from '../data/firestore';
import { buildSharedConversations } from '../data/sharedConversations';

export function useSharedMessages({
  uid,
  groups,
  bookings,
  activeConversationId,
  senderName,
}) {
  const conversations = useMemo(
    () => buildSharedConversations(uid, groups, bookings),
    [uid, groups, bookings],
  );
  const activeConversation = conversations.find(
    conversation => conversation.id === activeConversationId,
  );
  const activeConversationRef = useRef(activeConversation);
  activeConversationRef.current = activeConversation;
  const activeKind = activeConversation?.kind;
  const activeGroupId = activeConversation?.groupId;
  const activeBookingId = activeConversation?.bookingId;
  const [messageContext, setMessageContext] = useState({
    uid: null,
    conversationId: null,
  });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    const currentConversation = activeConversationRef.current;
    if (!uid || !currentConversation) {
      subscriptionRef.current = null;
      setMessageContext({
        uid,
        conversationId: currentConversation?.id || null,
      });
      setMessages([]);
      setLoading(false);
      setHasMoreMessages(false);
      setLoadingOlderMessages(false);
      setError('');
      return undefined;
    }

    let active = true;
    setMessageContext({
      uid,
      conversationId: currentConversation.id,
    });
    setMessages([]);
    setLoading(true);
    setHasMoreMessages(false);
    setLoadingOlderMessages(false);
    setError('');
    let subscription = null;
    try {
      subscription = watchSharedMessages(
        uid,
        currentConversation,
        (rows, paging) => {
          if (active) {
            setMessages(rows);
            setLoading(false);
            setHasMoreMessages(Boolean(paging?.hasMoreMessages));
            setLoadingOlderMessages(Boolean(paging?.loadingOlderMessages));
          }
        },
        listenerError => {
          if (active) {
            setError(
              listenerError instanceof Error
                ? listenerError.message
                : 'Could not load this chat.',
            );
            setLoading(false);
          }
        },
      );
      subscriptionRef.current = {
        uid,
        conversationId: currentConversation.id,
        subscription,
      };
    } catch (listenerError) {
      setError(
        listenerError instanceof Error
          ? listenerError.message
          : 'Could not load this chat.',
      );
      setLoading(false);
    }

    return () => {
      active = false;
      if (subscriptionRef.current?.subscription === subscription) {
        subscriptionRef.current = null;
      }
      subscription?.unsubscribe();
    };
  }, [
    uid,
    activeConversationId,
    activeKind,
    activeGroupId,
    activeBookingId,
    reloadKey,
  ]);

  const send = useCallback(
    text => {
      if (!uid || !activeConversation) {
        return Promise.reject(new Error('Choose a shared conversation.'));
      }
      if (!activeConversation.canSend) {
        return Promise.reject(
          new Error('This conversation is not accepting messages.'),
        );
      }
      return sendSharedMessage(
        uid,
        activeConversation.senderName || senderName,
        activeConversation,
        text,
      );
    },
    [uid, senderName, activeConversation],
  );

  const retry = useCallback(() => {
    setReloadKey(value => value + 1);
  }, []);

  const loadMoreMessages = useCallback(async () => {
    const current = subscriptionRef.current;
    if (
      !current ||
      current.uid !== uid ||
      current.conversationId !== activeConversation?.id ||
      !hasMoreMessages ||
      loadingOlderMessages
    ) {
      return;
    }
    setLoadingOlderMessages(true);
    setError('');
    try {
      await current.subscription.loadMoreMessages();
    } catch (loadError) {
      if (subscriptionRef.current?.subscription === current.subscription) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load older messages.',
        );
      }
    } finally {
      if (subscriptionRef.current?.subscription === current.subscription) {
        setLoadingOlderMessages(false);
      }
    }
  }, [activeConversation?.id, hasMoreMessages, loadingOlderMessages, uid]);

  const isCurrentMessageContext =
    messageContext.uid === uid &&
    messageContext.conversationId === (activeConversation?.id || null);

  return {
    conversations,
    activeConversation,
    messages: isCurrentMessageContext ? messages : [],
    loading: isCurrentMessageContext ? loading : Boolean(uid && activeConversation),
    hasMoreMessages: isCurrentMessageContext && hasMoreMessages,
    loadingOlderMessages: isCurrentMessageContext && loadingOlderMessages,
    loadMoreMessages,
    error: isCurrentMessageContext ? error : '',
    send,
    retry,
  };
}
