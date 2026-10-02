import { NativeModules, Platform } from 'react-native';

export function deviceStore() {
  if (Platform.OS !== 'android' || !NativeModules.CampusStorage) {
    throw new Error('Local accounts are supported in the Android app.');
  }
  return NativeModules.CampusStorage;
}
export function parseAccount(value) {
  return JSON.parse(value);
}
export function parseState(value) {
  const state = JSON.parse(value);
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
