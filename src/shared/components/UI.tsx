import React from 'react';
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
  StyleSheet,
} from 'react-native';
import { C } from '../theme/colors';
import { s } from '../theme/styles';
const images = {
  avatar: require('../assets/avatar.png'),
  tutor: require('../assets/tutor.png'),
  teach: require('../assets/teach.png'),
  group: require('../assets/group.png'),
  session: require('../assets/session.png'),
};
export function Avatar({
  name,
  variant = 'avatar',
}: {
  name: string;
  variant?: keyof typeof images;
}) {
  return (
    <View style={s.avatar}>
      <Image source={images[variant]} style={s.avatar} />
      <Text style={[s.avatarText, styles.positionabsolute]}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
export function Field({
  label,
  icon,
  multiline,
  ...props
}: TextInputProps & {
  label?: string;
  icon?: string;
}) {
  return (
    <View style={s.fieldGroup}>
      {label && <Text style={s.label}>{label}</Text>}
      <View style={[s.inputRow, multiline && styles.alignItemsflexstart]}>
        {icon && <Avatar name={icon} />}
        <TextInput
          accessibilityLabel={label ?? props.placeholder}
          placeholderTextColor={C.muted}
          style={[s.input, multiline && s.multiline]}
          multiline={multiline}
          maxLength={multiline ? 2000 : 160}
          {...props}
        />
      </View>
    </View>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  color = C.cyan,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const content = (
    <Text
      style={[
        s.chipText,
        {
          color: selected ? C.bg : color,
        },
      ]}
    >
      {label}
    </Text>
  );
  const style = [
    s.chip,
    selected && {
      backgroundColor: color,
    },
  ];
  return onPress ? (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        selected: !!selected,
      }}
      style={style}
      onPress={onPress}
    >
      {content}
    </TouchableOpacity>
  ) : (
    <View style={style}>{content}</View>
  );
}
export function Link({
  label,
  onPress,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={s.linkControl}
    >
      <Text style={[s.link, danger && s.danger]}>{label}</Text>
    </TouchableOpacity>
  );
}
export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.name}>{title}</Text>
      <Text style={[s.muted, s.center]}>{body}</Text>
    </View>
  );
}
export function ErrorText({ value }: { value?: string }) {
  return value ? (
    <Text accessibilityRole="alert" style={s.error}>
      {value}
    </Text>
  ) : null;
}
const styles = StyleSheet.create({
  positionabsolute: {
    position: 'absolute',
  },
  alignItemsflexstart: {
    alignItems: 'flex-start',
  },
});
