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

import { filterTutors, recommendTutorMatches } from '../data/search';

export function TutorSearchScreen({
  go,
  back,
  list,
  interests = [],
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
  const filteredResults = filterTutors(list, query, subject, available, top);
  const recommendations = top
    ? []
    : recommendTutorMatches(filteredResults, interests);
  const recommendedIds = new Set(recommendations.map(tutor => tutor.id));
  const results = [
    ...recommendations,
    ...filteredResults.filter(tutor => !recommendedIds.has(tutor.id)),
  ];
  const filtered = !!query.trim() || !!subject || available || top;
  return (
    <Screen title="Find People" back={back} go={go} tab="Home">
      <Field
        icon="search"
        placeholder="Search name, course, or subject"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
      />
      <Text style={[s.muted, styles.directoryHint]}>
        Search public tutor profiles by name, course, or subject.
      </Text>

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
      {!!interests.length && !recommendations.length && !filtered && !!list.length && (
        <View style={styles.recommendationHint}>
          <Text style={s.muted}>
            {hasMoreTutors
              ? 'No matches in the loaded listings yet. Load more to check the rest of the directory.'
              : 'No public tutor profiles match your saved interests.'}
          </Text>
          <Link
            label="Edit learning interests"
            onPress={() => go('Preferences')}
          />
        </View>
      )}
      {!interests.length && !filtered && !!list.length && (
        <View style={styles.recommendationHint}>
          <Text style={s.muted}>
            Add learning interests to get personalized people recommendations.
          </Text>
          <Link
            label="Add learning interests"
            onPress={() => go('Preferences')}
          />
        </View>
      )}
      {recommendations.length > 0 && (
        <Text style={[s.section, styles.recommendationHeading]}>
          Recommended for your interests
        </Text>
      )}
      <Text style={s.section}>
        {filtered
          ? 'People search results'
          : sharedAccount
            ? 'Public community profiles'
            : 'Your public profile'} · {results.length}
        {hasMoreTutors ? ' shown' : ''}
      </Text>
      {results.map((t, index) => {
        const isRecommended = recommendedIds.has(t.id);
        const previous = results[index - 1];
        const rating =
          Number.isFinite(t.rating) && t.rating > 0
            ? `Rating ${t.rating.toFixed(1)} stars`
            : 'No rating yet';
        const listing = t.own ? 'Your listing' : 'Community tutor';
        return (
          <React.Fragment key={t.id}>
            {index > 0 && isRecommended && !previous?.matchedInterests?.length && (
              <Text style={[s.section, styles.recommendationHeading]}>
                Recommended for your interests
              </Text>
            )}
            {index > 0 && !isRecommended && previous?.matchedInterests?.length > 0 && (
              <Text style={s.section}>More public profiles</Text>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${t.name}. ${[t.course, t.year].filter(Boolean).join(', ')}. Subjects: ${(t.subjects || []).join(', ')}.${isRecommended ? ` Matches your interests: ${t.matchedInterests.join(', ')}.` : ''} ${rating}. ${listing}. View profile.`}
              accessibilityHint="Opens this public tutor profile."
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
                  {!!(t.course || t.year) && (
                    <Text style={s.muted}>
                      {[t.course, t.year].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  {isRecommended && (
                    <Text style={[s.muted, s.blue]}>
                      Matches: {t.matchedInterests.join(' · ')}
                    </Text>
                  )}
                  <Text style={s.muted}>{(t.subjects || []).join(' · ')}</Text>
                  {Number.isFinite(t.rating) && t.rating > 0 && (
                    <Text style={s.star}>★ {t.rating.toFixed(1)}</Text>
                  )}
                  {t.own && <Text style={[s.muted, s.blue]}>Your listing</Text>}
                </View>
              </View>
              <Text style={[s.link, styles.profile]}>View profile</Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
      {!results.length && (
        loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={C.cyan} />
            <Text style={s.muted}>Loading public profiles…</Text>
          </View>
        ) : (
          <Empty
            title={
              list.length
                ? 'No people found'
                : sharedAccount
                  ? emailVerified
                    ? 'No public profiles yet'
                    : 'Verify your email to browse tutors'
                  : 'Your directory is empty'
            }
            body={
              list.length
                ? 'Try another name, course, or subject, or clear the filters.'
                : hasMoreTutors
                  ? 'No matches in the loaded listings. Load more tutors or clear the filters.'
                  : sharedAccount
                    ? emailVerified
                      ? 'People who publish a tutor profile can be found here. Check back later or create your own profile.'
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
  directoryHint: { marginTop: -4, marginBottom: 8 },
  recommendationHeading: { marginTop: 16, marginBottom: 8 },
  recommendationHint: { marginBottom: 8, gap: 6 },
  profile: { textAlign: 'right', marginTop: 12 },
  loading: { alignItems: 'center', gap: 12, paddingVertical: 28 },
});
