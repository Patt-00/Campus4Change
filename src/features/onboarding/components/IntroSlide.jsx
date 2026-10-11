import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { s } from '../../../shared/theme/styles';

export function IntroSlide({ slide }) {
  return (
    <View accessibilityLabel={slide.level} style={styles.container}>
      <View style={styles.art}>
        <Image source={slide.image} resizeMode="contain" style={styles.image} />
      </View>
      <Text style={[styles.level, { color: slide.accent }]}>{slide.level}</Text>
      <Text accessibilityRole="header" style={[s.heading, styles.title]}>
        {slide.title}
      </Text>
      <Text style={[s.muted, s.center, styles.description]}>{slide.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 8 },
  art: {
    width: '100%',
    height: 230,
    borderRadius: 20,
    backgroundColor: '#10232f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  image: { width: '100%', height: '100%' },
  level: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    marginBottom: 10,
  },
  title: { textAlign: 'center', marginBottom: 10 },
  description: { maxWidth: 380 },
});

export default IntroSlide;
