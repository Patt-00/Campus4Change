import { useCallback, useEffect, useRef, useState } from 'react';
import { initialState } from '../data/demo';
import {
  firebaseEnabled,
  firebasePasswordReset,
  firebaseSignIn,
  firebaseSignOut,
  firebaseSignUp,
  loadCloudState,
  saveCloudState,
  watchFirebaseUser,
} from '../backend/firebase';
import { reducer } from './reducer';
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
  const snapshot = useRef(state);
  const activeSession = useRef(null);
  const cloudHydrated = useRef(false);
  const firebaseSignOutInProgress = useRef(false);
  const cloudEntries = useRef(new Map());
  const saveQueue = useRef(Promise.resolve());
  const callbacks = useRef({ onSignedIn, onSignedOut });
  snapshot.current = state;
  callbacks.current = { onSignedIn, onSignedOut };

  const saveActiveState = useCallback(async value => {
    const active = activeSession.current;
    if (!active) {
      throw new Error('Sign in before saving your account data.');
    }
    await deviceStore().saveState(JSON.stringify(value));
    if (active.kind === 'firebase') {
      await saveCloudState(active.uid, value);
    }
  }, []);

  useEffect(() => {
    if (!state || !activeSession.current) {
      return undefined;
    }
    if (activeSession.current.kind === 'firebase' && !cloudHydrated.current) {
      return undefined;
    }

    let cancelled = false;
    const value = state;
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
  }, [saveActiveState, state]);

  const enterLocalAccount = useCallback(async value => {
    const storage = deviceStore();
    try {
      const account = parseAccount(value);
      const saved = await storage.loadState();
      const next = asState(saved, account);
      activeSession.current = { kind: 'local', id: account.id };
      cloudHydrated.current = true;
      setSessionType('local');
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
        await storage.saveState(JSON.stringify(selected));
        if (!cloud || selected === latestLocal) {
          await saveCloudState(user.uid, selected);
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
  };

  const dispatch = useCallback(action => {
    setState(previous => {
      if (!previous) {
        return previous;
      }
      const updated = reducer(previous, action);
      const next =
        updated === previous ? previous : { ...updated, updatedAt: Date.now() };
      snapshot.current = next;
      return next;
    });
  }, []);

  async function signOut() {
    try {
      if (snapshot.current && activeSession.current) {
        await saveQueue.current.catch(() => {});
        await saveActiveState(snapshot.current);
      }
      const active = activeSession.current;
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
      setState(null);
      setSaveError('');
      setRestoring(false);
      callbacks.current.onSignedOut();
    } catch (error) {
      setSaveError(errorText(error));
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
  };
}
