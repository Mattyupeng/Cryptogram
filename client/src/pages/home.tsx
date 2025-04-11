import React, { useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useWallet } from '@/hooks/useWallet';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Wallet, LockIcon } from 'lucide-react';

const HomePage: React.FC = () => {
  const { wallet, user, connectWallet, isMetaMaskAvailable, isPhantomAvailable } = useWallet();
  const { connected: wsConnected } = useWebSocket();
  const { toast } = useToast();
  
  // Show welcome/connect wallet screen if no wallet is connected
  if (!wallet || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-xl shadow-lg border border-border">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to CryptoChat</h2>
            <p className="text-muted-foreground mb-6">
              Secure, wallet-based messaging with built-in crypto transfers
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <LockIcon className="h-4 w-4" />
                <span>End-to-end encrypted messaging</span>
              </div>
              
              {/* Temporarily disabled for development */}
              <Button 
                onClick={() => {
                  toast({
                    title: "Wallet connection disabled",
                    description: "Wallet connection is temporarily disabled for development purposes",
                    variant: "default",
                  });
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <Wallet className="h-5 w-5" />
                Connect Wallet to Start (Disabled)
              </Button>
              
              {/* DEVELOPMENT ONLY: Skip wallet connection button */}
              <Button 
                onClick={() => {
                  // Simulate a successful wallet connection for development
                  // This creates a mock user in localStorage
                  const mockWallet = {
                    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                    ensName: 'dev.eth',
                    walletType: 'metamask',
                    chain: 'ethereum'
                  };
                  
                  localStorage.setItem('wallet-storage', JSON.stringify({
                    state: {
                      wallet: mockWallet,
                      user: {
                        id: 1,
                        walletAddress: mockWallet.address,
                        ensName: mockWallet.ensName,
                        publicKey: 'mock-public-key',
                        lastSeen: new Date().toISOString(),
                        createdAt: new Date().toISOString()
                      }
                    }
                  }));
                  
                  // Reload to apply mock wallet
                  window.location.reload();
                }}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 mt-2"
              >
                <LockIcon className="h-5 w-5" />
                Development Mode: Skip Wallet
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                No email, phone number or password required.<br />
                Just connect your wallet and start chatting.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show the main app layout once connected
  return <AppLayout />;
};

export default HomePage;
