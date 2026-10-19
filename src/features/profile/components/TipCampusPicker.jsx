import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../../shared/components/Icon';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';
import { tipCampuses } from '../../../shared/data/tipCampuses';

export function TipCampusPicker({ visible, selectedCampus, onClose, onSelect }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.titleRow}>
            <Text accessibilityRole="header" style={s.heading}>
              Choose your TIP campus
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close campus picker"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Icon name="close" size={20} color={C.muted} />
            </TouchableOpacity>
          </View>
          <Text style={[s.muted, styles.intro]}>
            Select the TIP campus where you study.
          </Text>
          {tipCampuses.map(campus => {
            const selected = campus.value === selectedCampus;
            return (
              <TouchableOpacity
                key={campus.value}
                accessibilityRole="button"
                accessibilityLabel={campus.label}
                accessibilityState={{ selected }}
                onPress={() => {
                  onSelect(campus.value);
                  onClose();
                }}
                style={[styles.campusRow, selected && styles.selectedRow]}
              >
                <View style={s.grow}>
                  <Text style={s.text}>{campus.label}</Text>
                  <Text style={styles.campusHint}>{campus.value}</Text>
                </View>
                {selected && <Icon name="check" size={18} color={C.cyan} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
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
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: { marginBottom: 14 },
  campusRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  selectedRow: { backgroundColor: C.card },
  campusHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
    color: C.muted,
    marginTop: 2,
  },
});
