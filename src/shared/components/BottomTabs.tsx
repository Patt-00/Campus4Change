import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../theme/colors';
import { s } from '../theme/styles';
import type { Navigate, Page } from '../../navigation/types';

const tabs: { page: Page; label: string; icon: string }[] = [
  { page: 'Home', label: 'Home', icon: 'H' },
  { page: 'Sessions', label: 'History', icon: '⌂' },
  { page: 'Create', label: 'Create', icon: '+' },
  { page: 'Messages', label: 'Messages', icon: 'M' },
  { page: 'Profile', label: 'Profile', icon: 'P' },
];
export function BottomTabs({
  go,
  active = 'Home',
}: {
  go: Navigate;
  active?: Page;
}) {
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
          <Text style={[styles.icon, t.page === active && s.blue]}>
            {t.icon}
          </Text>
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
    height: 64,
    backgroundColor: '#0a1821',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  tab: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  active: { backgroundColor: C.chip },
  icon: { fontFamily: 'Inter-Bold', fontSize: 18, color: C.muted },
  label: { fontFamily: 'Inter-Medium', fontSize: 9, color: C.muted },
});
