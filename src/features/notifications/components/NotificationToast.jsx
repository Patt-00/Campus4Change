import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconBadge } from '../../../shared/components/Icon';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

const TOAST_DURATION_MS = 8000;

export function NotificationToast({ notice, onDismiss, onOpen }) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const isDismissing = useRef(false);

  const dismiss = useCallback(() => {
    if (isDismissing.current) {
      return;
    }
    isDismissing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onDismiss?.();
      }
    });
  }, [onDismiss, progress]);

  useEffect(() => {
    const animation = Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 190,
      damping: 19,
      mass: 0.8,
    });
    animation.start();
    const timeout = setTimeout(dismiss, TOAST_DURATION_MS);
    return () => {
      clearTimeout(timeout);
      animation.stop();
      progress.stopAnimation();
    };
  }, [dismiss, progress]);

  if (!notice) {
    return null;
  }

  const accent =
    notice.tone === 'error'
      ? C.danger
      : notice.tone === 'success'
        ? C.green
        : C.cyan;
  const icon =
    notice.tone === 'error'
      ? 'info'
      : notice.tone === 'success'
        ? 'check'
        : 'mail';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.layer, { top: insets.top + 52 }]}
    >
      <Animated.View
        style={[
          styles.toast,
          {
            opacity: progress,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-42, 0],
                }),
              },
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open notification: ${notice.title}`}
          accessibilityHint="Opens this notification in Notifications."
          accessibilityLiveRegion="polite"
          onPress={() => {
            if (isDismissing.current) {
              return;
            }
            dismiss();
            onOpen?.(notice.destination || 'Notifications');
          }}
          style={({ pressed }) => [styles.open, pressed && styles.pressed]}
        >
          <IconBadge name={icon} color={accent} size={46} />
          <View style={styles.copy}>
            <Text numberOfLines={1} style={s.name}>
              {notice.title}
            </Text>
            <Text numberOfLines={2} style={s.muted}>
              {notice.message}
            </Text>
            <Text style={[styles.openHint, { color: accent }]}>
              VIEW NOTIFICATION
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          hitSlop={10}
          onPress={dismiss}
          style={styles.dismiss}
        >
          <Icon name="close" size={18} color={C.muted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 560,
    minHeight: 88,
    paddingLeft: 12,
    paddingRight: 4,
    backgroundColor: C.card,
    borderColor: '#315563',
    borderWidth: 1,
    borderRadius: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  open: {
    flex: 1,
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingRight: 4,
  },
  pressed: {
    opacity: 0.82,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  openHint: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.6,
    marginTop: 3,
  },
  dismiss: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
