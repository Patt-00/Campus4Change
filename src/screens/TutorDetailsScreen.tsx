import React from 'react';
import {Text, View} from 'react-native';
import {AppButton} from '../components/AppButton';
import {AppHeader} from '../components/AppHeader';
import {StatusBarSafeArea} from '../components/StatusBarSafeArea';
import {tutorNames} from '../data/demo';
import {s} from '../theme/styles';
import type {Navigate} from '../types/navigation';

export function TutorDetailsScreen({go}: {go: Navigate}) {
  return (
    <StatusBarSafeArea style={s.safe}>
      <AppHeader title="Tutor Profile" logged onHome={() => go('Home')} />
      <View style={s.pad}>
        <View style={s.bigAvatar}>
          <Text>J</Text>
        </View>
        <Text style={s.profile}>{tutorNames[0]}</Text>
        <Text style={s.muted}>BS Computer Science • 3rd Year</Text>
        <Text style={s.star}>★ 4.9 • 36 sessions • 98% response</Text>
        <Text style={s.section}>Subjects</Text>
        <Text style={s.chip}>Calculus I   Algebra   Programming</Text>
        <Text style={s.section}>About</Text>
        <Text style={s.muted}>
          I explain concepts using simple examples and step-by-step problem
          solving.
        </Text>
        <View style={s.spacer} />
        <AppButton title="BOOK SESSION" onPress={() => go('Sessions')} />
        <AppButton title="MESSAGE TUTOR" onPress={() => go('Messages')} />
      </View>
    </StatusBarSafeArea>
  );
}
