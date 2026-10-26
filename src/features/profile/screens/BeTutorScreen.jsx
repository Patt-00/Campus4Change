import React, { useState } from 'react';
import { Alert, Text, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { ErrorText, Field, Link } from '../../../shared/components/UI';
import {
  flattenInterestGroups,
  normalizeInterestGroups,
} from '../../../shared/data/interestGroups';
import { InterestEditor } from '../components/InterestEditor';
import { AvailabilityEditor } from '../../tutors/components/AvailabilityEditor';
import {
  getDeviceTimeZone,
  normalizeAvailability,
  normalizeTimeZone,
} from '../../tutors/data/availability';
import { readableErrorText } from '../../../shared/data/readableError';
import { s } from '../../../shared/theme/styles';

export function BeTutorScreen({
  back,
  profile,
  save,
  sharedAccount = false,
  canShare = true,
}) {
  const [subjectGroups, setSubjectGroups] = useState(() =>
    normalizeInterestGroups(
      profile.tutorSubjectGroups,
      profile.tutorSubjects,
      profile.courseId,
      profile.course,
      10,
    ),
  );
  const [bio, setBio] = useState(profile.bio);
  const [availability, setAvailability] = useState(() =>
    normalizeAvailability(profile.tutorAvailability),
  );
  const timeZone = normalizeTimeZone(
    profile.tutorTimeZone || getDeviceTimeZone(),
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(groups) {
    if (saving) {
      return;
    }
    setSaving(true);
    setError('');
    const tutorSubjects = flattenInterestGroups(groups, 10);
    try {
      const result = await save({
        tutorSubjects,
        tutorSubjectGroups: groups,
        tutorAvailability: availability,
        tutorTimeZone: timeZone,
        bio: tutorSubjects.length ? bio.trim() : '',
      });
      if (typeof result === 'string' || result?.error) {
        setError(typeof result === 'string' ? result : result.error);
        return;
      }
      back();
    } catch (saveError) {
      setError(
        readableErrorText(
          saveError,
          'Could not save this tutor profile. Try again.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  const subjects = flattenInterestGroups(subjectGroups, 10);
  return (
    <Screen title="Be a Tutor" back={back}>
      <Text style={[s.muted, styles.intro]}>
        {sharedAccount
          ? 'Choose subjects you can teach from any TIP program, or add your own. Your listing is visible to verified Firebase users; keep private contact details out of your introduction.'
          : 'Choose subjects you can teach from any TIP program, or add your own. This device-only listing stays in your local tutor directory.'}
      </Text>
      {sharedAccount && !canShare && (
        <Text style={[s.error, styles.marginBottom16]}>
          Verify your email before publishing a tutor profile.
        </Text>
      )}
      <Text style={s.section}>Subjects you can teach</Text>
      <InterestEditor
        value={subjectGroups}
        onChange={setSubjectGroups}
        courseId={profile.courseId || ''}
        courseName={profile.course || ''}
        description="Course suggestions draw on TIP core subjects and program focus. Add any subject or skill and keep it grouped by program."
        inputLabel="Add a tutoring subject"
        groupsHeading="Tutor subjects by course"
        itemName="subject"
        itemPlural="subjects"
        defaultGroupName="Other subjects"
        maxItems={10}
      />

      <Text style={s.section}>Weekly availability</Text>
      <Text style={[s.muted, styles.intro]}>
        Choose the days and hours when you can teach. Students will see one-hour
        start times within these ranges.
      </Text>
      <AvailabilityEditor
        value={availability}
        onChange={setAvailability}
        timeZone={timeZone}
      />

      <Text style={s.section}>Introduction</Text>
      <Field
        label="About you"
        multiline
        placeholder="How do you help others learn?"
        value={bio}
        onChangeText={setBio}
        maxLength={1000}
      />

      <ErrorText value={error} />
      <AppButton
        title={
          sharedAccount && !canShare
            ? 'VERIFY EMAIL TO PUBLISH'
            : sharedAccount
              ? 'PUBLISH TUTOR PROFILE'
              : 'SAVE TUTOR PROFILE'
        }
        busy={saving}
        disabled={sharedAccount && !canShare}
        onPress={() => {
          if (!subjects.length || bio.trim().length < 10) {
            setError(
              'Add at least one subject and an introduction of at least 10 characters.',
            );
            return;
          }
          if (subjects.length > 10 || bio.trim().length > 1000) {
            setError(
              'Use no more than 10 subjects and keep your introduction under 1,000 characters.',
            );
            return;
          }
          submit(subjectGroups);
        }}
      />

      {!!profile.tutorSubjects.length && (
        <Link
          label="Remove tutor listing"
          danger
          onPress={() =>
            Alert.alert(
              'Remove tutor listing?',
              'Students will no longer find your profile. Existing session requests remain in your schedule.',
              [
                { text: 'Keep listing', style: 'cancel' },
                {
                  text: 'Remove listing',
                  style: 'destructive',
                  onPress: () => submit([]),
                },
              ],
            )
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 12 },
  marginBottom16: { marginBottom: 16 },
});
