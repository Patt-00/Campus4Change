import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { dateLabel, timeRange } from '../../../shared/data/utils';

import { s } from '../../../shared/theme/styles';

import { Icon } from '../../../shared/components/Icon';
import { C } from '../../../shared/theme/colors';

export function BookingConfirmedScreen({ go, session, tutor }) {
  const request = session?.shared && session.status === 'Pending';
  return (
    <Screen title={request ? 'Request sent' : 'Booking confirmed'}>
      <View style={styles.success}>
        <Icon name="check" size={72} color={C.green} />
      </View>
      <Text style={[s.heading, s.center, styles.marginTop24]}>
        {request ? 'Request sent' : 'Added to your schedule'}
      </Text>
      <Text style={[s.muted, s.center, styles.marginTop8]}>
        {request
          ? `${tutor.name} can review your ${session.subject} request in Sessions. It stays pending until they respond.`
          : `Your ${session.subject} session with ${tutor.name.split(' ')[0]} is saved in your private schedule.`}
      </Text>
      <View style={[s.card, styles.marginTop36padding20]}>
        <Text style={s.name}>{session.subject}</Text>
        <View style={s.gap} />
        <Text style={s.muted}>
          {dateLabel(session.startsAt)}, {timeRange(session.startsAt)}
        </Text>
        <Text style={s.muted}>
          {request
            ? 'Waiting for tutor response'
            : 'The tutor has not been notified.'}
        </Text>
      </View>
      <View style={s.bigGap} />
      {request ? (
        <AppButton
          title="VIEW MY REQUESTS"
          onPress={() => go({ page: 'Sessions', filter: 'Requests' })}
        />
      ) : (
        <>
          <AppButton title="BACK TO HOME" onPress={() => go('Home')} />
          <AppButton
            title="VIEW SESSION DETAILS"
            outline
            onPress={() =>
              go({
                page: 'Session Details',
                sessionId: session.id,
              })
            }
          />
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  success: { alignItems: 'center', marginTop: 40 },
  marginTop24: {
    marginTop: 24,
  },
  marginTop8: {
    marginTop: 8,
  },
  marginTop36padding20: {
    marginTop: 36,
    padding: 20,
    minHeight: 124,
  },
});
