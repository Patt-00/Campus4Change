import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { C } from '../theme/colors';

const travelDistance = {
  forward: 18,
  backward: -18,
  tab: 0,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
});

export function RouteTransition({ children, direction = 'forward' }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [travelDistance[direction] ?? travelDistance.forward, 0],
  });

  return (
    <Animated.View
      style={[styles.container, { opacity: progress, transform: [{ translateX }] }]}
    >
      {children}
    </Animated.View>
  );
}
