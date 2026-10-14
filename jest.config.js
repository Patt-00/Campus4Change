module.exports = {
  preset: '@react-native/jest-preset',
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/scripts/'],
  transform: {
    '^.+\\.jsx$': 'babel-jest',
  },
};
