import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { ErrorText, Field, Link } from '../../../shared/components/UI';

import { s } from '../../../shared/theme/styles';

export function BeTutorScreen({ back, profile, save }) {
  const [subjects, setSubjects] = useState(profile.tutorSubjects.join(', '));
  const [bio, setBio] = useState(profile.bio);
  const [error, setError] = useState('');
  return (
    <Screen title="Be a Tutor" back={back}>
      <Text style={[s.muted, styles.marginBottom24]}>
        Add the subjects or skills you can help with. You’ll see your listing
        in your own tutor directory; it isn’t shared with other students yet.
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
