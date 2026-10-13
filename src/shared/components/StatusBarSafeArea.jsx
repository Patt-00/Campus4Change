import React from 'react';
import { StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Android's content root is already below the status bar, so use the provider
// inset instead of adding StatusBar.currentHeight a second time.
export function StatusBarSafeArea({ children, style }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        style,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar barStyle="light-content" />
      {children}
    </View>
  );
}
