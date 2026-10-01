import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Icon } from '../../../shared/components/Icon';
import { Chip, ErrorText, Field } from '../../../shared/components/UI';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

const suggestions = [
  'Mathematics',
  'Science',
  'Writing',
  'Languages',
  'Design',
  'Business',
];
export function InterestEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  function add(text: string) {
    const interest = text.trim().replace(/\s+/g, ' ');
    if (!interest) {
      setError('Enter an interest.');
      return;
    }
    if (value.some(x => x.toLowerCase() === interest.toLowerCase())) {
      setError('That interest is already in your list.');
      return;
    }
    if (value.length >= 20) {
      setError('Keep up to 20 interests. Remove one before adding another.');
      return;
    }
    onChange([...value, interest]);
    setDraft('');
    setError('');
  }
  return (
    <>
      <Text style={s.muted}>
        Add any subject, skill, or topic you want to learn.
      </Text>
      <View style={s.gap} />
      <Field
        label="Add an interest"
        placeholder="Example: Nursing, drawing, Spanish"
        value={draft}
        onChangeText={setDraft}
        maxLength={60}
        returnKeyType="done"
        onSubmitEditing={() => add(draft)}
      />
      <AppButton title="ADD INTEREST" onPress={() => add(draft)} />
      <ErrorText value={error} />
      <View style={s.gap} />
      <View style={s.wrap}>
        {value.map(interest => (
          <TouchableOpacity
            key={interest}
            accessibilityRole="button"
            accessibilityLabel={'Remove ' + interest}
            onPress={() => {
              onChange(value.filter(x => x !== interest));
              setError('');
            }}
            style={styles.selected}
          >
            <Text style={[s.text, s.blue, s.grow]}>{interest}</Text>
            <Icon name="close" size={18} color={C.cyan} />
          </TouchableOpacity>
        ))}
      </View>
      {!value.length && <Text style={s.muted}>No interests added yet.</Text>}
      <Text style={s.section}>Ideas to start with</Text>
      <View style={s.wrap}>
        {suggestions
          .filter(x => !value.some(v => v.toLowerCase() === x.toLowerCase()))
          .map(x => (
            <Chip key={x} label={x} onPress={() => add(x)} />
          ))}
      </View>
    </>
  );
}
const styles = StyleSheet.create({
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
    minHeight: 44,
    backgroundColor: C.chip,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
