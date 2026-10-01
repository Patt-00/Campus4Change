import { useEffect, useRef, useState } from 'react';
import { initialState } from '../data/demo';
import type { CampusState } from '../data/types';
import { reducer, type Action } from './reducer';
import { deviceStore, parseAccount, parseState } from './storage';

type SessionCallbacks = {
  onSignedIn: () => void;
  onSignedOut: () => void;
};

export function useCampusSession({
  onSignedIn,
  onSignedOut,
}: SessionCallbacks) {
  const [state, setState] = useState<CampusState | null>(null);
  const [saveError, setSaveError] = useState('');
  const snapshot = useRef(state);
  snapshot.current = state;

  useEffect(() => {
    if (!state) {
      return;
    }
    let cancelled = false;
    deviceStore()
      .saveState(JSON.stringify(state))
      .then(() => {
        if (!cancelled) {
          setSaveError('');
        }
      })
      .catch(e => {
        if (!cancelled) {
          setSaveError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  async function enter(value: string) {
    try {
      const account = parseAccount(value);
      const saved = await deviceStore().loadState();
      const next = saved ? parseState(saved) : initialState(account);
      if (next.profile.id !== account.id) {
        throw new Error('Saved data belongs to a different account.');
      }
      setSaveError('');
      setState(next);
      onSignedIn();
    } catch (e) {
      await deviceStore().signOut();
      throw e;
    }
  }

  const auth = {
    signIn: async (id: string, password: string) =>
      enter(await deviceStore().signIn(id, password)),
    signUp: async (
      name: string,
      email: string,
      studentId: string,
      password: string,
    ) => enter(await deviceStore().signUp(name, email, studentId, password)),
    biometrics: async () => enter(await deviceStore().biometricSignIn()),
  };

  function dispatch(action: Action) {
    setState(prev => (prev ? reducer(prev, action) : prev));
  }

  async function signOut() {
    try {
      if (snapshot.current) {
        await deviceStore().saveState(JSON.stringify(snapshot.current));
      }
      await deviceStore().signOut();
      setState(null);
      setSaveError('');
      onSignedOut();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  }

  function retrySave() {
    if (snapshot.current) {
      deviceStore()
        .saveState(JSON.stringify(snapshot.current))
        .then(() => setSaveError(''))
        .catch(e => setSaveError(String(e)));
    }
  }

  return { state, saveError, auth, dispatch, signOut, retrySave };
}
