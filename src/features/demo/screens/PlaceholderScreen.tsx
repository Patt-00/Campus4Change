import React from 'react';
import {Text, View} from 'react-native';
import {AppHeader} from '../../../shared/components/AppHeader';
import {BottomTabs} from '../../../shared/components/BottomTabs';
import {StatusBarSafeArea} from '../../../shared/components/StatusBarSafeArea';
import {demoProfileName, latestMessage, nextSession} from '../../../shared/data/demo';
import {s} from '../../../shared/theme/styles';
import type {Navigate, Page} from '../../../navigation/types';

type PlaceholderPage = Extract<Page, 'Sessions' | 'Messages' | 'Profile'>;

export function PlaceholderScreen({
  page,
  go,
}: {
  page: PlaceholderPage;
  go: Navigate;
}) {
  return (
    <StatusBarSafeArea style={s.safe}>
      <AppHeader title={page} logged onHome={() => go('Home')} />
      <View style={s.pad}>
        <Text style={s.section}>{page}</Text>
        <View style={s.card}>
          <Text style={s.name}>
            {page === 'Messages' ? latestMessage.sender : nextSession.subject}
          </Text>
          <Text style={s.muted}>
            {page === 'Messages' ? latestMessage.preview : nextSession.time}
          </Text>
        </View>
        <View style={s.card}>
          <Text style={s.name}>
            {page === 'Profile' ? demoProfileName : nextSession.topic}
          </Text>
          <Text style={s.muted}>Campus4Change demo content</Text>
        </View>
      </View>
      <BottomTabs go={go} />
    </StatusBarSafeArea>
  );
}
