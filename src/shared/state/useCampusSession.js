import { useCallback, useEffect, useRef, useState } from 'react';
import { initialState } from '../data/utils';
import {
  firebaseEnabled,
  firebaseCheckEmailVerification,
  firebasePasswordReset,
  firebaseResendVerificationEmail,
  firebaseGoogleSignIn,
  firebaseGoogleSignInAvailable,
  firebaseSignIn,
  firebaseSignOut,
  firebaseSignUp,
  loadCloudState,
  saveCloudState,
  watchFirebaseUser,
} from '../backend/firebase';
import { reducer } from './reducer';
import { stateForPersistence } from './persistence';
import { deviceStore, parseAccount, parseState } from './storage';

const SIGN_OUT_CLOUD_SYNC_TIMEOUT_MS = 1200;

function asState(value, account) {
  if (!value) {
    return initialState(account);
  }
  const state = parseState(value);
  if (state.profile.id !== account.id) {
    throw new Error('Saved data belongs to a different account.');
  }

  const defaults = initialState(account);
  const profile = {
    ...defaults.profile,
    ...state.profile,
    name:
      typeof state.profile.name === 'string' && state.profile.name.trim()
        ? state.profile.name.trim()
        : defaults.profile.name,
    email:
      typeof state.profile.email === 'string'
        ? state.profile.email
        : defaults.profile.email,
    studentId:
      typeof state.profile.studentId === 'string'
        ? state.profile.studentId
        : defaults.profile.studentId,
    course:
      typeof state.profile.course === 'string'
        ? state.profile.course
        : defaults.profile.course,
    year:
      typeof state.profile.year === 'string'
        ? state.profile.year
        : defaults.profile.year,
    school:
      typeof state.profile.school === 'string'
        ? state.profile.school
        : defaults.profile.school,
    interests: stringList(state.profile.interests, defaults.profile.interests),
    tutorSubjects: stringList(
      state.profile.tutorSubjects,
      defaults.profile.tutorSubjects,
    ),
    bio: typeof state.profile.bio === 'string' ? state.profile.bio : '',
  };

  return {
    ...defaults,
    ...state,
    profile,
    sessions: objectRecords(state.sessions, defaults.sessions),
    groups: objectRecords(state.groups, defaults.groups),
    conversations: objectRecords(state.conversations, defaults.conversations),
    notices: objectRecords(state.notices, defaults.notices),
  };
}

function objectRecords(value, fallback) {
  return Array.isArray(value)
    ? value.filter(
        record => record && typeof record === 'object' && !Array.isArray(record),
      )
    : fallback;
}

function stringList(value, fallback) {
  return Array.isArray(value)
    ? value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean)
    : fallback;
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

function sessionAccountId(session) {
  if (!session) {
    return null;
  }
  return session.kind === 'firebase' ? session.uid : session.id;
}

// Firestore write promises wait for server acknowledgement, so sign-out must be bounded.
function waitForCloudWrite(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise(resolve => {
    timeoutId = setTimeout(() => resolve(false), timeoutMs);
  });
  return Promise.race([
    Promise.resolve(promise).then(Boolean, () => false),
    timeout,
  ]).finally(() => clearTimeout(timeoutId));
}

