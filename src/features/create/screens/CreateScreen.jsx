import React from 'react';
import { Text } from 'react-native';

import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { s } from '../../../shared/theme/styles';

export function CreateScreen({ go }) {
  return (
    <Screen title="Create" go={go} tab="Create">
      <Text style={s.section}>Make learning happen</Text>
      <AppButton title="BOOK A SESSION" onPress={() => go('Tutor Search')} />
      <AppButton
        title="CREATE STUDY GROUP"
        onPress={() => go('Create Group')}
      />

      <AppButton title="BE A TUTOR" outline onPress={() => go('Be a Tutor')} />
    </Screen>
  );
}
