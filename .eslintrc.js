module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['__tests__/**/*.{js,jsx}'],
      env: {jest: true},
    },
  ],
};
