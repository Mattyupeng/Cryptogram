import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { messageTypes, type WebSocketMessage } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time messaging
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    verifyClient: (info, callback) => {
      // Allow all connections in development
      callback(true);
    }
  });
  
  // Map to track active connections and their associated user IDs
  const activeConnections = new Map<string, number>();
  
  wss.on('connection', (ws: WebSocket) => {
    // Generate a unique socket ID
    const socketId = Math.random().toString(36).substring(2, 15);
    
    ws.on('message', async (message: string) => {
      try {
        const parsedMessage = JSON.parse(message) as WebSocketMessage;
        
        switch (parsedMessage.type) {
          case 'connect': {
            const { userId } = parsedMessage.payload;
            
            if (!userId) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'User ID is required for connection' }
              }));
              return;
            }
            
            // Store connection in memory
            activeConnections.set(socketId, userId);
            await storage.addConnection({ userId, socketId });
            
            // Update user's last seen timestamp
            await storage.updateUserLastSeen(userId);
            
            ws.send(JSON.stringify({
              type: 'connected',
              payload: { socketId }
            }));
            
            break;
          }
          
          case 'new_message': {
            const { conversationId, senderId, encryptedContent, iv } = parsedMessage.payload;
            
            if (!conversationId || !senderId || !encryptedContent || !iv) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Missing required message fields' }
              }));
              return;
            }
            
            // Store message in memory
            const message = await storage.createMessage({
              conversationId,
              senderId,
              encryptedContent,
              iv
            });
            
            // Get the conversation to find recipients
            const conversation = await storage.getConversation(conversationId);
            if (!conversation) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Conversation not found' }
              }));
              return;
            }
            
            // Send message to all participants in the conversation
            conversation.participants.forEach(async (participant) => {
              if (participant.id !== senderId) {
                const connection = await storage.getUserConnection(participant.id);
                
                if (connection) {
                  // Find the WebSocket connection for this user
                  wss.clients.forEach((client) => {
                    // Find active connection by socket ID
                    const entries = Array.from(activeConnections.entries());
                    const entry = entries.find(([sid, uid]) => sid === connection.socketId && uid === participant.id);
                    
                    if (entry && client.readyState === WebSocket.OPEN) {
                      client.send(JSON.stringify({
                        type: 'new_message',
                        payload: {
                          messageId: message.id,
                          conversationId,
                          senderId,
                          encryptedContent,
                          iv,
                          sentAt: message.sentAt
                        }
                      }));
                    }
                  });
                }
              }
            });
            
            // Confirm delivery to sender
            ws.send(JSON.stringify({
              type: 'message_delivered',
              payload: {
                messageId: message.id,
                conversationId,
                deliveredAt: new Date()
              }
            }));
            
            break;
          }
          
          case 'user_typing': {
            const { conversationId, userId } = parsedMessage.payload;
            
            if (!conversationId || !userId) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Missing required typing notification fields' }
              }));
              return;
            }
            
            const conversation = await storage.getConversation(conversationId);
            if (!conversation) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Conversation not found' }
              }));
              return;
            }
            
            // Broadcast typing status to other participants
            conversation.participants.forEach(async (participant) => {
              if (participant.id !== userId) {
                const connection = await storage.getUserConnection(participant.id);
                
                if (connection) {
                  wss.clients.forEach((client) => {
                    const entries = Array.from(activeConnections.entries());
                    const entry = entries.find(([sid, uid]) => sid === connection.socketId && uid === participant.id);
                    
                    if (entry && client.readyState === WebSocket.OPEN) {
                      client.send(JSON.stringify({
                        type: 'user_typing',
                        payload: {
                          conversationId,
                          userId
                        }
                      }));
                    }
                  });
                }
              }
            });
            
            break;
          }
          
          case 'transaction_update': {
            const { messageId, status, txHash } = parsedMessage.payload;
            
            if (!messageId || !status) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Missing required transaction update fields' }
              }));
              return;
            }
            
            // Get the transaction associated with the message
            const transaction = await storage.getMessageTransaction(messageId);
            
            if (!transaction) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Transaction not found for message' }
              }));
              return;
            }
            
            // Update transaction status
            const updatedTransaction = await storage.updateTransactionStatus(
              transaction.id,
              status,
              txHash
            );
            
            if (!updatedTransaction) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Failed to update transaction' }
              }));
              return;
            }
            
            // Get the message to find conversation and participants
            const message = await storage.getMessage(messageId);
            
            if (!message) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Message not found' }
              }));
              return;
            }
            
            const conversation = await storage.getConversation(message.conversationId);
            
            if (!conversation) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Conversation not found' }
              }));
              return;
            }
            
            // Broadcast transaction update to all participants
            conversation.participants.forEach(async (participant) => {
              const connection = await storage.getUserConnection(participant.id);
              
              if (connection) {
                wss.clients.forEach((client) => {
                  const entries = Array.from(activeConnections.entries());
                  const entry = entries.find(([sid, uid]) => sid === connection.socketId && uid === participant.id);
                  
                  if (entry && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                      type: 'transaction_update',
                      payload: {
                        messageId,
                        status,
                        txHash,
                        updatedAt: new Date()
                      }
                    }));
                  }
                });
              }
            });
            
            break;
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        
        // Send error back to client
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: error instanceof z.ZodError
              ? fromZodError(error).message
              : 'Invalid message format'
          }
        }));
      }
    });
    
    ws.on('close', async () => {
      const userId = activeConnections.get(socketId);
      
      if (userId) {
        // Remove connection from storage
        await storage.removeConnection(socketId);
        activeConnections.delete(socketId);
      }
    });
  });
  
  // RESTful API endpoints
  app.get('/api/user/:walletAddress', async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ message: 'Wallet address is required' });
      }
      
      let user = await storage.getUserByWalletAddress(walletAddress);
      
      // For development purposes, create a user if not found
      if (!user) {
        // Create a mock user with the provided wallet address
        user = await storage.createUser({
          walletAddress,
          ensName: walletAddress.includes('.eth') ? walletAddress : undefined,
          publicKey: 'mock-public-key-' + Math.random().toString(36).substring(2, 15),
        });
        
        console.log(`Created new user with wallet address: ${walletAddress}`, user);
      }
      
      return res.json(user);
    } catch (error) {
      console.error('Error getting user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/users', async (req, res) => {
    try {
      const userSchema = z.object({
        walletAddress: z.string().min(1),
        ensName: z.string().optional(),
        publicKey: z.string().min(1),
      });
      
      const validationResult = userSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const { walletAddress, ensName, publicKey } = validationResult.data;
      
      // Check if user with this wallet address already exists
      const existingUser = await storage.getUserByWalletAddress(walletAddress);
      
      if (existingUser) {
        return res.status(409).json({
          message: 'User with this wallet address already exists',
          user: existingUser
        });
      }
      
      const user = await storage.createUser({
        walletAddress,
        ensName,
        publicKey,
      });
      
      return res.status(201).json(user);
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/users/:userId/contacts', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const contacts = await storage.getContacts(userId);
      return res.json(contacts);
    } catch (error) {
      console.error('Error getting contacts:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/users/:userId/contacts', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const contactSchema = z.object({
        contactId: z.number().int().positive(),
        nickname: z.string().optional(),
      });
      
      const validationResult = contactSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const { contactId, nickname } = validationResult.data;
      
      // Check if contact exists
      const contactUser = await storage.getUser(contactId);
      
      if (!contactUser) {
        return res.status(404).json({ message: 'Contact user not found' });
      }
      
      // Check if contact already exists
      const existingContacts = await storage.getContacts(userId);
      const existingContact = existingContacts.find(c => c.contactId === contactId);
      
      if (existingContact) {
        return res.status(409).json({
          message: 'Contact already exists',
          contact: existingContact
        });
      }
      
      const contact = await storage.addContact({
        userId,
        contactId,
        nickname,
      });
      
      return res.status(201).json(contact);
    } catch (error) {
      console.error('Error adding contact:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/users/:userId/conversations', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const conversations = await storage.getUserConversations(userId);
      return res.json(conversations);
    } catch (error) {
      console.error('Error getting conversations:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/conversations', async (req, res) => {
    try {
      const conversationSchema = z.object({
        participantIds: z.array(z.string().min(1)).min(2),
      });
      
      const validationResult = conversationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const { participantIds } = validationResult.data;
      
      // Check if conversation already exists
      const existingConversation = await storage.getConversationByParticipants(participantIds);
      
      if (existingConversation) {
        return res.status(200).json(existingConversation);
      }
      
      const conversation = await storage.createConversation({
        participantIds,
      });
      
      // Get the full conversation with participants
      const conversationWithParticipants = await storage.getConversation(conversation.id);
      
      return res.status(201).json(conversationWithParticipants);
    } catch (error) {
      console.error('Error creating conversation:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/conversations/:conversationId/messages', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation ID' });
      }
      
      const messages = await storage.getConversationMessages(conversationId);
      return res.json(messages);
    } catch (error) {
      console.error('Error getting messages:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/transactions', async (req, res) => {
    try {
      const transactionSchema = z.object({
        messageId: z.number().int().positive(),
        fromAddress: z.string().min(1),
        toAddress: z.string().min(1),
        amount: z.string().min(1),
        currency: z.string().min(1),
        chain: z.string().min(1),
        status: z.string().min(1),
        txHash: z.string().optional(),
      });
      
      const validationResult = transactionSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const transaction = await storage.createTransaction(validationResult.data);
      return res.status(201).json(transaction);
    } catch (error) {
      console.error('Error creating transaction:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  return httpServer;
}
