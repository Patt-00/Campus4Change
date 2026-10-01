import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { StatusBarSafeArea } from './StatusBarSafeArea';
import { AppHeader } from './AppHeader';
import { BottomTabs } from './BottomTabs';
import { s } from '../theme/styles';
import type { Navigate, Page } from '../../navigation/types';

export function Screen({
  title,
  children,
  back,
  go,
  tab,
  subtitle,
  scroll = true,
  onMenu,
  onNotifications,
  unread,
}: {
  title: string;
  children: ReactNode;
  back?: () => void;
  go?: Navigate;
  tab?: Page;
  subtitle?: ReactNode;
  scroll?: boolean;
  onMenu?: () => void;
  onNotifications?: () => void;
  unread?: number;
}) {
  return (
    <StatusBarSafeArea style={s.safe}>
      <KeyboardAvoidingView
        style={s.grow}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AppHeader
          title={title}
          onBack={back}
          onMenu={onMenu}
          onNotifications={onNotifications}
          unread={unread}
        />
        {subtitle}
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[s.width, s.body]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[s.width, s.body, s.grow]}>{children}</View>
        )}
        {go && tab && <BottomTabs go={go} active={tab} />}
      </KeyboardAvoidingView>
    </StatusBarSafeArea>
  );
}
