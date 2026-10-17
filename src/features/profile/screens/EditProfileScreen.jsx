import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../../shared/components/Icon';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { ErrorText, Field } from '../../../shared/components/UI';
import {
  flattenInterestGroups,
  normalizeInterestGroups,
} from '../../../shared/data/interestGroups';
import { getTipProgram } from '../../../shared/data/tipPrograms';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';
import { InterestEditor } from '../components/InterestEditor';
import { ProfileAvatarEditor } from '../components/ProfileAvatarEditor';
import { TipProgramPicker } from '../components/TipProgramPicker';

export function EditProfileScreen({
  back,
  profile,
  save,
  preferences = false,
  firebaseAccount = false,
}) {
  const [name, setName] = useState(profile.name);
  const [courseId, setCourseId] = useState(profile.courseId || '');
  const [course, setCourse] = useState(profile.course || '');
  const [customCourse, setCustomCourse] = useState(
    Boolean(profile.course && !profile.courseId),
  );
  const [year, setYear] = useState(profile.year);
  const [school, setSchool] = useState(profile.school);
  const [studentId, setStudentId] = useState(profile.studentId || '');
  const [avatarId, setAvatarId] = useState(profile.avatarId || 'cyan');
  const [photoUri, setPhotoUri] = useState(profile.profilePhotoUri || '');
  const [interestGroups, setInterestGroups] = useState(() =>
    normalizeInterestGroups(
      profile.interestGroups,
      profile.interests,
      profile.courseId,
      profile.course,
    ),
  );
  const [error, setError] = useState('');
  const [coursePickerVisible, setCoursePickerVisible] = useState(false);
  const selectedProgram = getTipProgram(courseId);

  function handleAvatarChange(changes) {
    if (typeof changes.avatarId === 'string') {
      setAvatarId(changes.avatarId);
    }
    if (typeof changes.photoUri === 'string') {
      setPhotoUri(changes.photoUri);
    }
  }

  function saveProfile() {
    if (!preferences && name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    setError('');
    const normalizedGroups = normalizeInterestGroups(
      interestGroups,
      profile.interests,
      courseId,
      course,
    );
    const interests = flattenInterestGroups(normalizedGroups);
    save(
      preferences
        ? { interests, interestGroups: normalizedGroups }
        : {
            name: name.trim(),
            course: course.trim(),
            courseId,
            year: year.trim(),
            school: school.trim(),
            avatarId,
            profilePhotoUri: photoUri,
            ...(firebaseAccount ? { studentId: studentId.trim() } : {}),
            interests,
            interestGroups: normalizedGroups,
          },
    );
    back();
  }

  return (
    <Screen
      title={preferences ? 'Learning Preferences' : 'Edit Profile'}
      back={back}
    >
      {!preferences && (
        <>
          <Text style={s.section}>Profile photo</Text>
          <ProfileAvatarEditor
            accountId={profile.id}
            name={name}
            avatarId={avatarId}
            photoUri={photoUri}
            onChange={handleAvatarChange}
          />

          <Text style={s.section}>Profile details</Text>
          <Field
            label="Full name"
            icon="N"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={s.label}>Course or program</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              selectedProgram
                ? `Course: ${selectedProgram.name}, ${selectedProgram.campus}. Change course.`
                : course
                  ? `Course: ${course}. Change course.`
                  : 'Choose your TIP course or program'
            }
            onPress={() => setCoursePickerVisible(true)}
            style={styles.courseSelector}
          >
            <Icon name="graduation" size={20} color={C.muted} />
            <View style={s.grow}>
              <Text style={s.text} numberOfLines={2}>
                {selectedProgram?.name || course || 'Choose a TIP program'}
              </Text>
              <Text style={styles.courseHint} numberOfLines={1}>
                {selectedProgram
                  ? `${selectedProgram.college} · ${selectedProgram.campus}`
                  : 'Browse all programs by campus and college'}
              </Text>
            </View>
            <Icon name="right" size={18} color={C.muted} />
          </TouchableOpacity>
          {customCourse && (
            <Field
              label="Your course or program"
              placeholder="Enter your course"
              value={course}
              onChangeText={setCourse}
              maxLength={100}
              autoCapitalize="words"
            />
          )}
          <Field
            label="Year level"
            placeholder="Your year level (optional)"
            value={year}
            onChangeText={setYear}
            maxLength={40}
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
      <InterestEditor
        value={interestGroups}
        onChange={setInterestGroups}
        courseId={courseId}
        courseName={course}
      />
      <View style={s.bigGap} />
      <ErrorText value={error} />
      <AppButton
        title="SAVE CHANGES"
        onPress={saveProfile}
      />

      {!preferences && (
        <TipProgramPicker
          visible={coursePickerVisible}
          selectedProgramId={courseId}
          showNoProgram
          customSelected={customCourse}
          onClose={() => setCoursePickerVisible(false)}
          onSelect={program => {
            setCustomCourse(false);
            setCourseId(program?.id || '');
            setCourse(program?.name || '');
          }}
          onCustom={() => {
            setCoursePickerVisible(false);
            setCourseId('');
            setCourse('');
            setCustomCourse(true);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  courseSelector: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.card,
    marginBottom: 12,
  },
  courseHint: {
    fontFamily: 'Inter-Regular',
    color: C.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
});
