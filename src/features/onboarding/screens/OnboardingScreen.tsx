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
import type { Navigate } from '../../../navigation/types';
import { Icon } from '../../../shared/components/Icon';

export function OnboardingScreen({ go }: { go: Navigate }) {
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
        <View style={[styles.logo, { marginTop: Math.max(55, height * 0.17) }]}>
          <Image
            source={require('../../../shared/assets/logo-circle.png')}
            style={styles.circle}
          />
          <View style={styles.house}>
            <Icon name="home" size={64} color={C.cyan} />
          </View>
          <View style={styles.mark}>
            <Image
              source={require('../../../shared/assets/logo-mark.png')}
              style={styles.markImage}
            />
            <Text style={s.avatarText}>C</Text>
          </View>
        </View>
        <Text style={styles.brand}>
          Campus<Text style={s.blue}>4</Text>Change
        </Text>
        <Text style={[s.muted, s.center]}>Learn together. Grow together.</Text>
        <Text style={[s.muted, s.center]}>Change your campus.</Text>
        <View style={s.grow} />
        <AppButton
          title="GET STARTED"
          onPress={() => go('Login')}
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
  logo: { width: 210, height: 210 },
  circle: { width: 210, height: 210 },
  house: {
    position: 'absolute',
    top: 20,
    left: 50,
    width: 110,
    alignItems: 'center',
  },
  mark: {
    position: 'absolute',
    top: 65,
    left: 81,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markImage: { position: 'absolute', width: 28, height: 28 },
  brand: {
    fontFamily: 'Inter-Bold',
    fontSize: 30,
    color: C.text,
    marginTop: 28,
    marginBottom: 8,
  },
  button: { width: '100%' },
  footer: {
    fontFamily: 'Inter-Regular',
    color: C.muted,
    fontSize: 12,
    marginTop: 18,
    textAlign: 'center',
  },
});
