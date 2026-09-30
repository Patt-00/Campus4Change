import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {s} from '../theme/styles';
import type {Navigate, Page} from '../types/navigation';

const tabPages: Page[] = [
  'Home',
  'Tutor Search',
  'Sessions',
  'Messages',
  'Profile',
];

export function BottomTabs({go}: {go: Navigate}) {
  return (
    <View style={s.tabs}>
      {tabPages.map(page => (
        <TouchableOpacity key={page} style={s.tab} onPress={() => go(page)}>
          <Text style={s.tabText}>{page}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
