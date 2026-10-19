import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Icon } from '../../../shared/components/Icon';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';
import { version } from '../../../../package.json';

function SettingsRow({ label, description, onPress, last = false }) {
  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[s.row, styles.row]}
        onPress={onPress}
      >
        <View style={s.grow}>
          <Text style={s.name}>{label}</Text>
          <Text style={s.muted}>{description}</Text>
        </View>
        <Icon name="right" size={18} color={C.muted} />
      </TouchableOpacity>
      {!last && <View style={styles.divider} />}
    </>
  );
}

export function SettingsScreen({ back, go }) {
  return (
    <Screen title="Settings" back={back}>
      <Text style={s.section}>Learning</Text>
      <View style={[s.card, styles.card]}>
        <SettingsRow
          label="Learning preferences"
          description="Choose the courses and topics you want to study."
          onPress={() => go('Preferences')}
          last
        />
      </View>

      <Text style={s.section}>About</Text>
      <View style={[s.card, styles.card]}>
        <SettingsRow
          label="About Campus4Change"
          description="App version, data storage, and service details."
          onPress={() => go('About')}
          last
        />
      </View>
      <Text style={[s.muted, s.center, styles.version]}>
        Campus4Change {version}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 4, paddingHorizontal: 12 },
  row: { minHeight: 64, paddingVertical: 10 },
  divider: { height: 1, backgroundColor: C.border },
  version: { marginTop: 12 },
});
