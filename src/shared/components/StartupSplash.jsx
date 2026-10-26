import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBarSafeArea } from './StatusBarSafeArea';
import { C } from '../theme/colors';
import { s } from '../theme/styles';

export function StartupSplash({ message, onComplete }) {
  const logoProgress = useRef(new Animated.Value(0)).current;
  const taglineProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    const finishImmediately = () => {
      logoProgress.setValue(1);
      taglineProgress.setValue(1);
      onComplete();
    };
    const animate = () => {
      if (!active) {
        return;
      }
      Animated.parallel([
        Animated.timing(logoProgress, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(taglineProgress, {
          toValue: 1,
          duration: 420,
          delay: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && active) {
          onComplete();
        }
      });
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotion => {
        if (!active) {
          return;
        }
        if (reduceMotion) {
          finishImmediately();
        } else {
          animate();
        }
      })
      .catch(animate);

    return () => {
      active = false;
      logoProgress.stopAnimation();
      taglineProgress.stopAnimation();
    };
  }, [logoProgress, onComplete, taglineProgress]);

  return (
    <StatusBarSafeArea style={s.safe}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoFrame,
            {
              opacity: logoProgress,
              transform: [
                {
                  scale: logoProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.84, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Image
            source={require('../assets/campus4change-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessible
            accessibilityLabel="Campus4Change logo"
          />
        </Animated.View>
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineProgress,
              transform: [
                {
                  translateY: taglineProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          Learn together. Grow together.
        </Animated.Text>
        <View style={styles.loading}>
          <ActivityIndicator color={C.cyan} size="small" />
          <Text style={[s.muted, s.center, styles.message]}>{message}</Text>
        </View>
      </View>
    </StatusBarSafeArea>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoFrame: { width: 248, height: 248 },
  logo: { width: '100%', height: '100%' },
  tagline: {
    marginTop: 2,
    color: C.text,
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    textAlign: 'center',
  },
  loading: { alignItems: 'center', marginTop: 36 },
  message: { marginTop: 12 },
});
