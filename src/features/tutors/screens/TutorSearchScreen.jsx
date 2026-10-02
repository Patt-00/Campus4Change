import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import {
  Avatar,
  Chip,
  Empty,
  Field,
  Link,
} from '../../../shared/components/UI';

import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

import { filterTutors } from '../data/search';

export function TutorSearchScreen({ go, back, list, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [subject, setSubject] = useState('');
  const [showSubjects, setShowSubjects] = useState(false);
  const [available, setAvailable] = useState(false);
  const [top, setTop] = useState(false);
  const subjects = [...new Set(list.flatMap(t => t.subjects))].sort();
  const results = filterTutors(list, query, subject, available, top);
  const filtered = !!query.trim() || !!subject || available || top;
  return (
    <Screen title="Find a Tutor" back={back} go={go} tab="Home">
      <Field
        icon="search"
        placeholder="Search subject or tutor"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
      />

      {!!list.length && (
        <View style={s.wrap}>
          <Chip
            label={subject || 'Subjects'}
            selected={showSubjects || !!subject}
            onPress={() => setShowSubjects(!showSubjects)}
          />

          <Chip
            label="Taking requests"
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
      )}
      {showSubjects && (
        <View style={[s.wrap, styles.space]}>
          <Chip
            label="All subjects"
            selected={!subject}
            onPress={() => setSubject('')}
          />

          {subjects.map(x => (
            <Chip
              key={x}
              label={x}
              selected={subject === x}
              onPress={() => setSubject(subject === x ? '' : x)}
            />
          ))}
        </View>
      )}
      {filtered && (
        <Link
          label="Clear filters"
          onPress={() => {
            setQuery('');
            setSubject('');
            setAvailable(false);
            setTop(false);
          }}
        />
      )}
      <Text style={s.section}>Tutor directory · {results.length}</Text>
      {results.map(t => (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t.name + ', view profile'}
          key={t.id}
          style={s.card}
          onPress={() => go({ page: 'Tutor Details', tutorId: t.id })}
        >
          <View style={s.row}>
            <Avatar name={t.name} size={44} />
            <View style={s.grow}>
              <Text style={s.name}>{t.name}</Text>
              <Text style={s.muted}>{t.subjects.join(' · ')}</Text>
              {t.sample && (
                <Text style={s.star}>★ {t.rating} · Sample tutor</Text>
              )}
              {t.own && <Text style={[s.muted, s.blue]}>Your listing</Text>}
            </View>
          </View>
          <Text style={[s.link, styles.profile]}>View profile</Text>
        </TouchableOpacity>
      ))}
      {!results.length && (
        <Empty
          title={list.length ? 'No tutors found' : 'Your directory is empty'}
          body={
            list.length
              ? 'Try another subject or clear the filters.'
              : 'Your tutor profile will appear here. The demo account contains sample tutors.'
          }
        />
      )}
      {!list.length && (
        <>
          <Link label="Create tutor profile" onPress={() => go('Be a Tutor')} />
          <Link label="About the tutor directory" onPress={() => go('About')} />
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  space: { marginTop: 14 },
  profile: { textAlign: 'right', marginTop: 12 },
});