export function useCampusSession({ onSignedIn, onSignedOut }) {
  const [state, setState] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [pendingCloudUid, setPendingCloudUid] = useState(null);
  const [restoring, setRestoring] = useState(firebaseEnabled);
  const [sessionType, setSessionType] = useState(null);
  const [emailVerified, setEmailVerified] = useState(true);
  const [emailVerificationMessage, setEmailVerificationMessage] = useState('');
  const snapshot = useRef(state);
  const activeSession = useRef(null);
  const cloudHydrated = useRef(false);
  const firebaseSignOutInProgress = useRef(false);
  const cloudEntries = useRef(new Map());
  const firebaseRestoreGeneration = useRef(0);
  // Keep only the newest unsent snapshot per Firebase UID while a write is in flight.
  const cloudWrites = useRef(new Map());
  // Device writes are quick and durable; never serialize them behind network acks.
  const saveQueue = useRef(Promise.resolve());
  const callbacks = useRef({ onSignedIn, onSignedOut });
  snapshot.current = state;
  callbacks.current = { onSignedIn, onSignedOut };

  const saveLocalState = useCallback(async (value, session) => {
    const accountId = sessionAccountId(session);
    if (!accountId || value?.profile?.id !== accountId) {
      throw new Error('Saved data belongs to a different account.');
    }
    const saved = stateForPersistence(value);
    await deviceStore().saveState(accountId, JSON.stringify(saved));
    return saved;
  }, []);

  const saveLocalActiveState = useCallback(async (value, expectedSession) => {
    if (!expectedSession) {
      throw new Error('Sign in before saving your account data.');
    }
    if (activeSession.current !== expectedSession) {
      return null;
    }
    const saved = await saveLocalState(value, expectedSession);
    if (activeSession.current !== expectedSession) {
      return null;
    }
    return saved;
  }, [saveLocalState]);

  const queueCloudSave = useCallback((value, expectedSession) => {
    if (
      expectedSession?.kind !== 'firebase' ||
      value?.profile?.id !== expectedSession.uid ||
      activeSession.current?.kind !== 'firebase' ||
      activeSession.current.uid !== expectedSession.uid
    ) {
      return Promise.resolve(false);
    }

    const uid = expectedSession.uid;
    setPendingCloudUid(uid);
    let queue = cloudWrites.current.get(uid);
    if (!queue) {
      queue = { pendingState: null, task: null };
      cloudWrites.current.set(uid, queue);
    }
    queue.pendingState = value;
    if (queue.task) {
      return queue.task;
    }

    const task = (async () => {
      let highestAcknowledgedUpdatedAt = Number.NEGATIVE_INFINITY;
      while (
        queue.pendingState &&
        activeSession.current?.kind === 'firebase' &&
        activeSession.current.uid === uid
      ) {
        const nextState = queue.pendingState;
        queue.pendingState = null;
        try {
          await saveCloudState(uid, nextState);
          const updatedAt = Number(nextState.updatedAt);
          if (Number.isFinite(updatedAt)) {
            highestAcknowledgedUpdatedAt = Math.max(
              highestAcknowledgedUpdatedAt,
              updatedAt,
            );
          }
        } catch (error) {
          queue.pendingState = null;
          if (
            activeSession.current?.kind === 'firebase' &&
            activeSession.current.uid === uid
          ) {
            setSaveError(errorText(error));
          }
          setPendingCloudUid(current => current === uid ? null : current);
          return false;
        }
      }

      const saved =
        activeSession.current?.kind === 'firebase' &&
        activeSession.current.uid === uid;
      const currentState = snapshot.current;
      const currentStateWasAcknowledged =
        currentState?.profile?.id === uid &&
        (Number(currentState.updatedAt) || 0) <= highestAcknowledgedUpdatedAt;
      if (saved && currentStateWasAcknowledged) {
        setSaveError('');
      } else {
        queue.pendingState = null;
      }
      setPendingCloudUid(current => current === uid ? null : current);
      return saved;
    })();
    queue.task = task;
    task.then(
      () => {
        if (queue.task !== task) {
          return;
        }
        queue.task = null;
        const currentSession = activeSession.current;
        if (
          queue.pendingState &&
          currentSession?.kind === 'firebase' &&
          currentSession.uid === uid
        ) {
          queueCloudSave(queue.pendingState, currentSession).catch(error => {
            if (
              activeSession.current?.kind === 'firebase' &&
              activeSession.current.uid === uid
            ) {
              setSaveError(errorText(error));
            }
          });
        } else if (!queue.pendingState) {
          cloudWrites.current.delete(uid);
        }
      },
      error => {
        if (queue.task === task) {
          queue.task = null;
          queue.pendingState = null;
          cloudWrites.current.delete(uid);
          if (
            activeSession.current?.kind === 'firebase' &&
            activeSession.current.uid === uid
          ) {
            setSaveError(errorText(error));
          }
          setPendingCloudUid(current => current === uid ? null : current);
        }
      },
    );
    return task;
  }, []);

  const updatedAt = state?.updatedAt;
  const accountId = state?.profile?.id;
  useEffect(() => {
    const value = snapshot.current;
    const expectedSession = activeSession.current;
    if (!value || !expectedSession) {
      return undefined;
    }
    if (expectedSession.kind === 'firebase' && !cloudHydrated.current) {
      return undefined;
    }

    let cancelled = false;
    const task = saveQueue.current.then(
      () => saveLocalActiveState(value, expectedSession),
      () => saveLocalActiveState(value, expectedSession),
    );
    saveQueue.current = task;
    task.then(saved => {
      if (cancelled || !saved) {
        return;
      }
      if (expectedSession.kind === 'firebase') {
        queueCloudSave(saved, expectedSession).catch(error => {
          if (activeSession.current === expectedSession) {
            setSaveError(errorText(error));
          }
        });
      } else {
        setSaveError('');
      }
    },
      error => {
        if (!cancelled) {
          setSaveError(errorText(error));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [queueCloudSave, saveLocalActiveState, updatedAt, accountId]);

  const enterLocalAccount = useCallback(async value => {
    const storage = deviceStore();
    let account;
    try {
      account = parseAccount(value);
      const saved = await storage.loadState(account.id);
      const next = asState(saved, account);
      activeSession.current = { kind: 'local', id: account.id };
      cloudHydrated.current = true;
      setSessionType('local');
      setEmailVerified(true);
      setEmailVerificationMessage('');
      setSaveError('');
      snapshot.current = next;
      setState(next);
      setRestoring(false);
      callbacks.current.onSignedIn();
    } catch (error) {
      await storage.signOut(account?.id).catch(() => {});
      throw error;
    }
  }, []);

  const enterFirebaseAccount = useCallback(user => {
    setEmailVerified(Boolean(user.emailVerified));
    const pendingRestore = cloudEntries.current.get(user.uid);
    if (pendingRestore?.generation === firebaseRestoreGeneration.current) {
      return pendingRestore.task;
    }

    const generation = ++firebaseRestoreGeneration.current;
    const previousSession = activeSession.current;
    const previousState = snapshot.current;
    const switchingAccounts = Boolean(
      previousSession &&
        (previousSession.kind !== 'firebase' || previousSession.uid !== user.uid),
    );
    if (switchingAccounts) {
      // Hide the previous account as soon as Auth reports a different UID.
      setRestoring(true);
      setSessionType(null);
      setState(null);
      setSaveError('');
    }

    const task = (async () => {
      if (switchingAccounts && previousSession) {
        await saveQueue.current.catch(() => {});
        if (generation !== firebaseRestoreGeneration.current) {
          return;
        }
        if (previousState) {
          try {
            await saveLocalState(previousState, previousSession);
          } catch (error) {
            if (generation === firebaseRestoreGeneration.current) {
              setSaveError(errorText(error));
            }
          }
        }
        if (generation !== firebaseRestoreGeneration.current) {
          return;
        }
        if (activeSession.current === previousSession) {
          activeSession.current = null;
          cloudHydrated.current = false;
          setPendingCloudUid(current =>
            current === sessionAccountId(previousSession) ? null : current,
          );
        }
        snapshot.current = null;
      }

      if (
        activeSession.current?.kind === 'firebase' &&
        activeSession.current.uid === user.uid
      ) {
        setRestoring(false);
        return;
      }

      const account = {
        id: user.uid,
        name: user.displayName || user.name || user.email?.split('@')[0] || 'Student',
        email: user.email || '',
        studentId: user.studentId || '',
      };
      const storage = deviceStore();
      await storage.setActiveUser(user.uid);
      if (generation !== firebaseRestoreGeneration.current) {
        return;
      }
      activeSession.current = { kind: 'firebase', uid: user.uid };
      cloudHydrated.current = false;
      setSessionType('firebase');
      setSaveError('');

      let cached = null;
      try {
        cached = asState(await storage.loadState(user.uid), account);
      } catch (error) {
        if (generation !== firebaseRestoreGeneration.current) {
          return;
        }
        setSaveError(errorText(error));
      }
      if (generation !== firebaseRestoreGeneration.current) {
        return;
      }

      const local = cached || initialState(account);
      snapshot.current = local;
      setState(local);
      setRestoring(false);
      callbacks.current.onSignedIn();

      try {
        const cloudValue = await loadCloudState(user.uid);
        if (
          generation !== firebaseRestoreGeneration.current ||
          activeSession.current?.kind !== 'firebase' ||
          activeSession.current.uid !== user.uid
        ) {
          return;
        }
        const cloud = cloudValue
          ? asState(JSON.stringify(cloudValue), account)
          : null;
        const latestLocal =
          snapshot.current?.profile?.id === user.uid
            ? snapshot.current
            : local;
        const localUpdatedAt = Number(latestLocal.updatedAt) || 0;
        const cloudUpdatedAt = Number(cloud?.updatedAt) || 0;
        const selected = cloud && cloudUpdatedAt > localUpdatedAt ? cloud : latestLocal;

        if (selected !== snapshot.current) {
          snapshot.current = selected;
          setState(selected);
        }
        const saved = stateForPersistence(selected);
        const cloudHasTransientFeed =
          cloud &&
          JSON.stringify(stateForPersistence(cloud)) !== JSON.stringify(cloud);
        await storage.saveState(user.uid, JSON.stringify(saved));
        if (
          generation !== firebaseRestoreGeneration.current ||
          activeSession.current?.kind !== 'firebase' ||
          activeSession.current.uid !== user.uid
        ) {
          return;
        }
        if (!cloud || selected === latestLocal || cloudHasTransientFeed) {
          const currentSession = activeSession.current;
          if (
            currentSession?.kind === 'firebase' &&
            currentSession.uid === user.uid
          ) {
            queueCloudSave(saved, currentSession).catch(error => {
              if (activeSession.current === currentSession) {
                setSaveError(errorText(error));
              }
            });
          }
        }
        if (activeSession.current?.uid === user.uid) {
          setSaveError('');
        }
      } catch (error) {
        if (
          generation === firebaseRestoreGeneration.current &&
          activeSession.current?.kind === 'firebase' &&
          activeSession.current.uid === user.uid
        ) {
          setSaveError(errorText(error));
        }
      } finally {
        if (
          generation === firebaseRestoreGeneration.current &&
          activeSession.current?.kind === 'firebase' &&
          activeSession.current.uid === user.uid
        ) {
          cloudHydrated.current = true;
          const latest = snapshot.current;
          if (latest?.profile?.id === user.uid) {
            const hydratedState = { ...latest };
            snapshot.current = hydratedState;
            setState(hydratedState);
          }
        }
      }
    })();

    const restoreEntry = { generation, task };
    cloudEntries.current.set(user.uid, restoreEntry);
    const clearRestoreEntry = () => {
      if (cloudEntries.current.get(user.uid) === restoreEntry) {
        cloudEntries.current.delete(user.uid);
      }
    };
    task.then(clearRestoreEntry, clearRestoreEntry);
    return task;
  }, [queueCloudSave, saveLocalState]);

  useEffect(() => {
    if (!firebaseEnabled) {
      setRestoring(false);
      return undefined;
    }

    return watchFirebaseUser(
      user => {
        if (user) {
          setEmailVerified(Boolean(user.emailVerified));
          enterFirebaseAccount(user).catch(async error => {
            setRestoring(false);
            setSaveError(errorText(error));
            try {
              await firebaseSignOut();
            } catch {
              // Keep the readable account-loading error visible.
            }
          });
          return;
        }

        firebaseRestoreGeneration.current += 1;
        cloudEntries.current.clear();
        setRestoring(false);
        if (activeSession.current?.kind === 'firebase') {
          activeSession.current = null;
          cloudHydrated.current = false;
          setSessionType(null);
          setEmailVerified(true);
          setEmailVerificationMessage('');
          setState(null);
          setSaveError('');
          if (!firebaseSignOutInProgress.current) {
            callbacks.current.onSignedOut();
          }
        }
      },
      error => {
        // Keep a restore for the last reported Firebase user alive. Aborting
        // it here would leave cloudHydrated false and disable local autosave.
        // If no account has been reported or is restoring, stop the loading screen.
        if (!activeSession.current && cloudEntries.current.size === 0) {
          setRestoring(false);
        }
        setSaveError(errorText(error));
      },
    );
  }, [enterFirebaseAccount]);

  const auth = {
    firebaseConfigured: firebaseEnabled,
    googleSignInAvailable:
      typeof firebaseGoogleSignInAvailable === 'function'
        ? firebaseGoogleSignInAvailable()
        : false,
    signInWithGoogle: async () => {
      if (typeof firebaseGoogleSignIn !== 'function') {
        throw new Error('Google sign-in is not available in this build.');
      }
      const account = await firebaseGoogleSignIn();
      if (!account) {
        return false;
      }
      setEmailVerified(Boolean(account.emailVerified));
      setEmailVerificationMessage(
        account.emailVerified
          ? ''
          : 'Verify your email address to access shared study groups.',
      );
      await enterFirebaseAccount({
        ...account,
        uid: account.id,
      });
      return true;
    },
    signIn: async (identifier, password) => {
      if (firebaseEnabled) {
        const account = await firebaseSignIn(identifier, password);
        setEmailVerified(Boolean(account.emailVerified));
        setEmailVerificationMessage(
          account.emailVerified
            ? ''
            : 'Verify your email address to access shared study groups.',
        );
        await enterFirebaseAccount({
          ...account,
          uid: account.id,
        });
        return;
      }
      await enterLocalAccount(await deviceStore().signIn(identifier, password));
    },
    signInLocal: async (identifier, password) =>
      enterLocalAccount(await deviceStore().signIn(identifier, password)),
    signUp: async (name, email, studentId, password) => {
      if (firebaseEnabled) {
        const account = await firebaseSignUp(name, email, studentId, password);
        setEmailVerified(Boolean(account.emailVerified));
        const messages = [
          account.verificationEmailSent
            ? `Verification email sent to ${account.email}. Check your inbox and spam folder.`
            : account.verificationEmailError ||
                'Your account was created, but the verification email could not be sent. Try resending it from this screen.',
        ];
        if (account.displayNameSaved === false) {
          messages.push(
            'Your account was created, but its sign-in name could not be saved. The name you entered is still in your app profile.',
          );
        }
        setEmailVerificationMessage(messages.join(' '));
        await enterFirebaseAccount({
          ...account,
          uid: account.id,
        });
        return;
      }
      await enterLocalAccount(
        await deviceStore().signUp(name, email, studentId, password),
      );
    },
    biometrics: async () =>
      enterLocalAccount(await deviceStore().biometricSignIn()),
    enableBiometrics: () => deviceStore().enableBiometrics(),
    sendPasswordReset: firebasePasswordReset,
    resendEmailVerification: async () => {
      try {
        await firebaseResendVerificationEmail();
        const email = snapshot.current?.profile?.email;
        setEmailVerificationMessage(
          `Verification email sent${email ? ` to ${email}` : ''}. Check your inbox and spam folder.`,
        );
      } catch (error) {
        setEmailVerificationMessage(errorText(error));
      }
    },
    refreshEmailVerification: async () => {
      try {
        const account = await firebaseCheckEmailVerification();
        setEmailVerified(Boolean(account.emailVerified));
        setEmailVerificationMessage(
          account.emailVerified
            ? ''
            : 'The email is not verified yet. Open the link from your email, then check again.',
        );
      } catch (error) {
        setEmailVerificationMessage(errorText(error));
      }
    },
  };

  const dispatch = useCallback(action => {
    setState(previous => {
      if (!previous) {
        return previous;
      }
      const updated = reducer(previous, action);
      if (updated === previous) {
        return previous;
      }
      if (action.type === 'sharedGroups') {
        snapshot.current = updated;
        return updated;
      }
      const previousUpdatedAt = Number(previous.updatedAt) || 0;
      const next = {
        ...updated,
        updatedAt: Math.max(Date.now(), previousUpdatedAt + 1),
      };
      snapshot.current = next;
      return next;
    });
  }, []);

  async function signOut() {
    const active = activeSession.current;
    let cloudSaved = true;
    try {
      if (snapshot.current && active) {
        await saveQueue.current.catch(() => {});
        const saved = await saveLocalState(snapshot.current, active);
        if (active.kind === 'firebase') {
          cloudSaved = await waitForCloudWrite(
            queueCloudSave(saved, active),
            SIGN_OUT_CLOUD_SYNC_TIMEOUT_MS,
          );
        }
      }
      if (active?.kind === 'firebase') {
        firebaseSignOutInProgress.current = true;
        try {
          await firebaseSignOut();
        } catch (error) {
          firebaseSignOutInProgress.current = false;
          throw error;
        }
      }
      try {
        if (active) {
          await deviceStore().signOut(sessionAccountId(active));
        }
      } catch (error) {
        if (active?.kind !== 'firebase') {
          throw error;
        }
      }
      activeSession.current = null;
      cloudHydrated.current = false;
      setSessionType(null);
      setEmailVerified(true);
      setEmailVerificationMessage('');
      setState(null);
      setSaveError('');
      setRestoring(false);
      callbacks.current.onSignedOut();
      return { signedOut: true, cloudSaved };
    } catch (error) {
      setSaveError(errorText(error));
      return { signedOut: false, cloudSaved: false };
    } finally {
      firebaseSignOutInProgress.current = false;
    }
  }

  function retrySave() {
    const expectedSession = activeSession.current;
    if (snapshot.current && expectedSession) {
      const value = snapshot.current;
      const task = saveQueue.current.then(
        () => saveLocalActiveState(value, expectedSession),
        () => saveLocalActiveState(value, expectedSession),
      );
      saveQueue.current = task;
      task.then(
        saved => {
          if (!saved) {
            return;
          }
          if (expectedSession.kind === 'firebase') {
            queueCloudSave(saved, expectedSession).catch(error => {
              if (activeSession.current === expectedSession) {
                setSaveError(errorText(error));
              }
            });
          } else {
            setSaveError('');
          }
        },
        error => setSaveError(errorText(error)),
      );
    }
  }

  return {
    state,
    saveError,
    cloudSyncPending: Boolean(
      sessionType === 'firebase' &&
      state?.profile?.id &&
      pendingCloudUid === state.profile.id
    ),
    auth,
    dispatch,
    signOut,
    retrySave,
    restoring,
    sessionType,
    emailVerified,
    emailVerificationMessage,
  };
}
