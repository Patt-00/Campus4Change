import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Empty, Link } from '../../../shared/components/UI';
import { IconBadge } from '../../../shared/components/Icon';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

function spokenText(value) {
  return String(value ?? '')
    .trim()
    .replace(/[.!?]+$/, '');
}

function notificationAccessibilityLabel(notice) {
  const title = spokenText(notice.title);
  const body = spokenText(notice.body);
  return `${title}.${body ? ` ${body}.` : ''} ${notice.read ? 'Read' : 'Unread'}. Opens the related page.`;
}

function VerificationNotice({
  notice,
  message,
  resendEmail,
  checkEmail,
}) {
  const verificationComplete = message?.startsWith('Email verified');
  const verificationPending = message?.startsWith(
    'The email is not verified yet',
  );
  const sendDetails = message?.startsWith('Verification email sent')
    ? message.split('Check your inbox and spam folder.')[1]?.trim()
    : '';
  const statusMessage = message?.startsWith('Verification email sent')
    ? sendDetails
    : message?.startsWith('Verify your email address')
      ? ''
      : verificationComplete
        ? ''
      : message;
  const showMessage = Boolean(statusMessage);

  return (
    <View
      style={[
        s.card,
        styles.verificationCard,
        verificationComplete && styles.verificationCompleteCard,
      ]}
    >
      <View style={[s.row, styles.verificationHeader]}>
        <IconBadge
          name={verificationComplete ? 'check' : 'mail'}
          color={verificationComplete ? C.green : C.cyan}
        />
        <View style={s.grow}>
          <Text style={s.name}>
            {verificationComplete ? 'Email verified' : 'Verify your email'}
          </Text>
          <Text style={s.muted}>{notice.body}</Text>
        </View>
        {verificationComplete ? (
          <Text accessibilityLabel="Verified" style={s.green}>
            ✓
          </Text>
        ) : (
          <Text accessibilityLabel="Unread" style={s.blue}>
            ●
          </Text>
        )}
      </View>
      {showMessage && (
        <Text
          accessibilityRole={verificationPending ? undefined : 'alert'}
          accessibilityLiveRegion={verificationPending ? 'polite' : undefined}
          style={
            verificationPending
              ? s.muted
              : verificationComplete
                ? s.green
                : s.error
          }
        >
          {statusMessage}
        </Text>
      )}
      {!verificationComplete && (
        <View style={styles.verificationActions}>
          <Link label="Resend verification email" onPress={resendEmail} />
          <Link label="I've verified — check again" onPress={checkEmail} />
        </View>
      )}
    </View>
  );
}

export function NotificationsScreen({
  go,
  back,
  notices,
  read,
  verificationNotice,
  verificationMessage,
  resendVerificationEmail,
  refreshEmailVerification,
}) {
  return (
    <Screen title="Notifications" back={back}>
      {notices.some(n => !n.read) && (
        <Link label="Mark all as read" onPress={() => read()} />
      )}
      {verificationNotice && (
        <VerificationNotice
          notice={verificationNotice}
          message={verificationMessage}
          resendEmail={resendVerificationEmail}
          checkEmail={refreshEmailVerification}
        />
      )}
      {notices.map(n => (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={notificationAccessibilityLabel(n)}
          key={n.id}
          style={[s.row, styles.alignItemsflexstartpaddingVertical20]}
          onPress={() => {
            read(n.id);
            go(
              n.sessionId
                ? {
                    page: 'Session Details',
                    sessionId: n.sessionId,
                  }
                : n.groupId
                ? {
                    page: 'Group Details',
                    groupId: n.groupId,
                  }
                : 'Tutor Search',
            );
          }}
        >
          <IconBadge
            name={n.sessionId ? 'calendar' : n.groupId ? 'users' : 'bell'}
          />

          <View style={s.grow}>
            <Text style={[s.name, !n.read && s.blue]}>{n.title}</Text>
            <Text style={s.muted}>{n.body}</Text>
          </View>
          {!n.read && <Text style={s.blue}>●</Text>}
        </TouchableOpacity>
      ))}
      {!notices.length && !verificationNotice && (
        <Empty
          title="You're up to date"
          body="Your account, booking, and group updates will appear here."
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  verificationCard: {
    borderColor: C.cyan,
  },
  verificationCompleteCard: {
    borderColor: C.green,
  },
  verificationHeader: {
    alignItems: 'flex-start',
  },
  verificationActions: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  alignItemsflexstartpaddingVertical20: {
    alignItems: 'flex-start',
    paddingVertical: 20,
    borderBottomColor: '#1e3a46',
    borderBottomWidth: 1,
  },
});
