import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Returns the base URL for the backend API (port 3001).
 *
 * - On web, always http://localhost:3001
 * - On iOS simulator, http://localhost:3001
 * - On Android emulator, http://10.0.2.2:3001
 * - On Expo Go / dev client, derive host from manifest.debuggerHost
 */
export default function getApiUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001';
  }

  // iOS simulator (localhost on host machine)
  if (Platform.OS === 'ios' && !Constants.isDevice) {
    return 'http://localhost:3001';
  }

  // Android emulator (special localhost alias)
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return 'http://10.0.2.2:3001';
  }

  // 1) Expo Go or custom dev client: derive host from debuggerHost in manifest
  const debuggerHost =
    Constants.manifest?.debuggerHost ??
    (Constants.manifest2 as any)?.debuggerHost ??
    (Constants.manifest2 as any)?.packagerOpts?.packagerHost;
  if (debuggerHost) {
    const [host] = debuggerHost.split(':');
    if (host) {
      return `http://${host}:3001`;
    }
  }

  // 2) Fallback: extract host from Metro scriptURL (bare React Native)
  const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;
  if (scriptURL) {
    const match = scriptURL.match(/\/\/(.*?):\d+\//);
    const host = match?.[1];
    if (host) {
      return `http://${host}:3001`;
    }
  }

  // 3) Last resort: localhost (iOS simulator)
  return 'http://localhost:3001';
}