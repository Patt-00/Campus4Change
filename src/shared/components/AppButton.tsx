import React from 'react';
import {Text, TouchableOpacity} from 'react-native';
import {s} from '../theme/styles';

export function AppButton({title, onPress}: {title: string; onPress: () => void}) {
  return (
    <TouchableOpacity onPress={onPress} style={s.btn}>
      <Text style={s.btnText}>{title}</Text>
    </TouchableOpacity>
  );
}
