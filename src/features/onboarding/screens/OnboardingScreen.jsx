import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
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
  const logoEntrance = useRef(new Animated.Value(0)).current;
  const taglineEntrance = useRef(new Animated.Value(0)).current;
  const actionEntrance = useRef(new Animated.Value(0)).current;
  const footerEntrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;

    const showImmediately = () => {
      logoEntrance.setValue(1);
      taglineEntrance.setValue(1);
      actionEntrance.setValue(1);
      footerEntrance.setValue(1);
    };

    const playEntrance = () => {
      if (!active) return;
      Animated.parallel([
        Animated.timing(logoEntrance, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(taglineEntrance, {
          toValue: 1,
          duration: 420,
          delay: 120,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(actionEntrance, {
          toValue: 1,
          duration: 380,
          delay: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(footerEntrance, {
          toValue: 1,
          duration: 350,
          delay: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (!active) return;
        if (reduceMotion) showImmediately();
        else playEntrance();
      })
      .catch(playEntrance);

    return () => {
      active = false;
      logoEntrance.stopAnimation();
      taglineEntrance.stopAnimation();
      actionEntrance.stopAnimation();
      footerEntrance.stopAnimation();
    };
  }, [actionEntrance, footerEntrance, logoEntrance, taglineEntrance]);

  return (
    <StatusBarSafeArea style={s.safe}>
      <ScrollView
        contentContainerStyle={[
          s.width,
          styles.body,
          { minHeight: Math.max(620, height - 60) },
        ]}
      >
        <Animated.View
          style={[
            styles.logo,
            { marginTop: Math.max(40, height * 0.12) },
            {
              opacity: logoEntrance,
              transform: [
                {
                  scale: logoEntrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Image
            source={require('../../../shared/assets/campus4change-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
            accessible
            accessibilityLabel="Campus4Change logo"
          />
        </Animated.View>
        <Animated.View
          style={{
            ...styles.tagline,
            opacity: taglineEntrance,
            transform: [
              {
                translateY: taglineEntrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        >
          <Text style={[s.muted, s.center]}>Learn together. Grow together.</Text>
          <Text style={[s.muted, s.center]}>Change your campus.</Text>
        </Animated.View>
        <View style={s.grow} />
        <Animated.View
          style={[
            styles.buttonEntrance,
            {
              opacity: actionEntrance,
              transform: [
                {
                  translateY: actionEntrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <AppButton
            title="GET STARTED"
            onPress={() => go('Introduction')}
            style={styles.button}
          />
        </Animated.View>

        <Animated.Text
          style={[
            styles.footer,
            {
              opacity: footerEntrance,
              transform: [
                {
                  translateY: footerEntrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 0],
                  }),
                },
              ],
            },
          ]}
        >
          Find help. Share knowledge. Make an impact.
        </Animated.Text>
      </ScrollView>
    </StatusBarSafeArea>
  );
}
const styles = StyleSheet.create({
  body: { paddingHorizontal: 28, paddingBottom: 44, alignItems: 'center' },
  logo: { width: 280, height: 280 },
  logoImage: { width: '100%', height: '100%' },
  tagline: { alignItems: 'center' },
  buttonEntrance: { width: '100%' },
  button: { width: '100%' },
  footer: {
    fontFamily: 'Inter-Regular',
    color: C.muted,
    fontSize: 12,
    marginTop: 18,
    textAlign: 'center',
  },
});
