import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Field } from '../../../shared/components/UI';
import { s } from '../../../shared/theme/styles';
export function StudyRoomScreen({
  title,
  back,
  finish,
  initialNotes = '',
  session = false,
  onDraft,
}) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [endsAt, setEndsAt] = useState(null);
  const [notes, setNotes] = useState(initialNotes);
  useEffect(() => {
    if (!endsAt) {
      return;
    }
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSeconds(left);
      if (left === 0) {
        setEndsAt(null);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [endsAt]);
  return (
    <Screen
      title="Study Room"
      back={() => {
        finish(notes, false);
        back();
      }}
    >
      <Text style={[s.heading, s.center]}>{title}</Text>
      <Text style={[s.muted, s.center, styles.marginTop12]}>
        Local focus room • no live participants or video
      </Text>
      <View style={[s.card, styles.alignItemscentermarginTop32]}>
        <Text style={s.name}>Focus timer</Text>
        <Text style={[s.heading, s.blue, styles.fontSize56lineHeight72]}>
          {String(Math.floor(seconds / 60)).padStart(2, '0')}:
          {String(seconds % 60).padStart(2, '0')}
        </Text>
        <AppButton
          title={
            endsAt
              ? 'PAUSE TIMER'
              : seconds === 0
              ? 'RESTART TIMER'
              : 'START TIMER'
          }
          onPress={() => {
            if (endsAt) {
              setSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
              setEndsAt(null);
            } else {
              const remaining = seconds || 1500;
              setSeconds(remaining);
              setEndsAt(Date.now() + remaining * 1000);
            }
          }}
        />

        <AppButton
          title="RESET TIMER"
          outline
          onPress={() => {
            setEndsAt(null);
            setSeconds(1500);
          }}
        />
      </View>
      <Text style={s.section}>Study notes</Text>
      <Field
        placeholder="Write what you learned..."
        multiline
        value={notes}
        onChangeText={value => {
          setNotes(value);
          onDraft(value);
        }}
      />

      <AppButton
        title="SAVE NOTES AND LEAVE"
        outline
        onPress={() => {
          finish(notes, false);
          back();
        }}
      />

      {session && (
        <AppButton
          title="COMPLETE SESSION"
          onPress={() => {
            finish(notes, true);
            back();
          }}
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  marginTop12: {
    marginTop: 12,
  },
  alignItemscentermarginTop32: {
    alignItems: 'center',
    marginTop: 32,
    padding: 24,
  },
  fontSize56lineHeight72: {
    fontSize: 56,
    lineHeight: 72,
    marginVertical: 16,
  },
});
