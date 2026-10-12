import { useCallback, useEffect, useRef, useState } from 'react';
import { initialState } from '../data/demo';
import {
  firebaseEnabled,
  firebaseCheckEmailVerification,
  firebasePasswordReset,
  firebaseResendVerificationEmail,
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

function isDemoAccount(identifier) {
  const value = identifier.trim().toLowerCase();
  return value === 'alex@campus.demo' || value === 'demo';
}

function asState(value, account) {
  if (!value) {
    return initialState(account);
  }
  const state = parseState(value);
  if (state.profile.id !== account.id) {
    throw new Error('Saved data belongs to a different account.');
  }
  return state;
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useCampusSession({ onSignedIn, onSignedOut }) {
  const [state, setState] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [restoring, setRestoring] = useState(firebaseEnabled);
  const [sessionType, setSessionType] = useState(null);
  const [emailVerified, setEmailVerified] = useState(true);
  const [emailVerificationMessage, setEmailVerificationMessage] = useState('');
  const snapshot = useRef(state);
  const activeSession = useRef(null);
  const cloudHydrated = useRef(false);
  const firebaseSignOutInProgress = useRef(false);
  const cloudEntries = useRef(new Map());
  const saveQueue = useRef(Promise.resolve());
  const callbacks = useRef({ onSignedIn, onSignedOut });
  snapshot.current = state;
  callbacks.current = { onSignedIn, onSignedOut };

  const saveLocalState = useCallback(async value => {
    const saved = stateForPersistence(value);
    await deviceStore().saveState(JSON.stringify(saved));
    return saved;
  }, []);

  const saveActiveState = useCallback(async value => {
    const active = activeSession.current;
    if (!active) {
      throw new Error('Sign in before saving your account data.');
    }
    const saved = await saveLocalState(value);
    if (active.kind === 'firebase') {
      await saveCloudState(active.uid, saved);
    }
  }, [saveLocalState]);

  const updatedAt = state?.updatedAt;
  useEffect(() => {
    const value = snapshot.current;
    if (!value || !activeSession.current) {
      return undefined;
    }
    if (activeSession.current.kind === 'firebase' && !cloudHydrated.current) {
      return undefined;
    }

    let cancelled = false;
    const task = saveQueue.current.then(
      () => saveActiveState(value),
      () => saveActiveState(value),
    );
    saveQueue.current = task;
    task.then(
      () => {
        if (!cancelled) {
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
  }, [saveActiveState, updatedAt]);

  const enterLocalAccount = useCallback(async value => {
    const storage = deviceStore();
    try {
      const account = parseAccount(value);
      const saved = await storage.loadState();
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
      await storage.signOut();
      throw error;
    }
  }, []);

  const enterFirebaseAccount = useCallback(user => {
    setEmailVerified(Boolean(user.emailVerified));
    if (cloudEntries.current.has(user.uid)) {
      return cloudEntries.current.get(user.uid);
    }

    const task = (async () => {
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
      activeSession.current = { kind: 'firebase', uid: user.uid };
      cloudHydrated.current = false;
      setSessionType('firebase');
      setSaveError('');

      let cached = null;
      try {
        cached = asState(await storage.loadState(), account);
      } catch (error) {
        setSaveError(errorText(error));
      }

      const local = cached || initialState(account);
      snapshot.current = local;
      setState(local);
      setRestoring(false);
      callbacks.current.onSignedIn();

      try {
        const cloudValue = await loadCloudState(user.uid);
        if (activeSession.current?.uid !== user.uid) {
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
        await storage.saveState(JSON.stringify(saved));
        if (!cloud || selected === latestLocal || cloudHasTransientFeed) {
          await saveCloudState(user.uid, saved);
        }
        if (activeSession.current?.uid === user.uid) {
          setSaveError('');
        }
      } catch (error) {
        if (activeSession.current?.uid === user.uid) {
          setSaveError(errorText(error));
        }
      } finally {
        if (activeSession.current?.uid === user.uid) {
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

    cloudEntries.current.set(user.uid, task);
    task.then(
      () => cloudEntries.current.delete(user.uid),
      () => cloudEntries.current.delete(user.uid),
    );
    return task;
  }, []);

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
        setRestoring(false);
        setSaveError(errorText(error));
      },
    );
  }, [enterFirebaseAccount]);

  const auth = {
    firebaseConfigured: firebaseEnabled,
    signIn: async (identifier, password) => {
      if (firebaseEnabled && !isDemoAccount(identifier)) {
        const account = await firebaseSignIn(identifier, password);
        setEmailVerified(Boolean(account.emailVerified));
        setEmailVerificationMessage(
          account.emailVerified
            ? ''
            : 'Verify your school email to access shared study groups.',
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
        setEmailVerificationMessage(
          account.verificationEmailSent
            ? `Verification email sent to ${account.email}. Check your inbox and spam folder.`
            : account.verificationEmailError ||
                'Your account was created, but the verification email could not be sent. Try resending it from this screen.',
        );
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
        const saved = await saveLocalState(snapshot.current);
        if (active.kind === 'firebase') {
          try {
            await saveCloudState(active.uid, saved);
          } catch {
            cloudSaved = false;
          }
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
        await deviceStore().signOut();
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
    if (snapshot.current) {
      const value = snapshot.current;
      const task = saveQueue.current.then(
        () => saveActiveState(value),
        () => saveActiveState(value),
      );
      saveQueue.current = task;
      task.then(() => setSaveError('')).catch(error => setSaveError(errorText(error)));
    }
  }

  return {
    state,
    saveError,
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
