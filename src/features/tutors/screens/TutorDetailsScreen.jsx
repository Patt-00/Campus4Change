import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Chip } from '../../../shared/components/UI';

import { s } from '../../../shared/theme/styles';

import { bookingSlots } from '../data/booking';
export function TutorDetailsScreen({ go, back, tutor, message }) {
  return (
    <Screen title="Tutor Profile" back={back}>
      <View style={styles.alignItemscenterpaddingTop8}>
        <Avatar name={tutor.name} size={72} />
        <Text style={[s.heading, styles.marginTop16]}>{tutor.name}</Text>
        <Text style={s.muted}>
          {[tutor.course, tutor.year].filter(Boolean).join(' • ')}
        </Text>
        {tutor.sample ? (
          <Text style={s.star}>
            ★ {tutor.rating || 'New'} • {tutor.sessions} sessions •{' '}
            {tutor.response}% response
          </Text>
        ) : (
          <Text style={s.muted}>Your tutor listing</Text>
        )}
        {tutor.sample && <Text style={s.muted}>Sample tutor · Demo data</Text>}
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
      {!tutor.own && (
        <>
          <Text style={s.section}>Booking times</Text>
          <View style={s.wrap}>
            {bookingSlots.map((time, slot) => (
              <Chip
                key={time.label}
                label={time.label}
                onPress={() =>
                  go({
                    page: 'Book Session',
                    tutorId: tutor.id,
                    slot,
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

          <AppButton
            title="MESSAGE TUTOR"
            outline
            onPress={() => message(tutor)}
          />
        </>
      )}
      {tutor.own && (
        <AppButton
          title="EDIT TUTOR PROFILE"
          onPress={() => go('Be a Tutor')}
        />
      )}
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
