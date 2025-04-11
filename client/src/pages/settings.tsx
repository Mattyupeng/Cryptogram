import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { User, Copy, Check, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/components/layout/AppLayout';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { shortenAddress, getChainIcon } from '@/lib/walletUtils';
import { useWalletStore } from '@/store/walletStore';

const SettingsPage = () => {
  const { wallet, user } = useWallet();
  const walletStore = useWalletStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [copySuccess, setCopySuccess] = useState(false);

  if (!wallet || !user) {
    setLocation('/');
    return null;
  }

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    
    toast({
      title: "Address Copied",
      description: "Your wallet address has been copied to clipboard",
      variant: "default",
    });
  };

  const handleLogout = async () => {
    try {
      await walletStore.disconnectCurrentWallet();
      walletStore.resetWalletState();
      localStorage.removeItem('wallet-storage');
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
        variant: "default",
      });
      
      setLocation('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Settings</h1>
            <Button variant="ghost" onClick={() => setLocation('/')}>Back to Chat</Button>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your wallet and account details</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Profile */}
              <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">{wallet.ensName || shortenAddress(wallet.address)}</h3>
                  <div className="text-sm text-muted-foreground">
                    User ID: {user.id} • Joined {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              {/* Wallet Info */}
              <div>
                <h3 className="text-lg font-medium mb-4">Wallet Information</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline" className="capitalize">
                      {wallet.walletType}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                    <span className="text-muted-foreground">Network:</span>
                    <div className="flex items-center gap-1">
                      {getChainIcon(wallet.chain)}
                      <Badge variant="outline" className="capitalize">
                        {wallet.chain}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                    <span className="text-muted-foreground">Address:</span>
                    <div className="flex items-center">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono truncate max-w-[250px]">
                        {wallet.address}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2"
                        onClick={handleCopyAddress}
                      >
                        {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {wallet.ensName && (
                    <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                      <span className="text-muted-foreground">ENS Name:</span>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {wallet.ensName}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                variant="destructive" 
                onClick={handleLogout}
                className="w-full sm:w-auto"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;