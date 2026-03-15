import { getDeviceId } from '../../src/services/deviceId';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('getDeviceId', () => {
  it('returns existing device ID if stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('existing-id-123');
    const id = await getDeviceId();
    expect(id).toBe('existing-id-123');
  });

  it('generates and stores new ID if none exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const id = await getDeviceId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('whato-device-id', id);
  });
});
