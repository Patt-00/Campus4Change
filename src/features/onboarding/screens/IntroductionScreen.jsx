import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Link } from '../../../shared/components/UI';
import { Screen } from '../../../shared/components/Screen';
import { s } from '../../../shared/theme/styles';
import { introductionSlides } from '../data/slides';
import { IntroSlide } from '../components/IntroSlide';

export function IntroductionScreen({ go, back, onComplete }) {
  const [index, setIndex] = useState(0);
  const isLast = index === introductionSlides.length - 1;
  const slide = introductionSlides[index];
  const finish = onComplete || (() => go('Login'));

  return (
    <Screen title="Introduction" back={back}>
      <Text accessibilityLiveRegion="polite" style={[s.muted, s.center, styles.counter]}>
        {index + 1} / {introductionSlides.length}
      </Text>
      <IntroSlide key={index} slide={slide} />
      <View accessibilityLabel="Introduction slides" style={styles.dots}>
        {introductionSlides.map((item, slideIndex) => (
          <TouchableOpacity
            key={item.level}
            accessibilityRole="button"
            accessibilityLabel={`Go to introduction ${slideIndex + 1}`}
            accessibilityState={{ selected: slideIndex === index }}
            hitSlop={8}
            onPress={() => setIndex(slideIndex)}
            style={styles.dotTarget}
          >
            <View
              style={[
                styles.dot,
                slideIndex === index && styles.activeDot,
                slideIndex === index && { backgroundColor: slide.accent },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
      <AppButton
        title={isLast ? 'GET STARTED' : 'NEXT'}
        onPress={() => (isLast ? finish() : setIndex(index + 1))}
      />
      {!isLast && (
        <View style={styles.skip}>
          <Link label="Skip introduction" onPress={finish} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  counter: { marginBottom: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  dotTarget: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#35515d' },
  activeDot: { width: 22, borderRadius: 6 },
  skip: { alignItems: 'center', marginTop: 8 },
});

export default IntroductionScreen;
