import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {s} from '../theme/styles';

export function AppHeader({
  title,
  logged,
  onHome,
}: {
  title: string;
  logged: boolean;
  onHome: () => void;
}) {
  return (
    <View style={s.header}>
      {logged && (
        <TouchableOpacity onPress={onHome}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
      )}
      <Text style={s.title}>{title}</Text>
    </View>
  );
}
