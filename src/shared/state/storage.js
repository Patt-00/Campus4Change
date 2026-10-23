import { NativeModules, Platform } from 'react-native';
import { isAccountUuid } from '../data/utils';

export function deviceStore() {
  if (Platform.OS !== 'android' || !NativeModules.CampusStorage) {
    throw new Error('Local accounts are supported in the Android app.');
  }
  return NativeModules.CampusStorage;
}

export function hasCompletedIntroduction() {
  return deviceStore().hasCompletedIntroduction();
}

export function markIntroductionCompleted() {
  return deviceStore().markIntroductionCompleted();
}

export function discardProfilePhotoDraft(expectedUserId) {
  return deviceStore().discardProfilePhotoDraft(expectedUserId);
}

export function parseAccount(value) {
  const account = JSON.parse(value);
  const currentAccount = { ...account };
  delete currentAccount.studentId;
  return {
    ...currentAccount,
    accountUuid: isAccountUuid(account.accountUuid)
      ? account.accountUuid
      : isAccountUuid(account.id)
        ? account.id
        : '',
  };
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
  if (!Array.isArray(state.pendingSharedActions)) {
    state.pendingSharedActions = [];
  }
  return state;
}
