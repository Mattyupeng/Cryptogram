import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  WalletInfo,
  SupportedWalletType,
  ChainType,
  User
} from '@/types';
import { 
  initSodium, 
  generateKeyPair, 
  keyToHex, 
  privateKeyFromHex,
  getSignatureMessage 
} from '@/lib/encryption';
import { 
  isMetaMaskAvailable, 
  isPhantomAvailable, 
  connectMetaMask, 
  connectPhantom,
  disconnectWallet,
  signMessageWithMetaMask,
  signMessageWithPhantom
} from '@/lib/walletUtils';
import { apiRequest } from '@/lib/queryClient';

interface WalletState {
  wallet: WalletInfo | null;
  user: User | null;
  encryptionKeys: {
    publicKey: string; // Hex encoded
    privateKey: string; // Hex encoded
  } | null;
  isConnecting: boolean;
  error: string | null;
  
  // Actions
  connectWallet: (walletType: SupportedWalletType) => Promise<boolean>;
  disconnectCurrentWallet: () => Promise<void>;
  generateEncryptionKeys: () => Promise<void>;
  registerUser: () => Promise<User | null>;
  resetWalletState: () => void;
  
  // Utility getters
  getWalletIcon: () => JSX.Element | null;
  getWalletName: () => string;
  getWalletShortAddress: () => string;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      wallet: null,
      user: null,
      encryptionKeys: null,
      isConnecting: false,
      error: null,
      
      connectWallet: async (walletType: SupportedWalletType) => {
        set({ isConnecting: true, error: null });
        
        try {
          let walletInfo: WalletInfo | null = null;
          
          if (walletType === 'metamask' && isMetaMaskAvailable()) {
            walletInfo = await connectMetaMask();
          } else if (walletType === 'phantom' && isPhantomAvailable()) {
            walletInfo = await connectPhantom();
          } else {
            throw new Error(`${walletType} wallet is not available`);
          }
          
          if (walletInfo) {
            set({ wallet: walletInfo });
            
            // Generate encryption keys after wallet connection
            await get().generateEncryptionKeys();
            
            // Register user with the server
            const user = await get().registerUser();
            
            set({ isConnecting: false });
            return !!user;
          }
          
          set({ isConnecting: false });
          return false;
        } catch (error) {
          console.error('Error connecting wallet:', error);
          set({
            isConnecting: false,
            error: error instanceof Error ? error.message : 'Failed to connect wallet',
          });
          return false;
        }
      },
      
