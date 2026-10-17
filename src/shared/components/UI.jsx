import React, { useEffect, useState } from 'react';
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { C } from '../theme/colors';
import { s } from '../theme/styles';
import { Icon } from './Icon';
import { getAvatarPreset } from '../data/avatarPresets';
const images = {
  avatar: require('../assets/avatar.png'),
  tutor: require('../assets/tutor.png'),
  teach: require('../assets/teach.png'),
  group: require('../assets/group.png'),
  session: require('../assets/session.png'),
};
export function Avatar({
  name = 'Student',
  variant = 'avatar',
  size = 36,
  avatarId,
  photoUri,
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => setPhotoFailed(false), [photoUri]);
  const initials = String(name || 'Student')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
  const preset = avatarId ? getAvatarPreset(avatarId) : null;
  const usePhoto = Boolean(photoUri && !photoFailed);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${String(name || 'Student')} profile picture`}
      style={[
        s.avatar,
        { width: size, height: size },
        preset && !usePhoto && { backgroundColor: preset.color, borderRadius: size / 2 },
        usePhoto && [styles.photoAvatar, { borderRadius: size / 2 }],
      ]}
    >
      {usePhoto ? (
        <Image
          source={{ uri: photoUri }}
          onError={() => setPhotoFailed(true)}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : preset ? (
        <Text
          style={[
            s.avatarText,
            {
              fontSize: size * 0.34,
              color: preset.textColor,
            },
          ]}
        >
          {initials}
        </Text>
      ) : (
        <>
          <Image source={images[variant]} style={{ width: size, height: size }} />
          <Text
            style={[
              s.avatarText,
              styles.positionabsolute,
              {
                fontSize: size * 0.34,
                color: variant === 'avatar' ? C.text : C.bg,
              },
            ]}
          >
            {initials}
          </Text>
        </>
      )}
    </View>
  );
}
export function Field({ label, icon, multiline, inputRef, ...props }) {
  return (
    <View style={s.fieldGroup}>
      {label && <Text style={s.label}>{label}</Text>}
      <View style={[s.inputRow, multiline && styles.alignItemsflexstart]}>
        {icon && (
          <Icon name={fieldIcons[icon] ?? 'book'} size={20} color={C.muted} />
        )}
        <TextInput
          ref={inputRef}
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
const fieldIcons = {
  '@': 'mail',
  '•': 'lock',
  N: 'user',
  C: 'graduation',
  Y: 'calendar',
  I: 'id',
  '#': 'id',
  search: 'search',
};
export function Chip({ label, selected, onPress, color = C.cyan }) {
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
export function Link({ label, onPress, danger = false }) {
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
export function Empty({ title, body }) {
  return (
    <View style={s.empty}>
      <Text style={s.name}>{title}</Text>
      <Text style={[s.muted, s.center]}>{body}</Text>
    </View>
  );
}
export function ErrorText({ value }) {
  return value ? (
    <Text accessibilityRole="alert" style={s.error}>
      {value}
    </Text>
  ) : null;
}

export function NoticeBanner({
  message,
  tone = 'error',
  actionLabel,
  actionAccessibilityLabel,
  onAction,
}) {
  const error = tone === 'error';
  return (
    <View style={[styles.notice, error ? styles.noticeError : styles.noticeInfo]}>
      <Icon
        name={error ? 'info' : 'check'}
        size={18}
        color={error ? C.danger : C.cyan}
      />
      <Text
        accessibilityRole={error ? 'alert' : undefined}
        accessibilityLiveRegion={tone === 'info' ? 'polite' : undefined}
        numberOfLines={3}
        style={[s.muted, styles.noticeMessage, error && styles.noticeErrorText]}
      >
        {message}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel || actionLabel}
          onPress={onAction}
          style={styles.noticeAction}
        >
          <Text style={styles.noticeActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  positionabsolute: {
    position: 'absolute',
  },
  alignItemsflexstart: {
    alignItems: 'flex-start',
  },
  photoAvatar: { overflow: 'hidden' },
  notice: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  noticeError: { borderLeftWidth: 3, borderLeftColor: C.danger },
  noticeInfo: { borderLeftWidth: 3, borderLeftColor: C.cyan },
  noticeMessage: { flex: 1, fontSize: 12, lineHeight: 17 },
  noticeErrorText: { color: C.text },
  noticeAction: {
    minWidth: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  noticeActionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: C.cyan,
  },
});
