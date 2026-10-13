import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { StatusBarSafeArea } from '../../../shared/components/StatusBarSafeArea';
import { s } from '../../../shared/theme/styles';
import { C } from '../../../shared/theme/colors';

export function OnboardingScreen({ go }) {
  const { height } = useWindowDimensions();
  return (
    <StatusBarSafeArea style={s.safe}>
      <ScrollView
        contentContainerStyle={[
          s.width,
          styles.body,
          { minHeight: Math.max(620, height - 60) },
        ]}
      >
        <View style={[styles.logo, { marginTop: Math.max(40, height * 0.12) }]}>
          <Image
            source={require('../../../shared/assets/campus4change-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
            accessible
            accessibilityLabel="Campus4Change logo"
          />
        </View>
        <Text style={[s.muted, s.center]}>Learn together. Grow together.</Text>
        <Text style={[s.muted, s.center]}>Change your campus.</Text>
        <View style={s.grow} />
        <AppButton
          title="GET STARTED"
          onPress={() => go('Introduction')}
          style={styles.button}
        />

        <Text style={styles.footer}>
          Find help. Share knowledge. Make an impact.
        </Text>
      </ScrollView>
    </StatusBarSafeArea>
  );
}
const styles = StyleSheet.create({
  body: { paddingHorizontal: 28, paddingBottom: 44, alignItems: 'center' },
  logo: { width: 280, height: 280 },
  logoImage: { width: '100%', height: '100%' },
  button: { width: '100%' },
  footer: {
    fontFamily: 'Inter-Regular',
    color: C.muted,
    fontSize: 12,
    marginTop: 18,
    textAlign: 'center',
  },
});
