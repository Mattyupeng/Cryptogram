import { useState, useEffect, useCallback } from 'react';
import { useWalletStore } from '@/store/walletStore';
import { SupportedWalletType } from '@/types';

export function useWallet() {
  const {
    wallet,
    user,
    encryptionKeys,
    isConnecting,
    error,
    connectWallet,
    disconnectCurrentWallet,
    resetWalletState,
    getWalletIcon,
    getWalletName,
    getWalletShortAddress,
  } = useWalletStore();
  
  const [isMetaMaskAvailable, setIsMetaMaskAvailable] = useState(false);
  const [isPhantomAvailable, setIsPhantomAvailable] = useState(false);
  
  useEffect(() => {
    // Check wallet availability
    setIsMetaMaskAvailable(typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask);
    setIsPhantomAvailable(typeof window !== 'undefined' && window.solana && window.solana.isPhantom);
  }, []);
  
  const handleConnectWallet = useCallback(async (walletType: SupportedWalletType) => {
    try {
      const success = await connectWallet(walletType);
      return success;
    } catch (err) {
      console.error('Error connecting wallet:', err);
      return false;
    }
  }, [connectWallet]);
  
  const handleDisconnectWallet = useCallback(async () => {
    await disconnectCurrentWallet();
  }, [disconnectCurrentWallet]);
  
  return {
    wallet,
    user,
    encryptionKeys,
    isConnecting,
    error,
    isMetaMaskAvailable,
    isPhantomAvailable,
    connectWallet: handleConnectWallet,
    disconnectWallet: handleDisconnectWallet,
    resetWalletState,
    getWalletIcon,
    getWalletName,
    getWalletShortAddress,
  };
}
