// Web3 wallet types
export type SupportedWalletType = 'phantom' | 'metamask' | 'undefined';

export type WalletInfo = {
  address: string;
  chain: ChainType;
  walletType: SupportedWalletType;
  ensName?: string;
  publicKey: string;
  balance?: string;
  connected: boolean;
};

export type ChainType = 'solana' | 'ethereum' | 'polygon' | 'undefined';

// Message and conversation types
export type Contact = {
  id: number;
  userId: number;
  contactId: number;
  nickname?: string;
  user: User;
  createdAt: string;
};

export type User = {
  id: number;
  walletAddress: string;
  ensName?: string;
  publicKey: string;
  lastSeen: string;
  createdAt: string;
};

export type Message = {
  id: number;
  conversationId: number;
  senderId: number;
  encryptedContent: string;
  iv: string;
  sentAt: string;
  sender: User;
  
  // Client-side properties
  decryptedContent?: string;
  isTransaction?: boolean;
  transaction?: Transaction;
  isPending?: boolean;
  isRead?: boolean;
};

export type Transaction = {
  id: number;
  messageId: number;
  fromAddress: string;
  toAddress: string;
  amount: string;
  currency: string;
  chain: ChainType;
  status: TransactionStatus;
  txHash?: string;
  createdAt: string;
};

export type TransactionStatus = 'pending' | 'completed' | 'failed';

export type Conversation = {
  id: number;
  participantIds: string[];
  lastMessageAt: string;
  createdAt: string;
  participants: User[];
  lastMessage?: Message;
};

export type TransferDetails = {
  recipient: User;
  chain: ChainType;
  asset: string;
  amount: string;
};

// Websocket message types
export type WebSocketMessage = {
  type: string;
  payload: any;
};

// Message encryption key pair
export type KeyPair = {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
};

export type EncryptedMessage = {
  encryptedContent: string; // Base64 encoded encrypted content
  iv: string; // Base64 encoded initialization vector
};

// State types
export type WebSocketState = {
  connected: boolean;
  socketId?: string;
  error?: string;
};

// UI/UX types
export type ThemeMode = 'light' | 'dark';
