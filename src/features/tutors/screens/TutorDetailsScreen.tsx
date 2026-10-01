import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Chip } from '../../../shared/components/UI';
import type { Tutor } from '../../../shared/data/types';
import { s } from '../../../shared/theme/styles';
import type { Navigate } from '../../../navigation/types';
export function TutorDetailsScreen({
  go,
  back,
  tutor,
  message,
}: {
  go: Navigate;
  back: () => void;
  tutor: Tutor;
  message: (tutor: Tutor) => void;
}) {
  return (
    <Screen title="Tutor Profile" back={back}>
      <View style={styles.alignItemscenterpaddingTop8}>
        <Avatar name={tutor.name} />
        <Text style={[s.heading, styles.marginTop16]}>{tutor.name}</Text>
        <Text style={s.muted}>
          {tutor.course} • {tutor.year}
        </Text>
        <Text style={s.star}>
          ★ {tutor.rating || 'New'} • {tutor.sessions} sessions •{' '}
          {tutor.response}% response
        </Text>
      </View>
      <View style={s.divider} />
      <Text style={[s.section, styles.marginTop0]}>Subjects</Text>
      <View style={s.wrap}>
        {tutor.subjects.map(x => (
          <Chip key={x} label={x} />
        ))}
      </View>
      <Text style={s.section}>About</Text>
      <Text style={s.text}>{tutor.about}</Text>
      <View style={s.gap} />
      <Text style={s.section}>Available times</Text>
      <View style={s.wrap}>
        {['2:00 PM', '4:30 PM', '6:00 PM'].map(time => (
          <Chip
            key={time}
            label={time}
            onPress={() =>
              go({
                page: 'Book Session',
                tutorId: tutor.id,
              })
            }
          />
        ))}
      </View>
      <View style={s.bigGap} />
      <AppButton
        title="BOOK SESSION"
        onPress={() =>
          go({
            page: 'Book Session',
            tutorId: tutor.id,
          })
        }
      />
      <AppButton title="MESSAGE TUTOR" outline onPress={() => message(tutor)} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  alignItemscenterpaddingTop8: {
    alignItems: 'center',
    paddingTop: 8,
  },
  marginTop16: {
    marginTop: 16,
  },
  marginTop0: {
    marginTop: 0,
  },
});
