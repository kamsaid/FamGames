import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Returns the base URL for the backend API.
 *
 * On web, it defaults to localhost:3000.
 * On native (Expo), it derives the host from the Metro bundler scriptURL and uses port 3000.
 */
export default function getApiUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001';
  }

  // 1) Try using Expo Constants manifest debuggerHost (Expo Go / dev client)
  const debuggerHost =
    Constants.manifest?.debuggerHost ||
    (Constants.manifest2 as any)?.debuggerHost ||
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