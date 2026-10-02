import React from 'react';
import { StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// A normal full-screen View preserves tablet layout; insets protect system bars.
export function StatusBarSafeArea({ children, style }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        style,
        {
          paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0),
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar barStyle="light-content" />
      {children}
    </View>
  );
}
