import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../theme/colors';
import { s } from '../theme/styles';

import { Icon } from './Icon';

const tabs = [
  { page: 'Home', label: 'Home', icon: 'home' },
  { page: 'Sessions', label: 'Sessions', icon: 'calendar' },
  { page: 'Create', label: 'Create', icon: 'plus' },
  { page: 'Messages', label: 'Messages', icon: 'chat' },
  { page: 'Profile', label: 'Profile', icon: 'user' },
];

export function BottomTabs({ go, active = 'Home' }) {
  return (
    <View style={[s.width, styles.tabs]}>
      {tabs.map(t => (
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityLabel={t.label}
          accessibilityState={{ selected: t.page === active }}
          key={t.page}
          onPress={() => go(t.page)}
          style={[styles.tab, t.page === active && styles.active]}
        >
          <Icon
            name={t.icon}
            color={t.page === active ? C.cyan : C.muted}
            size={22}
          />

          <Text style={[styles.label, t.page === active && s.blue]}>
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  tabs: {
    minHeight: 72,
    backgroundColor: '#0a1821',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  tab: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  active: { backgroundColor: C.chip },
  label: { fontFamily: 'Inter-Medium', fontSize: 11, color: C.muted },
});
