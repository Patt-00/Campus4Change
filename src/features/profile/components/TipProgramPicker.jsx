import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Empty, Field, Link } from '../../../shared/components/UI';
import { Icon } from '../../../shared/components/Icon';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';
import { filterTipProgramGroups, getTipProgram } from '../../../shared/data/tipPrograms';

export function TipProgramPicker({
  visible,
  selectedProgramId = '',
  onClose,
  onSelect,
  onCustom,
  showNoProgram = false,
  customSelected = false,
}) {
  const [query, setQuery] = useState('');
  const sections = useMemo(
    () =>
      filterTipProgramGroups(query).flatMap(campus =>
        campus.colleges.map(college => ({
          key: `${campus.id}-${college.id}`,
          title: `${campus.campus}  ·  ${college.name}`,
          data: college.programs,
        })),
      ),
    [query],
  );

  function choose(program) {
    onSelect(program);
    setQuery('');
    onClose();
  }

  function chooseCustom() {
    onCustom?.();
    setQuery('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.titleRow}>
            <Text accessibilityRole="header" style={s.heading}>
              Choose a TIP program
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close program picker"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Icon name="close" size={20} color={C.muted} />
            </TouchableOpacity>
          </View>
          <Text style={[s.muted, styles.intro]}>
            Browse by campus and college, or search the program list.
          </Text>
          <Field
            icon="search"
            placeholder="Search programs or colleges"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          <SectionList
            style={s.grow}
            sections={sections}
            keyExtractor={program => program.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            stickySectionHeadersEnabled={false}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={7}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            )}
            renderItem={({ item: program }) => {
              const selected = program.id === selectedProgramId;
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${program.name}, ${getTipProgram(program.id)?.college}, ${program.campus}`}
                  accessibilityState={{ selected }}
                  onPress={() => choose(program)}
                  style={[styles.programRow, selected && styles.selectedRow]}
                >
                  <View style={s.grow}>
                    <Text style={s.text}>{program.name}</Text>
                    <Text style={styles.campusLabel}>{program.campus}</Text>
                  </View>
                  {selected && <Icon name="check" size={18} color={C.cyan} />}
                </TouchableOpacity>
              );
            }}
            ListHeaderComponent={
              showNoProgram ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: !selectedProgramId && !customSelected,
                  }}
                  onPress={() => choose(null)}
                  style={[
                    styles.programRow,
                    !selectedProgramId && !customSelected && styles.selectedRow,
                  ]}
                >
                  <View style={s.grow}>
                    <Text style={s.text}>No course selected</Text>
                    <Text style={styles.campusLabel}>
                      Keep learning interests unassigned to a TIP program.
                    </Text>
                  </View>
                  {!selectedProgramId && !customSelected && (
                    <Icon name="check" size={18} color={C.cyan} />
                  )}
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <Empty
                title="No programs found"
                body="Try a different program, college, or campus name."
              />
            }
            ListFooterComponent={
              onCustom ? (
                <View style={styles.customAction}>
                  <Link
                    label="My program isn't listed — enter it manually"
                    onPress={chooseCustom}
                  />
                </View>
              ) : null
            }
            contentContainerStyle={styles.listContent}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#000a',
  },
  sheet: {
    height: '88%',
    maxHeight: '88%',
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  closeButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: { marginBottom: 14 },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    color: C.cyan,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
    marginBottom: 6,
  },
  programRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  selectedRow: { backgroundColor: C.card },
  campusLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
    color: C.muted,
    marginTop: 2,
  },
  customAction: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 24,
  },
  listContent: { paddingBottom: 20 },
});
