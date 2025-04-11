import React, { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SupportedWalletType } from '@/types';
import { Wallet, LogOut } from 'lucide-react';

const WalletConnector: React.FC = () => {
  const { 
    wallet, 
    isConnecting,
    isMetaMaskAvailable,
    isPhantomAvailable,
    connectWallet,
    disconnectWallet,
    getWalletIcon,
    getWalletName,
    getWalletShortAddress,
  } = useWallet();
  const { toast } = useToast();
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  
  // Handle connect wallet button click
  const handleConnectClick = () => {
    if (!isMetaMaskAvailable && !isPhantomAvailable) {
      toast({
        title: "No wallets detected",
        description: "Please install MetaMask or Phantom wallet extension",
        variant: "destructive",
      });
      return;
    }
    
    setConnectDialogOpen(true);
  };
  
  // Handle wallet selection
  const handleSelectWallet = async (walletType: SupportedWalletType) => {
    try {
      const success = await connectWallet(walletType);
      
      if (success) {
        setConnectDialogOpen(false);
        toast({
          title: "Wallet connected",
          description: `Successfully connected to ${getWalletName()}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Connection failed",
          description: "Failed to connect wallet. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Handle disconnect wallet
  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      toast({
        title: "Wallet disconnected",
        description: "Your wallet has been disconnected",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Disconnect error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Wallet not connected state
  if (!wallet) {
    return (
      <div id="wallet-disconnected">
        <Button 
          onClick={handleConnectClick}
          className="w-full flex items-center justify-center gap-2"
          disabled={isConnecting}
        >
          <Wallet className="h-5 w-5" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
        
        <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Wallet</DialogTitle>
              <DialogDescription>
                Choose a wallet to connect. No email or password required.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <Button
                onClick={() => handleSelectWallet('metamask')}
                disabled={!isMetaMaskAvailable || isConnecting}
                className="flex items-center justify-start gap-3 h-14"
                variant={isMetaMaskAvailable ? "outline" : "ghost"}
              >
                <svg className="h-8 w-8" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32.9582 1L19.8241 10.7183L22.2665 5.09082L32.9582 1Z" fill="#E17726"/>
                  <path d="M2.65302 1L15.6607 10.8487L13.3565 5.0908L2.65302 1Z" fill="#E27625"/>
                  <path d="M28.2311 23.5396L24.718 28.8849L32.2002 30.9377L34.3273 23.6531L28.2311 23.5396Z" fill="#E27625"/>
                  <path d="M1.27448 23.6531L3.38798 30.9377L10.8552 28.8849L7.36971 23.5396L1.27448 23.6531Z" fill="#E27625"/>
                  <path d="M10.4505 14.5149L8.39951 17.6507L15.7701 17.9925L15.5114 10.0532L10.4505 14.5149Z" fill="#E27625"/>
                  <path d="M25.1625 14.5149L19.9805 10.0532L19.8056 17.9925L27.1602 17.6507L25.1625 14.5149Z" fill="#E27625"/>
                  <path d="M10.8555 28.8846L15.3115 26.7374L11.4591 23.7088L10.8555 28.8846Z" fill="#E27625"/>
                  <path d="M20.2994 26.7374L24.7422 28.8846L24.1518 23.7088L20.2994 26.7374Z" fill="#E27625"/>
                </svg>
                <div className="text-left">
                  <div className="font-semibold">MetaMask</div>
                  <div className="text-xs text-muted-foreground">Connect to Ethereum and Polygon</div>
                </div>
                {!isMetaMaskAvailable && (
                  <div className="ml-auto text-xs text-muted-foreground">Not installed</div>
                )}
              </Button>
              
              <Button
                onClick={() => handleSelectWallet('phantom')}
                disabled={!isPhantomAvailable || isConnecting}
                className="flex items-center justify-start gap-3 h-14"
                variant={isPhantomAvailable ? "outline" : "ghost"}
              >
                <svg className="h-8 w-8" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="128" height="128" rx="64" fill="#AB9FF2"/>
                  <path d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.699 23 15 41.8057 15 64.8745C15 87.7137 32.4361 106.321 54.6075 107V118.023C31.6089 117.33 13 93.6623 13 64.8745C13 40.6549 32.3967 21 56.7724 21C81.4318 21 101.059 40.9052 101.142 65.1077V65.1091H110.509C110.551 65.1091 110.584 65.0587 110.584 64.9142Z" fill="white"/>
                  <path d="M99.142 73.9116C99.142 74.0561 99.1741 74.1064 99.142 74.1064H110.584C110.584 74.1064 110.618 74.0561 110.618 73.9116H99.142Z" fill="white"/>
                  <path d="M61.6365 75.7336V107.992C61.6365 108.137 61.7534 108.195 61.8316 108.195H72.9553C73.0335 108.195 73.1503 108.137 73.1503 107.992V75.7336C73.1503 75.5891 73.0335 75.5387 72.9553 75.5387H61.8316C61.7534 75.5387 61.6365 75.5891 61.6365 75.7336Z" fill="white"/>
                </svg>
                <div className="text-left">
                  <div className="font-semibold">Phantom</div>
                  <div className="text-xs text-muted-foreground">Connect to Solana</div>
                </div>
                {!isPhantomAvailable && (
                  <div className="ml-auto text-xs text-muted-foreground">Not installed</div>
                )}
              </Button>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // Wallet connected state
  return (
    <div id="wallet-connected">
      <div className="flex items-center justify-between bg-muted rounded-lg p-3">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
            {getWalletIcon()}
          </div>
          <div>
            <p className="text-sm font-medium">{getWalletShortAddress()}</p>
            <p className="text-xs text-muted-foreground">
              {getWalletName()} · {wallet.chain.charAt(0).toUpperCase() + wallet.chain.slice(1)}
            </p>
          </div>
        </div>
        <div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDisconnect}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WalletConnector;
