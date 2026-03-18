try {
  require('react-native-reanimated').setUpTests();
} catch (e) {
  // Worklets might not be available in all test environments
}

// Make Firebase native module detection pass in tests
const { NativeModules } = require('react-native');
NativeModules.RNFBAppModule = { NATIVE_FIREBASE_APPS: [] };
