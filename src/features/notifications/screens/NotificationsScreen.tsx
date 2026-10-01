import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Empty, Link } from '../../../shared/components/UI';
import { IconBadge } from '../../../shared/components/Icon';
import type { Notice } from '../../../shared/data/types';
import { s } from '../../../shared/theme/styles';
import type { Navigate } from '../../../navigation/types';
export function NotificationsScreen({
  go,
  back,
  notices,
  read,
}: {
  go: Navigate;
  back: () => void;
  notices: Notice[];
  read: (id?: string) => void;
}) {
  return (
    <Screen title="Notifications" back={back}>
      {notices.some(n => !n.read) && (
        <Link label="Mark all as read" onPress={() => read()} />
      )}
      {notices.map(n => (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={n.title + (n.read ? ', read' : ', unread')}
          key={n.id}
          style={[s.row, styles.alignItemsflexstartpaddingVertical20]}
          onPress={() => {
            read(n.id);
            go(
              n.sessionId
                ? {
                    page: 'Session Details',
                    sessionId: n.sessionId,
                  }
                : n.groupId
                ? {
                    page: 'Group Details',
                    groupId: n.groupId,
                  }
                : 'Tutor Search',
            );
          }}
        >
          <IconBadge
            name={n.sessionId ? 'calendar' : n.groupId ? 'users' : 'bell'}
          />
          <View style={s.grow}>
            <Text style={[s.name, !n.read && s.blue]}>{n.title}</Text>
            <Text style={s.muted}>{n.body}</Text>
          </View>
          {!n.read && <Text style={s.blue}>●</Text>}
        </TouchableOpacity>
      ))}
      {!notices.length && (
        <Empty
          title="You're up to date"
          body="Your booking and group updates will appear here."
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  alignItemsflexstartpaddingVertical20: {
    alignItems: 'flex-start',
    paddingVertical: 20,
    borderBottomColor: '#1e3a46',
    borderBottomWidth: 1,
  },
});
