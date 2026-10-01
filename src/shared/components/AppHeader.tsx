import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../theme/colors';
import { s } from '../theme/styles';

export function AppHeader({
  title,
  onBack,
  onMenu,
  onNotifications,
  unread = 0,
}: {
  title: string;
  onBack?: () => void;
  onMenu?: () => void;
  onNotifications?: () => void;
  unread?: number;
}) {
  return (
    <View style={[s.width, styles.header]}>
      {(onBack || onMenu) && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={onMenu ? 'Open menu' : 'Back'}
          hitSlop={8}
          onPress={onMenu ?? onBack}
          style={styles.back}
        >
          <Text style={styles.icon}>{onMenu ? '☰' : '‹'}</Text>
        </TouchableOpacity>
      )}
      {title === 'Campus4Change' ? (
        <Text style={styles.brand}>
          Campus<Text style={s.blue}>4</Text>Change
        </Text>
      ) : (
        <Text numberOfLines={2} style={styles.title}>
          {title}
        </Text>
      )}
      {onNotifications && (
        <TouchableOpacity
          onPress={onNotifications}
          accessibilityRole="button"
          accessibilityLabel={'Notifications, ' + unread + ' unread'}
          style={styles.notification}
        >
          <Text style={s.blue}>●</Text>
          {unread > 0 && <Text style={styles.count}>{unread}</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  back: { minWidth: 24, minHeight: 40, justifyContent: 'center' },
  icon: { fontSize: 31, color: C.text, lineHeight: 36 },
  title: {
    flex: 1,
    fontFamily: 'Inter-Bold',
    color: C.text,
    fontSize: 20,
    lineHeight: 26,
  },
  brand: { flex: 1, fontFamily: 'Inter-Bold', color: C.text, fontSize: 16 },
  notification: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  count: { fontFamily: 'Inter-Bold', fontSize: 10, color: C.cyan },
});
