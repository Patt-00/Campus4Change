import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { C } from '../theme/colors';

const icons = {
  home: require('../assets/icons/home.png'),
  calendar: require('../assets/icons/calendar.png'),
  plus: require('../assets/icons/plus.png'),
  chat: require('../assets/icons/chat.png'),
  user: require('../assets/icons/user.png'),
  users: require('../assets/icons/users.png'),
  bell: require('../assets/icons/bell.png'),
  menu: require('../assets/icons/menu.png'),
  left: require('../assets/icons/left.png'),
  right: require('../assets/icons/right.png'),
  search: require('../assets/icons/search.png'),
  book: require('../assets/icons/book.png'),
  graduation: require('../assets/icons/graduation.png'),
  close: require('../assets/icons/close.png'),
  info: require('../assets/icons/info.png'),
  mail: require('../assets/icons/mail.png'),
  lock: require('../assets/icons/lock.png'),
  id: require('../assets/icons/id.png'),
  check: require('../assets/icons/check.png'),
};

export function Icon({ name, size = 24, color = C.text }) {
  return (
    <Image
      accessible={false}
      source={icons[name]}
      style={{ width: size, height: size, tintColor: color }}
    />
  );
}

export function IconBadge({ name, color = C.cyan }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '18' }]}>
      <Icon name={name} color={color} />
    </View>
  );
}
const styles = StyleSheet.create({
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
