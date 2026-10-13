import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { ErrorText, Field } from '../../../shared/components/UI';

import { s } from '../../../shared/theme/styles';
import { InterestEditor } from '../components/InterestEditor';

export function EditProfileScreen({
  back,
  profile,
  save,
  preferences = false,
  firebaseAccount = false,
}) {
  const [name, setName] = useState(profile.name);
  const [course, setCourse] = useState(profile.course);
  const [year, setYear] = useState(profile.year);
  const [school, setSchool] = useState(profile.school);
  const [studentId, setStudentId] = useState(profile.studentId || '');
  const [interests, setInterests] = useState(profile.interests);
  const [error, setError] = useState('');
  return (
    <Screen
      title={preferences ? 'Learning Preferences' : 'Edit Profile'}
      back={back}
    >
      {!preferences && (
        <>
          <Field
            label="Full name"
            icon="N"
            value={name}
            onChangeText={setName}
          />

          <Field
            label="Course"
            placeholder="Your course (optional)"
            icon="C"
            value={course}
            onChangeText={setCourse}
          />

          <Field
            label="Year level"
            placeholder="Your year level (optional)"
            icon="Y"
            value={year}
            onChangeText={setYear}
          />

          <Field
            label="School"
            placeholder="Your school (optional)"
            value={school}
            onChangeText={setSchool}
          />
          {firebaseAccount && (
            <Field
              label="Student ID (private)"
              placeholder="Your Student ID (optional)"
              value={studentId}
              onChangeText={setStudentId}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          )}
        </>
      )}
      <Text style={s.section}>Learning interests</Text>
      <InterestEditor value={interests} onChange={setInterests} />
      <View style={s.bigGap} />
      <ErrorText value={error} />
      <AppButton
        title="SAVE CHANGES"
        onPress={() => {
          if (!preferences && name.trim().length < 2) {
            setError('Enter your full name.');
            return;
          }
          save(
            preferences
              ? { interests }
              : {
                  name: name.trim(),
                  course: course.trim(),
                  year: year.trim(),
                  school: school.trim(),
                  ...(firebaseAccount ? { studentId: studentId.trim() } : {}),
                  interests,
                },
          );
          back();
        }}
      />
    </Screen>
  );
}
