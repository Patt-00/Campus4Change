import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
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
  hasMoreTutors = false,
  loadingMoreTutors = false,
  tutorsLive = true,
  loadMoreTutors,
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
        {sharedAccount ? 'Community tutors' : 'Tutor directory'} · {results.length}
        {hasMoreTutors ? ' shown' : ''}
      </Text>
      {results.map(t => {
        const rating =
          Number.isFinite(t.rating) && t.rating > 0
            ? `Rating ${t.rating.toFixed(1)} stars`
            : 'No rating yet';
        const listing = t.own ? 'Your listing' : 'Community tutor';
        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${t.name}. Subjects: ${t.subjects.join(', ')}. ${rating}. ${listing}. View profile.`}
            key={t.id}
            style={s.card}
            onPress={() => go({ page: 'Tutor Details', tutorId: t.id })}
          >
            <View style={s.row}>
              <Avatar
                name={t.name}
                size={44}
                avatarId={t.avatarId}
                photoUri={t.profilePhotoUri}
              />
              <View style={s.grow}>
                <Text style={s.name}>{t.name}</Text>
                <Text style={s.muted}>{t.subjects.join(' · ')}</Text>
                {Number.isFinite(t.rating) && t.rating > 0 && (
                  <Text style={s.star}>★ {t.rating.toFixed(1)}</Text>
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
                    ? 'No community tutors yet'
                    : 'Verify your email to browse tutors'
                  : 'Your directory is empty'
            }
            body={
              list.length
                ? 'Try another subject or clear the filters.'
                : hasMoreTutors
                  ? 'No matches in the loaded listings. Load more tutors or clear the filters.'
                  : sharedAccount
                    ? emailVerified
                      ? 'Publish a tutor profile to help other learners find you, or check back later.'
                      : 'Tutor listings are available after your Firebase email is verified.'
                    : 'Create a device-only tutor profile or sign in with Firebase to browse shared tutor listings.'
            }
          />
        )
      )}
      {!!error && retry && (
        <Link label="Retry tutor directory" onPress={retry} />
      )}
      {filtered && hasMoreTutors && (
        <Text style={s.muted}>
          Search covers loaded listings. Load more tutors to search further.
        </Text>
      )}
      {hasMoreTutors && loadMoreTutors && (
        <AppButton
          title={loadingMoreTutors ? 'LOADING MORE TUTORS...' : 'LOAD MORE TUTORS'}
          outline
          disabled={loadingMoreTutors}
          onPress={loadMoreTutors}
        />
      )}
      {!tutorsLive && retry && (
        <>
          <Text style={s.muted}>
            Older listings are a snapshot. Refresh to see the latest changes.
          </Text>
          <AppButton title="REFRESH LATEST TUTOR LISTINGS" outline onPress={retry} />
        </>
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
