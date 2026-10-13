import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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

export function TutorSearchScreen({
  go,
  back,
  list,
  initialQuery = '',
  sharedAccount = false,
  emailVerified = true,
  loading = false,
  error = '',
  retry,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [subject, setSubject] = useState('');
  const [showSubjects, setShowSubjects] = useState(false);
  const [available, setAvailable] = useState(false);
  const [top, setTop] = useState(false);
  const subjectsByKey = new Map();
  list.flatMap(tutor => tutor.subjects).forEach(value => {
    const normalizedSubject = value.trim().replace(/\s+/g, ' ');
    const key = normalizedSubject.toLowerCase();
    if (normalizedSubject && !subjectsByKey.has(key)) {
      subjectsByKey.set(key, normalizedSubject);
    }
  });
  const subjects = [...subjectsByKey.values()].sort((a, b) =>
    a.localeCompare(b),
  );
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

          {!sharedAccount && (
            <Chip
              label="Top rated"
              color={C.yellow}
              selected={top}
              onPress={() => setTop(!top)}
            />
          )}
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
      <Text style={s.section}>
        {sharedAccount ? 'Student tutors' : 'Tutor directory'} · {results.length}
      </Text>
      {results.map(t => {
        const rating =
          Number.isFinite(t.rating) && t.rating > 0
            ? `Rating ${t.rating.toFixed(1)} stars`
            : 'No rating yet';
        const listing = t.own
          ? 'Your listing'
          : t.sample
            ? 'Sample tutor'
            : 'Student tutor';
        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${t.name}. Subjects: ${t.subjects.join(', ')}. ${rating}. ${listing}. View profile.`}
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
        );
      })}
      {!results.length && (
        loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={C.cyan} />
            <Text style={s.muted}>Loading tutor listings…</Text>
          </View>
        ) : (
          <Empty
            title={
              list.length
                ? 'No tutors found'
                : sharedAccount
                  ? emailVerified
                    ? 'No student tutors yet'
                    : 'Verify your email to browse tutors'
                  : 'Your directory is empty'
            }
            body={
              list.length
                ? 'Try another subject or clear the filters.'
                : sharedAccount
                  ? emailVerified
                    ? 'Publish a tutor profile to help classmates find you, or check back later.'
                    : 'Student tutor listings are available after your Firebase email is verified.'
                  : 'Your personal tutor listing is stored on this device. The demo account includes sample tutors.'
            }
          />
        )
      )}
      {!!error && retry && (
        <Link label="Retry tutor directory" onPress={retry} />
      )}
      {!list.length && (
        <>
          {(!sharedAccount || emailVerified) && (
            <Link
              label="Create tutor profile"
              onPress={() => go('Be a Tutor')}
            />
          )}
          <Link label="About the tutor directory" onPress={() => go('About')} />
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  space: { marginTop: 14 },
  profile: { textAlign: 'right', marginTop: 12 },
  loading: { alignItems: 'center', gap: 12, paddingVertical: 28 },
});
