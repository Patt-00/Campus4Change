import { C } from '../src/shared/theme/colors';

function luminance(hex) {
  const [red, green, blue] = hex
    .slice(1)
    .match(/.{2}/g)
    .map(channel => parseInt(channel, 16) / 255)
    .map(value =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test.each(['text', 'muted', 'cyan', 'green', 'yellow', 'purple', 'danger'])(
  '%s text meets WCAG AA contrast on dark surfaces',
  color => {
    for (const surface of ['bg', 'card', 'chip']) {
      expect(contrastRatio(C[color], C[surface])).toBeGreaterThanOrEqual(4.5);
    }
  },
);

test('dark button text meets WCAG AA contrast on the cyan fill', () => {
  expect(contrastRatio(C.bg, C.cyan)).toBeGreaterThanOrEqual(4.5);
});
