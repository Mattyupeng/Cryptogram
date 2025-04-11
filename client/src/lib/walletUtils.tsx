import { ChainType, SupportedWalletType, WalletInfo } from '@/types';

/**
 * Check if MetaMask is available in the browser
 */
export function isMetaMaskAvailable(): boolean {
  return typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask;
}

/**
 * Check if Phantom is available in the browser
 */
export function isPhantomAvailable(): boolean {
  return typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
}

/**
 * Get the ETH balance for an address
 */
export async function getEthBalance(address: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('Ethereum provider not found');
  }
  
  try {
    // Request account balance from MetaMask
    const balanceHex = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    
    // Convert from wei to ETH (1 ETH = 10^18 wei)
    const balanceWei = parseInt(balanceHex, 16);
    const balanceEth = balanceWei / 1e18;
    
    return balanceEth.toFixed(4);
  } catch (error) {
    console.error('Error fetching ETH balance:', error);
    return '0';
  }
}

/**
 * Get the SOL balance for an address
 */
export async function getSolBalance(address: string): Promise<string> {
  if (!window.solana) {
    throw new Error('Solana provider not found');
  }
  
  try {
    // Connect to the Solana network
    const connection = window.solana.connection;
    
    // Request account balance
    const publicKey = new window.solana.PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    
    // Convert from lamports to SOL (1 SOL = 10^9 lamports)
    const balanceSol = balance / 1e9;
    
    return balanceSol.toFixed(4);
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    return '0';
  }
}

/**
 * Connect to MetaMask wallet
 */
export async function connectMetaMask(): Promise<WalletInfo> {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask is not available');
  }
  
  try {
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const address = accounts[0];
    
    // Get the connected chain ID
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    let chain: ChainType = 'undefined';
    
    // Map chain ID to chain type
    if (chainId === '0x1') {
      chain = 'ethereum'; // Ethereum Mainnet
    } else if (chainId === '0x89') {
      chain = 'polygon'; // Polygon Mainnet
    }
    
    // Get balance
    const balance = await getEthBalance(address);
    
    // Get public key (for encryption)
    const publicKey = await window.ethereum.request({
      method: 'eth_getEncryptionPublicKey',
      params: [address],
    });
    
    // Try to resolve ENS name if on Ethereum
    let ensName;
    if (chain === 'ethereum') {
      try {
        const provider = new window.ethers.providers.Web3Provider(window.ethereum);
        ensName = await provider.lookupAddress(address);
      } catch (error) {
        console.error('Error resolving ENS name:', error);
      }
    }
    
    return {
      address,
      chain,
      walletType: 'metamask',
      ensName,
      publicKey,
      balance,
      connected: true,
    };
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
    throw error;
  }
}

/**
 * Connect to Phantom wallet
 */
export async function connectPhantom(): Promise<WalletInfo> {
  if (!isPhantomAvailable()) {
    throw new Error('Phantom is not available');
  }
  
  try {
    // Connect to wallet
    const resp = await window.solana.connect();
    const address = resp.publicKey.toString();
    
    // Get balance
    const balance = await getSolBalance(address);
    
    // Get public key bytes for encryption
    const publicKeyBytes = resp.publicKey.toBytes();
    const publicKey = Buffer.from(publicKeyBytes).toString('hex');
    
    return {
      address,
      chain: 'solana',
      walletType: 'phantom',
      publicKey,
      balance,
      connected: true,
    };
  } catch (error) {
    console.error('Error connecting to Phantom:', error);
    throw error;
  }
}

/**
 * Disconnect from wallet
 */
export async function disconnectWallet(walletType: SupportedWalletType): Promise<void> {
  if (walletType === 'metamask' && isMetaMaskAvailable()) {
    // MetaMask doesn't have a disconnect method
    // We just reset the internal state
  } else if (walletType === 'phantom' && isPhantomAvailable()) {
    await window.solana.disconnect();
  }
}

/**
 * Sign a message with MetaMask
 */
