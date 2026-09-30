import React from 'react';
import {Text, TextInput, View} from 'react-native';
import {AppButton} from '../../../shared/components/AppButton';
import {AppHeader} from '../../../shared/components/AppHeader';
import {StatusBarSafeArea} from '../../../shared/components/StatusBarSafeArea';
import {C} from '../../../shared/theme/colors';
import {s} from '../../../shared/theme/styles';

export function LoginScreen({onAuth}: {onAuth: () => void}) {
  return (
    <StatusBarSafeArea style={s.safe}>
      <AppHeader title="Welcome back!" logged={false} onHome={() => {}} />
      <View style={s.pad}>
        <Text style={s.muted}>Sign in to continue</Text>
        <Text style={s.label}>Email or Student ID</Text>
        <TextInput
          style={s.input}
          placeholder="Enter your email or student ID"
          placeholderTextColor={C.muted}
        />
        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          secureTextEntry
          placeholder="Enter your password"
          placeholderTextColor={C.muted}
        />
        <AppButton title="SIGN IN" onPress={onAuth} />
        <AppButton title="CREATE ACCOUNT" onPress={onAuth} />
      </View>
    </StatusBarSafeArea>
  );
}
