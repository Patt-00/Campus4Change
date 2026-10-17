import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../../shared/components/Icon';
import { Chip, ErrorText, Field } from '../../../shared/components/UI';
import { getTipProgram } from '../../../shared/data/tipPrograms';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';
import { TipProgramPicker } from './TipProgramPicker';

function customGroupId(name) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug ? `custom-${slug}` : 'other-interests';
}

function groupTitle(group) {
  return group.campus
    ? `${group.programName}  ·  ${group.campus}`
    : group.programName;
}

export function InterestEditor({
  value,
  onChange,
  courseId = '',
  courseName = '',
  description = 'TIP core and specialization topic ideas by course.',
  inputLabel = 'Add an interest',
  groupsHeading = 'Your interests by course',
  itemName = 'interest',
  itemPlural = 'interests',
  defaultGroupName = 'Other interests',
  maxItems = 20,
}) {
  const [draft, setDraft] = useState('');
  const [topicQuery, setTopicQuery] = useState('');
  const [error, setError] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeProgramId, setActiveProgramId] = useState(
    courseId || (courseName ? 'custom' : ''),
  );
  const profileCourseKey = `${courseId}|${courseName}`;
  const previousCourseKey = useRef(profileCourseKey);
  const activeProgram = getTipProgram(activeProgramId);
  const customName = courseName.trim() || defaultGroupName;
  const unassignedGroupId =
    defaultGroupName === 'Other interests'
      ? 'other-interests'
      : customGroupId(defaultGroupName);
  const activeGroupId =
    activeProgram?.id ||
    (activeProgramId === 'custom' ? customGroupId(customName) : unassignedGroupId);
  const activeGroupName = activeProgram?.name || customName;
  const activeCampus = activeProgram?.campus || '';
  const total = value.reduce((count, group) => count + group.interests.length, 0);
  const normalizedTopicQuery = topicQuery.trim().toLocaleLowerCase();
  const visibleTopicGroups = activeProgram
    ? activeProgram.topicGroups
        .map(topicGroup => ({
          ...topicGroup,
          topics: topicGroup.topics.filter(topic =>
            topic.toLocaleLowerCase().includes(normalizedTopicQuery),
          ),
        }))
        .filter(topicGroup => topicGroup.topics.length)
    : [];

  useEffect(() => {
    if (previousCourseKey.current !== profileCourseKey) {
      previousCourseKey.current = profileCourseKey;
      setActiveProgramId(courseId || (courseName ? 'custom' : ''));
      setTopicQuery('');
    }
  }, [courseId, courseName, profileCourseKey]);

  function removeTopic(groupId, topic) {
    const next = value
      .map(group =>
        group.id === groupId
          ? {
              ...group,
              interests: group.interests.filter(item => item !== topic),
            }
          : group,
      )
      .filter(group => group.interests.length);
    onChange(next);
    setError('');
  }

  function addTopic(rawTopic) {
    const topic = rawTopic.trim().replace(/\s+/g, ' ');
    if (!topic) {
      setError(`Enter a ${itemName}, then add it to a course.`);
      return false;
    }
    const current = value.find(group => group.id === activeGroupId);
    if (current?.interests.some(item => item.toLowerCase() === topic.toLowerCase())) {
      setError(
        activeGroupId === unassignedGroupId
          ? `That ${itemName} is already in your list.`
          : `That ${itemName} is already in your list for ${activeGroupName}.`,
      );
      return false;
    }
    if (total >= maxItems) {
      setError(
        `Keep up to ${maxItems} ${itemPlural} across your course groups. Remove one before adding another.`,
      );
      return false;
    }
    const nextGroup = current
      ? { ...current, interests: [...current.interests, topic] }
      : {
          id: activeGroupId,
          programId: activeProgram?.id || '',
          programName: activeGroupName,
          campus: activeCampus,
          interests: [topic],
        };
    onChange(
      current
        ? value.map(group => (group.id === activeGroupId ? nextGroup : group))
        : [...value, nextGroup],
    );
    setError('');
    return true;
  }

  function toggleSuggestion(topic) {
    const selectedGroup = value.find(group => group.id === activeGroupId);
    if (selectedGroup?.interests.some(item => item.toLowerCase() === topic.toLowerCase())) {
      const existing = selectedGroup.interests.find(
        item => item.toLowerCase() === topic.toLowerCase(),
      );
      removeTopic(activeGroupId, existing);
      return;
    }
    addTopic(topic);
  }

  function chooseProgram(program) {
    setActiveProgramId(program?.id || '');
    setTopicQuery('');
    setError('');
  }

  function chooseCustomCourseGroup() {
    setActiveProgramId('custom');
    setTopicQuery('');
    setError('');
  }

  return (
    <>
      <Text style={s.muted}>
        {description}
      </Text>
      <View style={styles.programHeading}>
        <Text style={styles.editorLabel}>Course ideas</Text>
        <Text style={s.muted}>{total}/{maxItems} selected</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          activeProgram
            ? `Browse ideas for ${activeProgram.name}, ${activeProgram.campus}`
            : activeProgramId === 'custom'
              ? `Browse ideas for ${customName}`
              : 'Choose a TIP program for learning ideas'
        }
        onPress={() => setPickerVisible(true)}
        style={styles.programSelector}
      >
        <Icon name="graduation" size={20} color={C.cyan} />
        <View style={s.grow}>
          <Text numberOfLines={2} style={s.name}>
            {activeProgram?.name || (activeProgramId === 'custom' ? customName : 'Choose a TIP program')}
          </Text>
          <Text numberOfLines={1} style={s.muted}>
            {activeProgram
              ? `${activeProgram.college} · ${activeProgram.campus}`
              : activeProgramId === 'custom'
                ? 'Custom program'
                : 'Programs grouped by campus and college'}
          </Text>
        </View>
        <Icon name="right" size={18} color={C.muted} />
      </TouchableOpacity>

      {activeProgram && (
        <View style={styles.topicSearch}>
          <Field
            placeholder="Search core subjects or specialization areas"
            accessibilityLabel="Search course topics"
            accessibilityHint="Filters the selected TIP program's core subjects and specialization areas."
            icon="search"
            value={topicQuery}
            onChangeText={setTopicQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      )}

      {visibleTopicGroups.map((topicGroup, index) => (
        <View
          key={`${activeProgram.id}-${topicGroup.title}`}
          style={[styles.ideaGroup, index === 0 && styles.firstIdeaGroup]}
        >
          <Text style={styles.ideaHeading}>
            {topicGroup.title} ({topicGroup.topics.length})
          </Text>
          <View style={s.wrap}>
            {topicGroup.topics.map(topic => {
              const selected = Boolean(
                value
                  .find(group => group.id === activeGroupId)
                  ?.interests.some(item => item.toLowerCase() === topic.toLowerCase()),
              );
              return (
                <Chip
                  key={topic}
                  label={topic}
                  selected={selected}
                  onPress={() => toggleSuggestion(topic)}
                />
              );
            })}
          </View>
        </View>
      ))}
      {activeProgram && normalizedTopicQuery && !visibleTopicGroups.length && (
        <Text style={styles.browseHint}>
          No matching suggestion. Add your own topic below.
        </Text>
      )}
      {!activeProgram && activeProgramId !== 'custom' && (
        <Text style={styles.browseHint}>
          Select any TIP program to see topic ideas for that course.
        </Text>
      )}

      <View style={styles.customInterestRow}>
        <View style={s.grow}>
          <Field
            label={inputLabel}
            placeholder="A subject, skill, or topic"
            value={draft}
            onChangeText={setDraft}
            maxLength={80}
            returnKeyType="done"
            accessibilityHint={`Added to ${activeGroupName}`}
            onSubmitEditing={() => {
              if (addTopic(draft)) setDraft('');
            }}
          />
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="ADD INTEREST"
          onPress={() => {
            if (addTopic(draft)) setDraft('');
          }}
          style={styles.addButton}
        >
          <Icon name="plus" size={21} color={C.bg} />
        </TouchableOpacity>
      </View>
      <ErrorText value={error} />

      <Text style={s.section}>{groupsHeading}</Text>
      {value.length ? (
        value.map(group => (
          <View key={group.id} style={styles.savedGroup}>
            <Text style={styles.savedGroupTitle}>{groupTitle(group)}</Text>
            <View style={s.wrap}>
              {group.interests.map(interest => (
                <TouchableOpacity
                  key={`${group.id}-${interest}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${interest}`}
                  accessibilityHint={`from ${group.programName}`}
                  onPress={() => removeTopic(group.id, interest)}
                  style={styles.savedTopic}
                >
                  <Text style={styles.savedTopicText}>{interest}</Text>
                  <Icon name="close" size={14} color={C.cyan} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      ) : (
          <Text style={s.muted}>Your selected topics will appear here grouped by course.</Text>
      )}

      <TipProgramPicker
        visible={pickerVisible}
        selectedProgramId={activeProgram?.id || ''}
        showNoProgram
        customSelected={activeProgramId === 'custom'}
        onClose={() => setPickerVisible(false)}
        onSelect={chooseProgram}
        onCustom={chooseCustomCourseGroup}
      />
    </>
  );
}

const styles = StyleSheet.create({
  editorLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: C.text,
  },
  programHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
  },
  programSelector: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: C.card,
  },
  topicSearch: { marginTop: 12 },
  ideaGroup: { marginTop: 14 },
  firstIdeaGroup: { marginTop: 8 },
  ideaHeading: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: C.muted,
    marginBottom: 8,
  },
  browseHint: { ...s.muted, marginTop: 10 },
  customInterestRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.cyan,
    marginBottom: 14,
  },
  savedGroup: { marginBottom: 16 },
  savedGroupTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 19,
    color: C.text,
    marginBottom: 8,
  },
  savedTopic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    maxWidth: '100%',
    backgroundColor: C.chip,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  savedTopicText: {
    flexShrink: 1,
    fontFamily: 'Inter-Medium',
    color: C.cyan,
    fontSize: 12,
    lineHeight: 17,
  },
});
