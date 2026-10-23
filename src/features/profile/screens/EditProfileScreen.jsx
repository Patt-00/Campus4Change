import React, { useEffect, useState } from 'react';
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
import {
  getTipCampusLabel,
  normalizeTipCampus,
} from '../../../shared/data/tipCampuses';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';
import { InterestEditor } from '../components/InterestEditor';
import { ProfileAvatarEditor } from '../components/ProfileAvatarEditor';
import { TipProgramPicker } from '../components/TipProgramPicker';
import { TipCampusPicker } from '../components/TipCampusPicker';

function normalizeYearLevel(value) {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s+year)?$/i);
  return match?.[1] || '';
}

export function EditProfileScreen({
  back,
  profile,
  save,
  preferences = false,
  firebaseAccount = false,
  setup = false,
  onComplete,
  onDirtyChange = () => {},
}) {
  const [initialValues] = useState(() => ({
    name: profile.name || '',
    courseId: profile.courseId || '',
    course: profile.course || '',
    customCourse: Boolean(profile.course && !profile.courseId),
    year: normalizeYearLevel(profile.year),
    campus:
      normalizeTipCampus(profile.campus) ||
      normalizeTipCampus(profile.school),
    avatarId: profile.avatarId || 'cyan',
    photoUri: profile.profilePhotoUri || '',
    interestGroups: normalizeInterestGroups(
      profile.interestGroups,
      profile.interests,
      profile.courseId,
      profile.course,
    ),
  }));
  const [name, setName] = useState(initialValues.name);
  const [courseId, setCourseId] = useState(initialValues.courseId);
  const [course, setCourse] = useState(initialValues.course);
  const [customCourse, setCustomCourse] = useState(initialValues.customCourse);
  const [year, setYear] = useState(initialValues.year);
  const [campus, setCampus] = useState(initialValues.campus);
  const [avatarId, setAvatarId] = useState(initialValues.avatarId);
  const [photoUri, setPhotoUri] = useState(initialValues.photoUri);
  const [interestGroups, setInterestGroups] = useState(
    initialValues.interestGroups,
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [coursePickerVisible, setCoursePickerVisible] = useState(false);
  const [campusPickerVisible, setCampusPickerVisible] = useState(false);
  const selectedProgram = getTipProgram(courseId);
  const currentValues = {
    name,
    courseId,
    course,
    customCourse,
    year,
    campus,
    avatarId,
    photoUri,
    interestGroups,
  };
  const isDirty =
    JSON.stringify(currentValues) !== JSON.stringify(initialValues);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  function handleAvatarChange(changes) {
    if (typeof changes.avatarId === 'string') {
      setAvatarId(changes.avatarId);
    }
    if (typeof changes.photoUri === 'string') {
      setPhotoUri(changes.photoUri);
    }
  }

  async function saveProfile() {
    if (saving) {
      return;
    }
    if (!preferences && name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (!preferences && year && Number(year) < 1) {
      setError('Enter a positive number for year level, or leave it blank.');
      return;
    }
    if (setup && (!courseId || !selectedProgram)) {
      setError('Choose your TIP course or program.');
      return;
    }
    if (setup && selectedProgram.campus !== campus) {
      setError('Choose the TIP campus that matches your course.');
      return;
    }
    if (setup && !year) {
      setError('Enter your year level.');
      return;
    }
    if (setup && !campus) {
      setError('Choose your TIP campus.');
      return;
    }
    const normalizedGroups = normalizeInterestGroups(
      interestGroups,
      profile.interests,
      courseId,
      course,
    );
    const interests = flattenInterestGroups(normalizedGroups);
    setSaving(true);
    setError('');
    try {
      await save(
        preferences
          ? { interests, interestGroups: normalizedGroups }
          : {
              name: name.trim(),
              course: course.trim(),
              courseId,
              year,
              campus,
              avatarId,
              profilePhotoUri: photoUri,
              interests,
              interestGroups: normalizedGroups,
            },
        { requireCloud: setup && firebaseAccount },
      );
      if (setup) {
        onComplete?.();
      } else {
        back({ force: true });
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : String(saveError),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title={setup ? 'Set up your account' : preferences ? 'Learning Preferences' : 'Edit Profile'}
      back={setup ? undefined : back}
    >
      {setup && (
        <Text style={s.muted}>
          Add your TIP academic details to finish setting up your account.
        </Text>
      )}
      {setup && Boolean(profile.accountUuid) && (
        <View style={[s.card, styles.accountIdCard]}>
          <Text style={s.label}>Your Campus4Change ID</Text>
          <Text
            accessibilityLabel={`Campus4Change account ID ${profile.accountUuid}`}
            selectable
            style={styles.accountIdValue}
          >
            {profile.accountUuid}
          </Text>
          <Text style={[s.muted, styles.accountIdHint]}>
            Generated for your account. Long press to copy it. This ID does not
            verify TIP enrollment.
          </Text>
        </View>
      )}
      {!preferences && (
        <>
          {!setup && (
            <>
              <Text style={s.section}>Profile photo</Text>
              <ProfileAvatarEditor
                accountId={profile.id}
                name={name}
                avatarId={avatarId}
                photoUri={photoUri}
                onChange={handleAvatarChange}
              />
            </>
          )}

          <Text style={s.section}>{setup ? 'Academic details' : 'Profile details'}</Text>
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
            placeholder={setup ? 'Enter your year level' : 'Enter year number (optional)'}
            value={year}
            onChangeText={value => setYear(value.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
          />

          <Text style={s.label}>TIP campus</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Campus: ${getTipCampusLabel(campus) || 'Choose your TIP campus'}`}
            accessibilityHint="Select Quezon City or Manila."
            onPress={() => setCampusPickerVisible(true)}
            style={styles.courseSelector}
          >
            <Icon name="graduation" size={20} color={C.muted} />
            <View style={s.grow}>
              <Text style={s.text}>
                {getTipCampusLabel(campus) || 'Choose your TIP campus'}
              </Text>
              <Text style={styles.courseHint}>
                {campus || 'Quezon City or Manila'}
              </Text>
            </View>
            <Icon name="right" size={18} color={C.muted} />
          </TouchableOpacity>
        </>
      )}

      {!setup && (
        <>
          <Text style={s.section}>Learning interests</Text>
          <InterestEditor
            value={interestGroups}
            onChange={setInterestGroups}
            courseId={courseId}
            courseName={course}
          />
        </>
      )}
      <View style={s.bigGap} />
      <ErrorText value={error} />
      <AppButton
        title={setup ? 'SAVE AND CONTINUE' : 'SAVE CHANGES'}
        busy={saving}
        onPress={saveProfile}
      />

      {!preferences && (
        <TipProgramPicker
          visible={coursePickerVisible}
          selectedProgramId={courseId}
          customSelected={customCourse}
          onClose={() => setCoursePickerVisible(false)}
          onSelect={program => {
            setCustomCourse(false);
            setCourseId(program?.id || '');
            setCourse(program?.name || '');
            if (setup && program?.campus) {
              setCampus(program.campus);
            }
          }}
          showNoProgram={!setup}
          onCustom={
            setup
              ? undefined
              : () => {
                  setCoursePickerVisible(false);
                  setCourseId('');
                  setCourse('');
                  setCustomCourse(true);
                }
          }
        />
      )}
      {!preferences && (
        <TipCampusPicker
          visible={campusPickerVisible}
          selectedCampus={campus}
          onClose={() => setCampusPickerVisible(false)}
          onSelect={setCampus}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountIdCard: {
    marginTop: 16,
    marginBottom: 6,
    padding: 14,
  },
  accountIdValue: {
    color: C.text,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    letterSpacing: 0.3,
    marginTop: 5,
  },
  accountIdHint: {
    marginTop: 7,
  },
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
  fieldHint: { marginTop: -6, marginBottom: 8 },
});
