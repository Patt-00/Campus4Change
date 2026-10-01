import { NativeModules, Platform } from 'react-native';
import type { Account, CampusState } from '../data/types';

type DeviceStore = {
  signIn(identifier: string, password: string): Promise<string>;
  signUp(
    name: string,
    email: string,
    studentId: string,
    password: string,
  ): Promise<string>;
  biometricSignIn(): Promise<string>;
  enableBiometrics(): Promise<boolean>;
  loadState(): Promise<string | null>;
  saveState(state: string): Promise<boolean>;
  signOut(): Promise<boolean>;
};
export function deviceStore(): DeviceStore {
  if (Platform.OS !== 'android' || !NativeModules.CampusStorage) {
    throw new Error('Local accounts are supported in the Android app.');
  }
  return NativeModules.CampusStorage as DeviceStore;
}
export function parseAccount(value: string): Account {
  return JSON.parse(value) as Account;
}
export function parseState(value: string): CampusState {
  const state = JSON.parse(value) as CampusState;
  if (
    state.version !== 1 ||
    !state.profile?.id ||
    !Array.isArray(state.sessions) ||
    !Array.isArray(state.groups) ||
    !Array.isArray(state.conversations) ||
    !Array.isArray(state.notices)
  ) {
    throw new Error('Saved data is not compatible with this app version.');
  }
  return state;
}