      disconnectCurrentWallet: async () => {
        const { wallet } = get();
        
        if (wallet) {
          try {
            await disconnectWallet(wallet.walletType);
            get().resetWalletState();
          } catch (error) {
            console.error('Error disconnecting wallet:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to disconnect wallet',
            });
          }
        }
      },
      
      generateEncryptionKeys: async () => {
        const { wallet } = get();
        
        if (!wallet) {
          set({ error: 'Wallet not connected' });
          return;
        }
        
        try {
          // Initialize libsodium
          await initSodium();
          
          // Generate message for signing
          const message = getSignatureMessage();
          
          // Sign message with wallet
          let signature: string | Uint8Array;
          if (wallet.walletType === 'metamask') {
            signature = await signMessageWithMetaMask(wallet.address, message);
          } else if (wallet.walletType === 'phantom') {
            signature = await signMessageWithPhantom(message);
          } else {
            throw new Error('Unsupported wallet type');
          }
          
          // Generate key pair
          const keyPair = generateKeyPair();
          
          // Store keys (hex encoded for persistence)
          set({
            encryptionKeys: {
              publicKey: keyToHex(keyPair.publicKey),
              privateKey: keyToHex(keyPair.privateKey),
            },
          });
        } catch (error) {
          console.error('Error generating encryption keys:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to generate encryption keys',
          });
        }
      },
      
      registerUser: async () => {
        const { wallet, encryptionKeys } = get();
        
        if (!wallet || !encryptionKeys) {
          set({ error: 'Wallet not connected or encryption keys not generated' });
          return null;
        }
        
        try {
          // Check if user already exists
          const checkResponse = await fetch(`/api/user/${wallet.address}`);
          
          if (checkResponse.ok) {
            // User exists, retrieve and set
            const existingUser = await checkResponse.json();
            set({ user: existingUser });
            return existingUser;
          }
          
          // Register new user
          const response = await apiRequest('POST', '/api/users', {
            walletAddress: wallet.address,
            ensName: wallet.ensName,
            publicKey: encryptionKeys.publicKey,
          });
          
          if (response.ok) {
            const user = await response.json();
            set({ user });
            return user;
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to register user');
          }
        } catch (error) {
          console.error('Error registering user:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to register user',
          });
          return null;
        }
      },
      
      resetWalletState: () => {
        set({
          wallet: null,
          user: null,
          error: null,
        });
      },
      
      getWalletIcon: () => {
        const { wallet } = get();
        if (!wallet) return null;
        
        const iconClassName = "h-5 w-5";
        
        switch (wallet.walletType) {
          case 'metamask':
            return (
              <svg className={iconClassName} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.6 4L13.4 9.6L14.8 6.2L20.6 4Z" fill="#E17726"/>
                <path d="M3.4 4L10.5 9.7L9.2 6.2L3.4 4Z" fill="#E27625"/>
                <path d="M17.8 17.6L15.7 21.1L20.1 22.5L21.4 17.7L17.8 17.6Z" fill="#E27625"/>
                <path d="M2.6 17.7L3.9 22.5L8.3 21.1L6.2 17.6L2.6 17.7Z" fill="#E27625"/>
                <path d="M8 12.5L6.8 14.8L11.2 15.1L11 10.2L8 12.5Z" fill="#E27625"/>
                <path d="M16 12.5L13 10.2L12.8 15.1L17.2 14.8L16 12.5Z" fill="#E27625"/>
                <path d="M8.3 21.1L10.8 19.6L8.7 17.7L8.3 21.1Z" fill="#E27625"/>
                <path d="M13.2 19.6L15.7 21.1L15.3 17.7L13.2 19.6Z" fill="#E27625"/>
              </svg>
            );
          case 'phantom':
            return (
              <svg className={iconClassName} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.9 7.7C17.6 7.1 18.6 7.1 19.3 7.7C20 8.3 20 9.3 19.3 9.9L10.7 17.7C10 18.3 9 18.3 8.3 17.7C7.6 17.1 7.6 16.1 8.3 15.5L16.9 7.7Z" fill="#AB9FF2"/>
                <path d="M12.6 4C13.3 3.4 14.3 3.4 15 4C15.7 4.6 15.7 5.6 15 6.2L6.4 14C5.7 14.6 4.7 14.6 4 14C3.3 13.4 3.3 12.4 4 11.8L12.6 4Z" fill="#AB9FF2"/>
                <path d="M14.8 11.4C15.5 10.8 16.5 10.8 17.2 11.4C17.9 12 17.9 13 17.2 13.6L12.6 17.8C11.9 18.4 10.9 18.4 10.2 17.8C9.5 17.2 9.5 16.2 10.2 15.6L14.8 11.4Z" fill="#AB9FF2"/>
              </svg>
            );
          default:
            return (
              <svg className={iconClassName} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M3 10H21" stroke="currentColor" strokeWidth="2"/>
              </svg>
            );
        }
      },
      
      getWalletName: () => {
        const { wallet } = get();
        if (!wallet) return 'Not Connected';
        
        switch (wallet.walletType) {
          case 'metamask':
            return 'MetaMask';
          case 'phantom':
            return 'Phantom';
          default:
            return 'Unknown Wallet';
        }
      },
      
      getWalletShortAddress: () => {
        const { wallet } = get();
        if (!wallet) return '';
        
        if (wallet.ensName) return wallet.ensName;
        
        const address = wallet.address;
        return address.slice(0, 6) + '...' + address.slice(-4);
      },
    }),
    {
      name: 'wallet-storage',
      // Only persist wallet connection and user info, not sensitive keys
      partialize: (state) => ({
        wallet: state.wallet,
        user: state.user,
      }),
    }
  )
);
