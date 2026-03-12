try {
  require('react-native-reanimated').setUpTests();
} catch (e) {
  // Worklets might not be available in all test environments
}
