import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { IconBadge } from '../../../shared/components/Icon';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

const actions = [
  {
    title: 'Book a session',
    accessibilityLabel: 'BOOK A SESSION',
    description: 'Find a student tutor and request a time.',
    page: 'Tutor Search',
    icon: 'calendar',
    color: C.cyan,
  },
  {
    title: 'Create a study group',
    accessibilityLabel: 'CREATE STUDY GROUP',
    description: 'Bring classmates together around a subject.',
    page: 'Create Group',
    icon: 'users',
    color: C.green,
  },
  {
    title: 'Become a tutor',
    accessibilityLabel: 'BE A TUTOR',
    description: 'Share the subjects and skills you can teach.',
    page: 'Be a Tutor',
    icon: 'graduation',
    color: C.purple,
  },
];

export function CreateScreen({ go }) {
  return (
    <Screen title="Create" go={go} tab="Create">
      <Text style={s.section}>What would you like to do?</Text>
      <Text style={[s.muted, styles.intro]}>
        Choose a next step for learning or sharing what you know.
      </Text>
      {actions.map(action => (
        <TouchableOpacity
          key={action.page}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel}
          accessibilityHint={action.description}
          onPress={() => go(action.page)}
          style={[s.card, s.row, styles.actionCard]}
        >
          <IconBadge name={action.icon} color={action.color} size={44} />
          <View style={s.grow}>
            <Text style={s.name}>{action.title}</Text>
            <Text style={s.muted}>{action.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 18 },
  actionCard: {
    minHeight: 88,
    alignItems: 'center',
    paddingVertical: 14,
  },
});
