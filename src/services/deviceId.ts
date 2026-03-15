import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'whato-device-id';

function generateId(): string {
  return 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const newId = generateId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  return newId;
}
