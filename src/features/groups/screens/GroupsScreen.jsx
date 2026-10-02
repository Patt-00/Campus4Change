import React, { useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Field } from '../../../shared/components/UI';

import { IconBadge } from '../../../shared/components/Icon';
import { s } from '../../../shared/theme/styles';

export function GroupsScreen({ go, back, groups }) {
  const [query, setQuery] = useState('');
  const filtered = groups.filter(g =>
    (g.name + ' ' + g.subject)
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  function cards(list) {
    return list.map(g => (
      <TouchableOpacity
        key={g.id}
        accessibilityRole="button"
        accessibilityLabel={'Open ' + g.name}
        style={[s.card, s.row, styles.minHeight104]}
        onPress={() =>
          go({
            page: 'Group Details',
            groupId: g.id,
          })
        }
      >
        <IconBadge name="users" />
        <View style={s.grow}>
          <Text style={s.name}>{g.name}</Text>
          <Text style={s.muted}>
            {g.members} {g.members === 1 ? 'member' : 'members'} •{' '}
            {g.joined ? 'Joined' : 'Not joined'}
          </Text>
          <Text style={[s.link, styles.marginTop8]}>Open group</Text>
        </View>
      </TouchableOpacity>
    ));
  }
  return (
    <Screen title="Study Groups" back={back} go={go} tab="Home">
      <AppButton title="+ CREATE GROUP" onPress={() => go('Create Group')} />
      <View style={s.gap} />
      <Field
        placeholder="Search study groups"
        value={query}
        onChangeText={setQuery}
      />

      <Text style={[s.section, styles.marginTop8]}>Your groups</Text>
      {cards(filtered.filter(g => g.joined))}
      {!filtered.some(g => g.joined) && (
        <Text style={s.muted}>Join a group or create your own.</Text>
      )}
      <Text style={s.section}>Discover</Text>
      {cards(filtered.filter(g => !g.joined))}
      {!filtered.some(g => !g.joined) && (
        <Text style={s.muted}>
          {groups.length
            ? 'No more groups match this search.'
            : 'Create your first group to organize study notes.'}
        </Text>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  minHeight104: {
    minHeight: 104,
  },
  marginTop8: {
    marginTop: 8,
  },
});
