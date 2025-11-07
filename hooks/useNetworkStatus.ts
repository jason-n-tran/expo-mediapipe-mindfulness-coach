/**
 * useNetworkStatus Hook
 * Detects network connectivity status using @react-native-community/netinfo
 * Provides offline indicator state
 */

import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface UseNetworkStatusReturn {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  isOffline: boolean;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [networkState, setNetworkState] = useState<NetInfoState | null>(null);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState(state);
    });

    // Fetch initial state
    NetInfo.fetch().then(state => {
      setNetworkState(state);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Determine if device is offline
  const isOffline = networkState?.isConnected === false || 
                    networkState?.isInternetReachable === false;

  return {
    isConnected: networkState?.isConnected ?? null,
    isInternetReachable: networkState?.isInternetReachable ?? null,
    connectionType: networkState?.type ?? null,
    isOffline,
  };
}