export async function signMessageWithMetaMask(address: string, message: string): Promise<string> {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask is not available');
  }
  
  try {
    // Convert message to hex
    const hexMessage = '0x' + Buffer.from(message).toString('hex');
    
    // Request signature
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [hexMessage, address],
    });
    
    return signature;
  } catch (error) {
    console.error('Error signing message with MetaMask:', error);
    throw error;
  }
}

/**
 * Sign a message with Phantom
 */
export async function signMessageWithPhantom(message: string): Promise<Uint8Array> {
  if (!isPhantomAvailable()) {
    throw new Error('Phantom is not available');
  }
  
  try {
    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);
    
    // Request signature
    const { signature } = await window.solana.signMessage(messageBytes, 'utf8');
    
    return signature;
  } catch (error) {
    console.error('Error signing message with Phantom:', error);
    throw error;
  }
}

/**
 * Send ETH or ERC20 tokens using MetaMask
 */
export async function sendEthTransaction(
  fromAddress: string,
  toAddress: string,
  amount: string,
  asset: string
): Promise<string> {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask is not available');
  }
  
  try {
    if (asset === 'ETH') {
      // Convert amount to wei
      const amountWei = (parseFloat(amount) * 1e18).toString(16);
      
      // Create transaction
      const transactionParameters = {
        to: toAddress,
        from: fromAddress,
        value: '0x' + amountWei,
      };
      
      // Send transaction
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });
      
      return txHash;
    } else {
      // For ERC20 tokens, we would need the token contract address and ABI
      // This is a simplified example
      throw new Error('ERC20 transfers not implemented yet');
    }
  } catch (error) {
    console.error('Error sending ETH transaction:', error);
    throw error;
  }
}

/**
 * Send SOL using Phantom
 */
export async function sendSolTransaction(
  toAddress: string,
  amount: string
): Promise<string> {
  if (!isPhantomAvailable()) {
    throw new Error('Phantom is not available');
  }
  
  try {
    // Create a Solana transaction
    const connection = window.solana.connection;
    const fromPublicKey = window.solana.publicKey;
    const toPublicKey = new window.solana.PublicKey(toAddress);
    
    // Convert amount to lamports
    const lamports = parseFloat(amount) * 1e9;
    
    // Create transfer instruction
    const transaction = new window.solana.Transaction().add(
      window.solana.SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports,
      })
    );
    
    // Set recent blockhash
    transaction.recentBlockhash = (
      await connection.getRecentBlockhash()
    ).blockhash;
    
    // Set fee payer
    transaction.feePayer = fromPublicKey;
    
    // Sign and send transaction
    const { signature } = await window.solana.signAndSendTransaction(transaction);
    
    return signature;
  } catch (error) {
    console.error('Error sending SOL transaction:', error);
    throw error;
  }
}

/**
 * Shorten wallet address for display
 */
export function shortenAddress(address: string, ensName?: string): string {
  if (ensName) return ensName;
  if (!address) return '';
  
  return address.slice(0, 6) + '...' + address.slice(-4);
}

/**
 * Get chain icon based on chain type
 */
export function getChainIcon(chain: ChainType): JSX.Element {
  const iconClassName = "h-5 w-5";
  
  switch (chain) {
    case 'ethereum':
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L5 12L12 16L19 12L12 2Z" fill="currentColor"/>
          <path d="M12 16L5 12L12 22L19 12L12 16Z" fill="currentColor"/>
        </svg>
      );
    case 'solana':
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 7.5H16.5L20 4H7.5L4 7.5Z" fill="currentColor"/>
          <path d="M4 13.5H16.5L20 10H7.5L4 13.5Z" fill="currentColor"/>
          <path d="M4 19.5H16.5L20 16H7.5L4 19.5Z" fill="currentColor"/>
        </svg>
      );
    case 'polygon':
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L3 8V16L12 22L21 16V8L12 2Z" fill="currentColor"/>
          <path d="M12 7L8 9.5V14.5L12 17L16 14.5V9.5L12 7Z" fill="white"/>
        </svg>
      );
    default:
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 6V18" stroke="currentColor" strokeWidth="2"/>
          <path d="M6 12H18" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );
  }
}
