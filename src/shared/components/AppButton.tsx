import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { C } from '../theme/colors';
import { s } from '../theme/styles';

export function AppButton({
  title,
  onPress,
  outline = false,
  disabled = false,
  busy = false,
  style,
}: {
  title: string;
  onPress: () => void;
  outline?: boolean;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        s.btn,
        outline && s.outline,
        (disabled || busy) && s.disabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={outline ? C.cyan : C.bg} />
      ) : (
        <Text style={[s.btnText, outline && s.blue]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
