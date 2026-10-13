import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../../shared/theme/colors';

export function GoogleAuthButton({
  title,
  onPress,
  disabled = false,
  busy = false,
}) {
  const unavailable = disabled || busy;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: unavailable }}
      disabled={unavailable}
      onPress={onPress}
      style={[styles.button, unavailable && styles.disabled]}
    >
      {busy ? (
        <ActivityIndicator color={C.googleMark} />
      ) : (
        <View style={styles.googleMark}>
          <Text style={styles.googleLetter}>G</Text>
        </View>
      )}
      <Text style={styles.label}>{title}</Text>
      <View style={styles.trailing} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    width: '100%',
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.googleBorder,
    borderRadius: 12,
    backgroundColor: C.googleSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  disabled: {
    opacity: 0.55,
  },
  googleMark: {
    width: 24,
    alignItems: 'center',
  },
  googleLetter: {
    color: C.googleMark,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  label: {
    color: C.googleText,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  trailing: {
    width: 24,
  },
});
