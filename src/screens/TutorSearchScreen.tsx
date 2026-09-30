import React from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import {AppHeader} from '../components/AppHeader';
import {BottomTabs} from '../components/BottomTabs';
import {StatusBarSafeArea} from '../components/StatusBarSafeArea';
import {tutorNames} from '../data/demo';
import {C} from '../theme/colors';
import {s} from '../theme/styles';
import type {Navigate} from '../types/navigation';

export function TutorSearchScreen({go}: {go: Navigate}) {
  return (
    <StatusBarSafeArea style={s.safe}>
      <AppHeader title="Find a Tutor" logged onHome={() => go('Home')} />
      <View style={s.pad}>
        <TextInput
          style={s.input}
          placeholder="Search subject or tutor"
          placeholderTextColor={C.muted}
        />
        <Text style={s.section}>Recommended tutors</Text>
        {tutorNames.map((name, index) => (
          <TouchableOpacity
            key={name}
            style={s.tutor}
            onPress={() => go('Tutor Details')}>
            <View style={s.avatar}>
              <Text>{name[0]}</Text>
            </View>
            <View>
              <Text style={s.name}>{name}</Text>
              <Text style={s.muted}>
                Calculus I • {index === 0 ? 'Algebra' : 'Physics'}
              </Text>
              <Text style={s.star}>★ {4.9 - index / 10}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <BottomTabs go={go} />
    </StatusBarSafeArea>
  );
}
