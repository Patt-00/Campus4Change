import React, {type ReactNode} from 'react';
import {StatusBar, type StyleProp, View, type ViewStyle} from 'react-native';

// Preserve the prototype's Android status-bar padding behavior.
export function StatusBarSafeArea({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[style, {paddingTop: StatusBar.currentHeight ?? 0}]}>
      {children}
    </View>
  );
}
