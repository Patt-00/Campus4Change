import React, { useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Chip, Empty, Field } from '../../../shared/components/UI';
import type { Tutor } from '../../../shared/data/types';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';
import type { Navigate } from '../../../navigation/types';
export function filterTutors(
  list: Tutor[],
  query: string,
  calculus: boolean,
  available: boolean,
  top: boolean,
) {
  const q = query.trim().toLowerCase();
  return list
    .filter(
      t =>
        (!q ||
          (t.name + ' ' + t.subjects.join(' ')).toLowerCase().includes(q)) &&
        (!calculus ||
          t.subjects.some(x => x.toLowerCase().includes('calculus'))) &&
        (!available || t.available),
    )
    .sort((a, b) => (top ? b.rating - a.rating : 0));
}
export function TutorSearchScreen({
  go,
  back,
  list,
  initialQuery = '',
}: {
  go: Navigate;
  back: () => void;
  list: Tutor[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [calculus, setCalculus] = useState(false);
  const [available, setAvailable] = useState(false);
  const [top, setTop] = useState(false);
  const results = filterTutors(list, query, calculus, available, top);
  return (
    <Screen title="Find a Tutor" back={back} go={go} tab="Home">
      <Field
        placeholder="Search subject or tutor"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      <View style={s.wrap}>
        <Chip
          label="Calculus"
          selected={calculus}
          onPress={() => setCalculus(!calculus)}
        />
        <Chip
          label="Available now"
          color={C.green}
          selected={available}
          onPress={() => setAvailable(!available)}
        />
        <Chip
          label="Top rated"
          color={C.yellow}
          selected={top}
          onPress={() => setTop(!top)}
        />
      </View>
      <Text style={s.section}>Recommended tutors</Text>
      {results.map(t => (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t.name + ', view profile'}
          key={t.id}
          style={[s.card, styles.minHeight120]}
          onPress={() =>
            go({
              page: 'Tutor Details',
              tutorId: t.id,
            })
          }
        >
          <View style={[s.row, styles.alignItemsflexstart]}>
            <Avatar name={t.name} />
            <View style={s.grow}>
              <Text style={s.name}>{t.name}</Text>
              <Text style={[s.muted, styles.fontSize10]}>
                {t.subjects.slice(0, 2).join(' • ')}
              </Text>
              <Text style={s.star}>★ {t.rating || 'New'}</Text>
            </View>
            <Chip
              label={t.availability}
              color={t.available ? C.green : C.cyan}
            />
          </View>
          <Text style={[s.link, styles.textAlignrightmarginTop6]}>
            View profile
          </Text>
        </TouchableOpacity>
      ))}
      {results.length === 0 && (
        <Empty
          title="No tutors found"
          body="Try another subject or clear the filters."
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  minHeight120: {
    minHeight: 120,
  },
  alignItemsflexstart: {
    alignItems: 'flex-start',
  },
  fontSize10: {
    fontSize: 10,
  },
  textAlignrightmarginTop6: {
    textAlign: 'right',
    marginTop: 6,
    marginRight: 32,
  },
});
