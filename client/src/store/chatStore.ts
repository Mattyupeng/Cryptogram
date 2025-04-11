import { create } from 'zustand';
import { 
  Conversation, 
  Contact, 
  Message, 
  User, 
  Transaction,
  TransferDetails
} from '@/types';
import { apiRequest } from '@/lib/queryClient';
import { 
  initSodium, 
  generateSharedKey, 
  privateKeyFromHex, 
  publicKeyFromHex,
  encryptMessage,
  decryptMessage 
} from '@/lib/encryption';
import { useWalletStore } from './walletStore';

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  contacts: Contact[];
  messages: Record<number, Message[]>; // Conversation ID -> Messages
  pendingMessages: Record<number, Message[]>; // Conversation ID -> Pending Messages
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  transferDialog: {
    isOpen: boolean;
    recipient: User | null;
    conversationId: number | null;
  };
  
  // Actions
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: number) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  fetchContacts: () => Promise<void>;
  addContact: (walletAddress: string, nickname?: string) => Promise<Contact | null>;
  sendMessage: (content: string, conversationId: number) => Promise<Message | null>;
  sendTransactionMessage: (details: TransferDetails, conversationId: number) => Promise<Message | null>;
  startConversation: (participants: string[]) => Promise<Conversation | null>;
  updateTransactionStatus: (messageId: number, status: string, txHash?: string) => Promise<void>;
  
  // Transfer dialog actions
  openTransferDialog: (recipient: User, conversationId: number) => void;
  closeTransferDialog: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  contacts: [],
  messages: {},
  pendingMessages: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  error: null,
  transferDialog: {
    isOpen: false,
    recipient: null,
    conversationId: null,
  },
  
  fetchConversations: async () => {
    const { user } = useWalletStore.getState();
    
    if (!user) {
      set({ error: 'User not authenticated' });
      return;
    }
    
    set({ isLoadingConversations: true, error: null });
    
    try {
      const response = await fetch(`/api/users/${user.id}/conversations`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      const conversations: Conversation[] = await response.json();
      set({ conversations, isLoadingConversations: false });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      set({
        isLoadingConversations: false,
        error: error instanceof Error ? error.message : 'Failed to fetch conversations',
      });
    }
  },
  
  fetchMessages: async (conversationId: number) => {
    set({ isLoadingMessages: true, error: null });
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const messages: Message[] = await response.json();
      const decryptedMessages = await decryptConversationMessages(messages, conversationId);
      
      // Update messages for this conversation
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: decryptedMessages,
        },
        isLoadingMessages: false,
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      set({
        isLoadingMessages: false,
        error: error instanceof Error ? error.message : 'Failed to fetch messages',
      });
    }
  },
  
  setCurrentConversation: (conversation: Conversation | null) => {
    set({ currentConversation: conversation });
    
    if (conversation) {
      get().fetchMessages(conversation.id);
    }
  },
  
  fetchContacts: async () => {
    const { user } = useWalletStore.getState();
    
    if (!user) {
      set({ error: 'User not authenticated' });
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${user.id}/contacts`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      
      const contacts: Contact[] = await response.json();
      set({ contacts });
    } catch (error) {
      console.error('Error fetching contacts:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch contacts',
      });
    }
  },
  
  addContact: async (walletAddress: string, nickname?: string) => {
    const { user } = useWalletStore.getState();
    
    if (!user) {
      set({ error: 'User not authenticated' });
      return null;
    }
    
    try {
      // First check if user with this wallet address exists
      const userResponse = await fetch(`/api/user/${walletAddress}`);
      
      if (!userResponse.ok) {
        throw new Error('User with this wallet address not found');
      }
      
      const contactUser = await userResponse.json();
      
      // Add contact
      const response = await apiRequest('POST', `/api/users/${user.id}/contacts`, {
        contactId: contactUser.id,
        nickname,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add contact');
      }
      
      const contact: Contact = await response.json();
      
      // Update contacts list
      set((state) => ({
        contacts: [...state.contacts, contact],
      }));
      
      return contact;
    } catch (error) {
      console.error('Error adding contact:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to add contact',
      });
      return null;
    }
  },
  
  sendMessage: async (content: string, conversationId: number) => {
    const { user } = useWalletStore.getState();
    const { encryptionKeys } = useWalletStore.getState();
    
    if (!user || !encryptionKeys) {
      set({ error: 'User not authenticated or encryption keys not available' });
      return null;
    }
    
    try {
      await initSodium();
      
      // Get conversation participants
      const conversation = get().conversations.find(c => c.id === conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      // Get the recipient (for a 1-1 conversation)
      const recipient = conversation.participants.find(p => p.id !== user.id);
      if (!recipient) {
        throw new Error('Recipient not found in conversation');
      }
      
      // Create shared key for encryption
      const privateKey = privateKeyFromHex(encryptionKeys.privateKey);
      const recipientPublicKey = publicKeyFromHex(recipient.publicKey);
      const sharedKey = generateSharedKey(privateKey, recipientPublicKey);
      
      // Encrypt the message
      const { encryptedContent, iv } = encryptMessage(content, sharedKey);
      
      // Add a pending message locally while we send it
      const pendingId = -Date.now(); // Negative ID to mark as pending
      const pendingMessage: Message = {
        id: pendingId,
        conversationId,
        senderId: user.id,
        encryptedContent,
        iv,
        sentAt: new Date().toISOString(),
        sender: user,
        decryptedContent: content, // Store decrypted content for display
        isPending: true,
      };
      
      // Add to pending messages
      set((state) => ({
        pendingMessages: {
          ...state.pendingMessages,
          [conversationId]: [
            ...(state.pendingMessages[conversationId] || []),
            pendingMessage,
          ],
        },
      }));
      
      // Send the message via WebSocket
      const socket = (window as any).chatSocket;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket connection not available');
      }
      
      socket.send(JSON.stringify({
        type: 'new_message',
        payload: {
          conversationId,
          senderId: user.id,
          encryptedContent,
          iv,
        },
      }));
      
      return pendingMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to send message',
      });
      return null;
    }
  },
  
  sendTransactionMessage: async (details: TransferDetails, conversationId: number) => {
    const { user } = useWalletStore.getState();
    const { wallet } = useWalletStore.getState();
    
    if (!user || !wallet) {
      set({ error: 'User not authenticated' });
      return null;
    }
    
    try {
      // First send a normal message with transaction details
      const content = JSON.stringify({
        type: 'transaction',
        details: {
          amount: details.amount,
          asset: details.asset,
          chain: details.chain,
          status: 'pending',
        },
      });
      
      const message = await get().sendMessage(content, conversationId);
      
      if (!message) {
        throw new Error('Failed to send transaction message');
      }
      
      // Create transaction record
      const transactionResponse = await apiRequest('POST', '/api/transactions', {
        messageId: message.id,
        fromAddress: wallet.address,
        toAddress: details.recipient.walletAddress,
        amount: details.amount,
        currency: details.asset,
        chain: details.chain,
        status: 'pending',
      });
      
      if (!transactionResponse.ok) {
        throw new Error('Failed to create transaction record');
      }
      
      // Future enhancement: Initiate the actual blockchain transaction here
      
      return message;
    } catch (error) {
      console.error('Error sending transaction message:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to send transaction message',
      });
      return null;
    }
  },
  
  startConversation: async (participantIds: string[]) => {
    const { user } = useWalletStore.getState();
    
    if (!user) {
      set({ error: 'User not authenticated' });
      return null;
    }
    
    // Ensure current user is included in participants
    if (!participantIds.includes(user.id.toString())) {
      participantIds.push(user.id.toString());
    }
    
    try {
      const response = await apiRequest('POST', '/api/conversations', {
        participantIds,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create conversation');
      }
      
      const conversation: Conversation = await response.json();
      
      // Update conversations list
      set((state) => ({
        conversations: [conversation, ...state.conversations],
      }));
      
      return conversation;
    } catch (error) {
      console.error('Error starting conversation:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to start conversation',
      });
      return null;
    }
  },
  
  updateTransactionStatus: async (messageId: number, status: string, txHash?: string) => {
    const { user } = useWalletStore.getState();
    
    if (!user) {
      set({ error: 'User not authenticated' });
      return;
    }
    
    try {
      const socket = (window as any).chatSocket;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket connection not available');
      }
      
      socket.send(JSON.stringify({
        type: 'transaction_update',
        payload: {
          messageId,
          status,
          txHash,
        },
      }));
    } catch (error) {
      console.error('Error updating transaction status:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update transaction status',
      });
    }
  },
  
  openTransferDialog: (recipient: User, conversationId: number) => {
    set({
      transferDialog: {
        isOpen: true,
        recipient,
        conversationId,
      },
    });
  },
  
  closeTransferDialog: () => {
    set({
      transferDialog: {
        isOpen: false,
        recipient: null,
        conversationId: null,
      },
    });
  },
}));

// Helper function to decrypt messages in a conversation
async function decryptConversationMessages(messages: Message[], conversationId: number): Promise<Message[]> {
  const { encryptionKeys } = useWalletStore.getState();
  const { user } = useWalletStore.getState();
  
  if (!encryptionKeys || !user) {
    return messages;
  }
  
  await initSodium();
  
  // Get all participants' public keys
  const conversations = useChatStore.getState().conversations;
  const conversation = conversations.find(c => c.id === conversationId);
  
  if (!conversation) {
    return messages;
  }
  
  const privateKey = privateKeyFromHex(encryptionKeys.privateKey);
  
  return Promise.all(
    messages.map(async (message) => {
      try {
        // For messages sent by the current user
        if (message.senderId === user.id) {
          // Find the recipient
          const recipient = conversation.participants.find(p => p.id !== user.id);
          
          if (recipient) {
            const recipientPublicKey = publicKeyFromHex(recipient.publicKey);
            const sharedKey = generateSharedKey(privateKey, recipientPublicKey);
            
            const decryptedContent = decryptMessage(
              message.encryptedContent,
              message.iv,
              sharedKey
            );
            
            // Check if this is a transaction message
            let isTransaction = false;
            let transaction;
            
            try {
              const parsed = JSON.parse(decryptedContent);
              if (parsed.type === 'transaction') {
                isTransaction = true;
                transaction = parsed.details;
              }
            } catch (e) {
              // Not a JSON message, just a regular message
            }
            
            return {
              ...message,
              decryptedContent,
              isTransaction,
              transaction,
            };
          }
        } 
        // For messages received from others
        else {
          // Find the sender
          const sender = conversation.participants.find(p => p.id === message.senderId);
          
          if (sender) {
            const senderPublicKey = publicKeyFromHex(sender.publicKey);
            const sharedKey = generateSharedKey(privateKey, senderPublicKey);
            
            const decryptedContent = decryptMessage(
              message.encryptedContent,
              message.iv,
              sharedKey
            );
            
            // Check if this is a transaction message
            let isTransaction = false;
            let transaction;
            
            try {
              const parsed = JSON.parse(decryptedContent);
              if (parsed.type === 'transaction') {
                isTransaction = true;
                transaction = parsed.details;
              }
            } catch (e) {
              // Not a JSON message, just a regular message
            }
            
            return {
              ...message,
              decryptedContent,
              isTransaction,
              transaction,
            };
          }
        }
        
        return message;
      } catch (error) {
        console.error('Error decrypting message:', error);
        return {
          ...message,
          decryptedContent: '[Encrypted message]',
        };
      }
    })
  );
}
