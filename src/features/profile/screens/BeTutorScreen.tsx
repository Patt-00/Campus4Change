import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { ErrorText, Field, Link } from '../../../shared/components/UI';
import type { Profile } from '../../../shared/data/types';
import { s } from '../../../shared/theme/styles';

export function BeTutorScreen({
  back,
  profile,
  save,
}: {
  back: () => void;
  profile: Profile;
  save: (changes: Partial<Profile>) => void;
}) {
  const [subjects, setSubjects] = useState(profile.tutorSubjects.join(', '));
  const [bio, setBio] = useState(profile.bio);
  const [error, setError] = useState('');
  return (
    <Screen title="Be a Tutor" back={back}>
      <Text style={[s.muted, styles.marginBottom24]}>
        Add the subjects or skills you can help with. Your listing is saved on
        this device.
      </Text>
      <Field
        label="Subjects (separate with commas)"
        placeholder="Writing, design, biology"
        value={subjects}
        onChangeText={setSubjects}
      />
      <Field
        label="About you"
        multiline
        placeholder="How do you help other students?"
        value={bio}
        onChangeText={setBio}
      />
      <ErrorText value={error} />
      <AppButton
        title="SAVE TUTOR PROFILE"
        onPress={() => {
          const list = [
            ...new Set(
              subjects
                .split(',')
                .map(x => x.trim())
                .filter(Boolean),
            ),
          ];
          if (!list.length || bio.trim().length < 10) {
            setError(
              'Add at least one subject and an introduction of at least 10 characters.',
            );
            return;
          }
          save({
            tutorSubjects: list,
            bio: bio.trim(),
          });
          back();
        }}
      />
      {!!profile.tutorSubjects.length && (
        <Link
          label="Remove tutor listing"
          danger
          onPress={() => {
            save({
              tutorSubjects: [],
              bio: '',
            });
            back();
          }}
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  marginBottom24: {
    marginBottom: 24,
  },
});
