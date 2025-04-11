import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, ChainType, TransferDetails } from '@/types';
import { shortenAddress } from '@/lib/walletUtils';
import { useWallet } from '@/hooks/useWallet';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/hooks/use-toast';
import { 
  sendEthTransaction, 
  sendSolTransaction 
} from '@/lib/walletUtils';

interface CryptoTransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: User | null;
  conversationId: number | null;
}

const CryptoTransferDialog: React.FC<CryptoTransferDialogProps> = ({
  isOpen,
  onClose,
  recipient,
  conversationId
}) => {
  const { wallet } = useWallet();
  const { sendTransaction } = useChat();
  const { toast } = useToast();
  
  const [selectedChain, setSelectedChain] = useState<ChainType>('ethereum');
  const [selectedAsset, setSelectedAsset] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get assets based on selected chain
  const getAssetOptions = () => {
    switch (selectedChain) {
      case 'ethereum':
        return ['ETH', 'USDC', 'DAI'];
      case 'solana':
        return ['SOL', 'USDC'];
      case 'polygon':
        return ['MATIC', 'USDC'];
      default:
        return ['ETH'];
    }
  };

  // Handle chain change
  const handleChainChange = (value: string) => {
    const chain = value as ChainType;
    setSelectedChain(chain);
    
    // Reset asset to default for selected chain
    switch (chain) {
      case 'ethereum':
        setSelectedAsset('ETH');
        break;
      case 'solana':
        setSelectedAsset('SOL');
        break;
      case 'polygon':
        setSelectedAsset('MATIC');
        break;
      default:
        setSelectedAsset('ETH');
    }
  };

  // Send transaction
  const handleSendTransaction = async () => {
    if (!wallet || !recipient || !conversationId) {
      toast({
        title: "Transaction failed",
        description: "Missing wallet or recipient information",
        variant: "destructive",
      });
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create transfer details
      const transferDetails: TransferDetails = {
        recipient,
        chain: selectedChain,
        asset: selectedAsset,
        amount
      };
      
      // Send transaction message
      const message = await sendTransaction(transferDetails);
      
      if (!message) {
        throw new Error("Failed to create transaction message");
      }
      
      // Initiate actual blockchain transaction
      let txHash = '';
      
      if (selectedChain === 'ethereum' || selectedChain === 'polygon') {
        txHash = await sendEthTransaction(
          wallet.address,
          recipient.walletAddress,
          amount,
          selectedAsset
        );
      } else if (selectedChain === 'solana') {
        txHash = await sendSolTransaction(
          recipient.walletAddress,
          amount
        );
      }
      
      // Close dialog
      onClose();
      
      toast({
        title: "Transaction initiated",
        description: `${amount} ${selectedAsset} is being sent to ${shortenAddress(recipient.walletAddress)}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Transaction error:', error);
      toast({
        title: "Transaction failed",
        description: error instanceof Error ? error.message : "Failed to send transaction",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Crypto</DialogTitle>
          <DialogDescription>
            Send cryptocurrency directly to your contact in a few simple steps.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Recipient</Label>
            {recipient && (
              <div className="flex items-center bg-muted rounded-lg p-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center mr-2">
                  <span className="text-white text-xs">
                    {(recipient.ensName || shortenAddress(recipient.walletAddress)).substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {recipient.ensName || shortenAddress(recipient.walletAddress)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {recipient.walletAddress}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="chain">Blockchain</Label>
            <Select 
              value={selectedChain} 
              onValueChange={handleChainChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select blockchain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ethereum">Ethereum (ETH)</SelectItem>
                <SelectItem value="solana">Solana (SOL)</SelectItem>
                <SelectItem value="polygon">Polygon (MATIC)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="asset">Asset</Label>
            <Select 
              value={selectedAsset} 
              onValueChange={setSelectedAsset}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                {getAssetOptions().map(asset => (
                  <SelectItem key={asset} value={asset}>
                    {asset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                placeholder="0.0"
                type="number"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto py-0 text-xs text-primary"
                  onClick={() => setAmount(wallet?.balance || '0')}
                >
                  MAX
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-muted-foreground">
                Balance: {wallet?.balance || '0'} {
                  wallet?.chain === 'ethereum' 
                    ? 'ETH' 
                    : wallet?.chain === 'solana' 
                      ? 'SOL' 
                      : wallet?.chain === 'polygon' 
                        ? 'MATIC' 
                        : ''
                }
              </span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendTransaction}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
          >
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CryptoTransferDialog;
