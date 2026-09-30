import React from 'react';
import {Text, TextInput, View} from 'react-native';
import {AppButton} from '../../../shared/components/AppButton';
import {AppHeader} from '../../../shared/components/AppHeader';
import {BottomTabs} from '../../../shared/components/BottomTabs';
import {StatusBarSafeArea} from '../../../shared/components/StatusBarSafeArea';
import {C} from '../../../shared/theme/colors';
import {s} from '../../../shared/theme/styles';
import type {Navigate} from '../../../navigation/types';

export function HomeScreen({go}: {go: Navigate}) {
  return (
    <StatusBarSafeArea style={s.safe}>
      <AppHeader title="Campus4Change" logged onHome={() => go('Home')} />
      <View style={s.pad}>
        <Text style={s.greeting}>Hello, Alex!</Text>
        <Text style={s.muted}>What would you like to learn or teach today?</Text>
        <TextInput
          style={s.input}
          placeholder="Search subjects, skills, or tutors..."
          placeholderTextColor={C.muted}
        />
        <View style={s.card}>
          <Text style={s.muted}>YOUR NEXT MATCH AWAITS</Text>
          <Text style={s.match}>Need help in Calculus I?</Text>
          <AppButton title="VIEW MATCHES" onPress={() => go('Tutor Search')} />
        </View>
        <Text style={s.section}>Quick Actions</Text>
        <AppButton title="FIND A TUTOR" onPress={() => go('Tutor Search')} />
      </View>
      <BottomTabs go={go} />
    </StatusBarSafeArea>
  );
}
