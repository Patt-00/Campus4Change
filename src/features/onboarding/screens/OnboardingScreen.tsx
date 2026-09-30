import React from 'react';
import {StatusBar, Text, View} from 'react-native';
import {AppButton} from '../../../shared/components/AppButton';
import {StatusBarSafeArea} from '../../../shared/components/StatusBarSafeArea';
import {s} from '../../../shared/theme/styles';
import type {Navigate} from '../../../navigation/types';

export function OnboardingScreen({go}: {go: Navigate}) {
  return (
    <StatusBarSafeArea style={s.safe}>
      <StatusBar barStyle="light-content" />
      <View style={s.onboard}>
        <View style={s.logo}>
          <Text style={s.house}>⌂</Text>
          <Text style={s.c}>C</Text>
        </View>
        <Text style={s.brand}>
          Campus<Text style={s.blue}>4</Text>Change
        </Text>
        <Text style={s.muted}>Learn together. Grow together.</Text>
        <Text style={s.muted}>Change your campus.</Text>
        <View style={s.spacer} />
        <AppButton title="GET STARTED" onPress={() => go('Login')} />
        <Text style={s.footer}>Find help. Share knowledge. Make an impact.</Text>
      </View>
    </StatusBarSafeArea>
  );
}
