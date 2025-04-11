import { useState, useEffect, useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useWalletStore } from '@/store/walletStore';
import { Conversation, Message, Contact, User, TransferDetails } from '@/types';
import { useWebSocket } from './useWebSocket';

export function useChat() {
  const {
    conversations,
    currentConversation,
    contacts,
    messages,
    pendingMessages,
    isLoadingConversations,
    isLoadingMessages,
    error,
    transferDialog,
    fetchConversations,
    fetchMessages,
    setCurrentConversation,
    fetchContacts,
    addContact,
    sendMessage,
    sendTransactionMessage,
    startConversation,
    updateTransactionStatus,
    openTransferDialog,
    closeTransferDialog,
  } = useChatStore();
  
  const { user } = useWalletStore();
  const { connected: wsConnected, messages: wsMessages } = useWebSocket();
  
  // Current conversation messages
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  
  // Load conversations and contacts when user is authenticated
  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchContacts();
    }
  }, [user, fetchConversations, fetchContacts]);
  
  // Update current messages when currentConversation or messages change
  useEffect(() => {
    if (currentConversation) {
      const conversationId = currentConversation.id;
      const conversationMessages = messages[conversationId] || [];
      const pendingConversationMessages = pendingMessages[conversationId] || [];
      
      // Combine and sort by sent time
      const allMessages = [...conversationMessages, ...pendingConversationMessages]
        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      
      setCurrentMessages(allMessages);
    } else {
      setCurrentMessages([]);
    }
  }, [currentConversation, messages, pendingMessages]);
  
  // Handle incoming WebSocket messages
  useEffect(() => {
    if (wsMessages.length > 0) {
      const lastMessage = wsMessages[wsMessages.length - 1];
      
      if (lastMessage.type === 'new_message') {
        // Load messages for the current conversation if it's the one that received a message
        if (
          currentConversation && 
          lastMessage.payload.conversationId === currentConversation.id
        ) {
          fetchMessages(currentConversation.id);
        }
        
        // Refresh conversations to update last message
        fetchConversations();
      } else if (lastMessage.type === 'message_delivered') {
        // Update pending message status
        // In a real app, you would mark the message as delivered
      } else if (lastMessage.type === 'transaction_update') {
        // If a transaction was updated, refresh messages
        if (currentConversation) {
          fetchMessages(currentConversation.id);
        }
      }
    }
  }, [wsMessages, currentConversation, fetchMessages, fetchConversations]);
  
  // Function to start a new conversation with a contact
  const startNewConversation = useCallback(async (contactId: number) => {
    if (!user) return null;
    
    // Find the contact
    const contact = contacts.find(c => c.contactId === contactId);
    if (!contact) return null;
    
    // Start a conversation with this contact
    const conversation = await startConversation([user.id.toString(), contactId.toString()]);
    
    if (conversation) {
      setCurrentConversation(conversation);
    }
    
    return conversation;
  }, [user, contacts, startConversation, setCurrentConversation]);
  
  // Function to get a contact by ID
  const getContactById = useCallback((contactId: number) => {
    return contacts.find(c => c.contactId === contactId);
  }, [contacts]);
  
  // Function to handle message send
  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentConversation) return null;
    
    return sendMessage(content, currentConversation.id);
  }, [currentConversation, sendMessage]);
  
  // Function to handle transaction send
  const handleSendTransaction = useCallback(async (details: TransferDetails) => {
    if (!currentConversation) return null;
    
    return sendTransactionMessage(details, currentConversation.id);
  }, [currentConversation, sendTransactionMessage]);
  
  // Function to handle opening the transfer dialog
  const handleOpenTransferDialog = useCallback(() => {
    if (!currentConversation) return;
    
    // For 1-1 conversations, get the other participant
    const otherParticipant = currentConversation.participants.find(
      p => p.id !== user?.id
    );
    
    if (otherParticipant) {
      openTransferDialog(otherParticipant, currentConversation.id);
    }
  }, [currentConversation, user, openTransferDialog]);
  
  return {
    conversations,
    currentConversation,
    currentMessages,
    contacts,
    isLoadingConversations,
    isLoadingMessages,
    error,
    transferDialog,
    wsConnected,
    fetchConversations,
    fetchMessages,
    setCurrentConversation,
    fetchContacts,
    addContact,
    startNewConversation,
    getContactById,
    sendMessage: handleSendMessage,
    sendTransaction: handleSendTransaction,
    updateTransactionStatus,
    openTransferDialog: handleOpenTransferDialog,
    closeTransferDialog,
  };
}
