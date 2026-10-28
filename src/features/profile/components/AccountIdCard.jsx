import React from 'react';
import {
  NativeModules,
  Text,
  TouchableOpacity,
  ToastAndroid,
  View,
} from 'react-native';
import { Icon } from '../../../shared/components/Icon';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

export function AccountIdCard({
  accountUuid,
  label = 'Campus4Change ID',
  showEnrollmentHint = false,
  style,
}) {
  if (!accountUuid) return null;

  async function copyId() {
    try {
      const copyToClipboard = NativeModules.CampusStorage?.copyToClipboard;
      if (typeof copyToClipboard !== 'function') {
        throw new Error('The clipboard is unavailable.');
      }
      await copyToClipboard('Campus4Change ID', accountUuid);
      ToastAndroid.show('ID copied', ToastAndroid.SHORT);
    } catch {
      ToastAndroid.show(
        'Long press the ID text to copy it',
        ToastAndroid.SHORT,
      );
    }
  }

  return (
    <View style={[s.card, styles.card, style]}>
      <View style={styles.topRow}>
        <View style={s.row}>
          <Icon name="id" size={20} color={C.cyan} />
          <Text style={[s.label, styles.label]}>{label}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Copy Campus4Change ID"
          onPress={copyId}
          style={styles.copyButton}
        >
          <Text style={[s.link, styles.copyText]}>Copy</Text>
        </TouchableOpacity>
      </View>
      <Text
        accessibilityLabel={'Campus4Change account ID ' + accountUuid}
        accessibilityHint="Long press to select and copy this ID."
        selectable
        style={styles.value}
      >
        {accountUuid}
      </Text>
      {showEnrollmentHint && (
        <Text style={[s.muted, styles.hint]}>
          Account reference only. It does not verify TIP enrollment.
        </Text>
      )}
    </View>
  );
}

const styles = {
  card: { marginVertical: 8, padding: 12 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { textTransform: 'uppercase', letterSpacing: 0.7 },
  value: {
    color: C.text,
    fontFamily: 'monospace',
    fontSize: 13,
    letterSpacing: 0.1,
    marginTop: 8,
    textAlign: 'center',
  },
  hint: { marginTop: 4, fontSize: 11 },
  copyButton: {
    minHeight: 44,
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  copyText: { fontSize: 13 },
};
