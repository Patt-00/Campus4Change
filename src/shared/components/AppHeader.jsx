import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../theme/colors';
import { s } from '../theme/styles';
import { Icon } from './Icon';

export function AppHeader({
  title,
  onBack,
  onMenu,
  onNotifications,
  unread = 0,
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
          <Icon name={onMenu ? 'menu' : 'left'} />
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
          <Icon name="bell" color={C.cyan} />
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.count}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
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
  back: { minWidth: 36, minHeight: 44, justifyContent: 'center' },
  title: {
    flex: 1,
    fontFamily: 'Inter-Bold',
    color: C.text,
    fontSize: 20,
    lineHeight: 26,
  },
  brand: { flex: 1, fontFamily: 'Inter-Bold', color: C.text, fontSize: 16 },
  notification: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: -4,
    minWidth: 18,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { fontFamily: 'Inter-Bold', fontSize: 10, color: C.bg },
});
