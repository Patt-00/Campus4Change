import React, { useState } from 'react';
import { Alert, Text, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { ErrorText, Field, Link } from '../../../shared/components/UI';

import { s } from '../../../shared/theme/styles';

export function BeTutorScreen({
  back,
  profile,
  save,
  sharedAccount = false,
  canShare = true,
}) {
  const [subjects, setSubjects] = useState(profile.tutorSubjects.join(', '));
  const [bio, setBio] = useState(profile.bio);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(subjectList) {
    if (saving) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await save({
        tutorSubjects: subjectList,
        bio: subjectList.length ? bio.trim() : '',
      });
      if (typeof result === 'string' || result?.error) {
        setError(typeof result === 'string' ? result : result.error);
        return;
      }
      back();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save this tutor profile. Try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Be a Tutor" back={back}>
      <Text style={[s.muted, styles.marginBottom24]}>
        {sharedAccount
          ? 'Add subjects you can help with. Your profile will be visible in the shared directory to Firebase users with verified emails. Keep private contact details out of your introduction.'
          : 'Add subjects or skills you can help with. This device-only listing is visible only in your local directory.'}
      </Text>
      {sharedAccount && !canShare && (
        <Text style={[s.error, styles.marginBottom16]}>
          Verify your email before publishing a tutor profile.
        </Text>
      )}
      <Field
        label="Subjects (separate with commas)"
        placeholder="Writing, design, biology"
        value={subjects}
        onChangeText={setSubjects}
      />

      <Field
        label="About you"
        multiline
        placeholder="How do you help others learn?"
        value={bio}
        onChangeText={setBio}
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
          const uniqueSubjects = new Map();
          subjects.split(',').forEach(value => {
            const subject = value.trim().replace(/\s+/g, ' ');
            const key = subject.toLowerCase();
            if (subject && !uniqueSubjects.has(key)) {
              uniqueSubjects.set(key, subject);
            }
          });
          const list = [...uniqueSubjects.values()];

          if (!list.length || bio.trim().length < 10) {
            setError(
              'Add at least one subject and an introduction of at least 10 characters.',
            );
            return;
          }
          if (list.length > 10 || bio.trim().length > 1000) {
            setError('Use no more than 10 subjects and keep your introduction under 1,000 characters.');
            return;
          }
          submit(list);
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
  marginBottom24: {
    marginBottom: 24,
  },
  marginBottom16: {
    marginBottom: 16,
  },
});
