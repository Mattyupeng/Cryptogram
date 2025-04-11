import {
  users,
  contacts,
  conversations,
  messages,
  transactions,
  connections,
  type User,
  type InsertUser,
  type Contact,
  type InsertContact,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Transaction,
  type InsertTransaction,
  type Connection,
  type InsertConnection,
  type ContactWithUser,
  type MessageWithSender,
  type ConversationWithParticipants,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, inArray, sql } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastSeen(id: number): Promise<User | undefined>;

  // Contact operations
  getContacts(userId: number): Promise<ContactWithUser[]>;
  addContact(contact: InsertContact): Promise<Contact>;
  removeContact(userId: number, contactId: number): Promise<boolean>;

  // Conversation operations
  getConversation(id: number): Promise<ConversationWithParticipants | undefined>;
  getConversationByParticipants(participantIds: string[]): Promise<ConversationWithParticipants | undefined>;
  getUserConversations(userId: number): Promise<ConversationWithParticipants[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateLastMessageTime(id: number): Promise<boolean>;

  // Message operations
  getMessage(id: number): Promise<MessageWithSender | undefined>;
  getConversationMessages(conversationId: number): Promise<MessageWithSender[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: number, status: string, txHash?: string): Promise<Transaction | undefined>;
  getMessageTransaction(messageId: number): Promise<Transaction | undefined>;

  // Connection operations
  addConnection(connection: InsertConnection): Promise<Connection>;
  removeConnection(socketId: string): Promise<boolean>;
  getUserConnection(userId: number): Promise<Connection | undefined>;
}

// In-memory Storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contacts: Map<number, Contact>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private transactions: Map<number, Transaction>;
  private connections: Map<number, Connection>;
  
  private userIdCounter: number;
  private contactIdCounter: number;
  private conversationIdCounter: number;
  private messageIdCounter: number;
  private transactionIdCounter: number;
  private connectionIdCounter: number;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.transactions = new Map();
    this.connections = new Map();

    this.userIdCounter = 1;
    this.contactIdCounter = 1;
    this.conversationIdCounter = 1;
    this.messageIdCounter = 1;
    this.transactionIdCounter = 1;
    this.connectionIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const newUser = {
      ...user,
      id,
      lastSeen: now,
      createdAt: now,
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUserLastSeen(id: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      lastSeen: new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Contact operations
  async getContacts(userId: number): Promise<ContactWithUser[]> {
    const userContacts = Array.from(this.contacts.values()).filter(
      (contact) => contact.userId === userId
    );
    
    return Promise.all(
      userContacts.map(async (contact) => {
        const contactUser = await this.getUser(contact.contactId);
        if (!contactUser) {
          throw new Error(`Contact user not found: ${contact.contactId}`);
        }
        return { ...contact, user: contactUser };
      })
    );
  }

  async addContact(contact: InsertContact): Promise<Contact> {
    const id = this.contactIdCounter++;
    const now = new Date();
    const newContact = {
      ...contact,
      id,
      createdAt: now,
    };
    this.contacts.set(id, newContact);
    return newContact;
  }

  async removeContact(userId: number, contactId: number): Promise<boolean> {
    const contactToRemove = Array.from(this.contacts.values()).find(
      (contact) => contact.userId === userId && contact.contactId === contactId
    );
    
    if (!contactToRemove) return false;
    return this.contacts.delete(contactToRemove.id);
  }

  // Conversation operations
  async getConversation(id: number): Promise<ConversationWithParticipants | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    // Get participants
    const participants = await Promise.all(
      conversation.participantIds.map(async (id) => {
        const user = await this.getUser(parseInt(id));
        if (!user) throw new Error(`User not found: ${id}`);
        return user;
      })
    );
    
    // Get last message
    const conversationMessages = Array.from(this.messages.values())
      .filter(msg => msg.conversationId === id)
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
    
    const lastMessage = conversationMessages[0];
    let messageWithSender: MessageWithSender | undefined;
    
    if (lastMessage) {
      const sender = await this.getUser(lastMessage.senderId);
      if (sender) {
        messageWithSender = { ...lastMessage, sender };
      }
    }
    
    return {
      ...conversation,
      participants,
      lastMessage: messageWithSender,
    };
  }

  async getConversationByParticipants(participantIds: string[]): Promise<ConversationWithParticipants | undefined> {
    // Sort participant IDs to ensure consistent matching
    const sortedIds = [...participantIds].sort();
    
    const conversation = Array.from(this.conversations.values()).find(
      (conv) => {
        const convIds = [...conv.participantIds].sort();
        return JSON.stringify(convIds) === JSON.stringify(sortedIds);
      }
    );
    
    if (!conversation) return undefined;
    return this.getConversation(conversation.id);
  }

  async getUserConversations(userId: number): Promise<ConversationWithParticipants[]> {
    const userIdString = userId.toString();
    
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.participantIds.includes(userIdString))
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
    
    return Promise.all(userConversations.map(conv => this.getConversation(conv.id)))
      .then(convs => convs.filter((conv): conv is ConversationWithParticipants => conv !== undefined));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationIdCounter++;
    const now = new Date();
    const newConversation = {
      ...conversation,
      id,
      lastMessageAt: now,
      createdAt: now,
    };
    this.conversations.set(id, newConversation);
    return newConversation;
  }

  async updateLastMessageTime(id: number): Promise<boolean> {
    const conversation = await this.getConversation(id);
    if (!conversation) return false;
    
    const updatedConversation = {
      ...conversation,
      lastMessageAt: new Date(),
    };
    this.conversations.set(id, updatedConversation);
    return true;
  }

  // Message operations
  async getMessage(id: number): Promise<MessageWithSender | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const sender = await this.getUser(message.senderId);
    if (!sender) return undefined;
    
    return { ...message, sender };
  }

  async getConversationMessages(conversationId: number): Promise<MessageWithSender[]> {
    const conversationMessages = Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
    
    return Promise.all(
      conversationMessages.map(async (message) => {
        const sender = await this.getUser(message.senderId);
        if (!sender) throw new Error(`Sender not found: ${message.senderId}`);
        return { ...message, sender };
      })
    );
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const now = new Date();
    const newMessage = {
      ...message,
      id,
      sentAt: now,
    };
    this.messages.set(id, newMessage);
    
    // Update conversation's last message time
    await this.updateLastMessageTime(message.conversationId);
    
    return newMessage;
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const now = new Date();
    const newTransaction = {
      ...transaction,
      id,
      createdAt: now,
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransactionStatus(
    id: number,
    status: string,
    txHash?: string
  ): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = {
      ...transaction,
      status,
      ...(txHash ? { txHash } : {}),
    };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async getMessageTransaction(messageId: number): Promise<Transaction | undefined> {
    return Array.from(this.transactions.values()).find(
      (tx) => tx.messageId === messageId
    );
  }

  // Connection operations
  async addConnection(connection: InsertConnection): Promise<Connection> {
    const id = this.connectionIdCounter++;
    const now = new Date();
    const newConnection = {
      ...connection,
      id,
      connectedAt: now,
    };
    this.connections.set(id, newConnection);
    return newConnection;
  }

  async removeConnection(socketId: string): Promise<boolean> {
    const connectionToRemove = Array.from(this.connections.values()).find(
      (conn) => conn.socketId === socketId
    );
    
    if (!connectionToRemove) return false;
    return this.connections.delete(connectionToRemove.id);
  }

  async getUserConnection(userId: number): Promise<Connection | undefined> {
    return Array.from(this.connections.values()).find(
      (conn) => conn.userId === userId
    );
  }
}

// Database Storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.walletAddress}) = LOWER(${walletAddress})`);
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserLastSeen(id: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ lastSeen: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Contact operations
  async getContacts(userId: number): Promise<ContactWithUser[]> {
    const contactsWithUsers = await db
      .select({
        contact: contacts,
        user: users,
      })
      .from(contacts)
      .innerJoin(users, eq(contacts.contactId, users.id))
      .where(eq(contacts.userId, userId));

    return contactsWithUsers.map(({ contact, user }) => ({ ...contact, user }));
  }

  async addContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async removeContact(userId: number, contactId: number): Promise<boolean> {
    const result = await db
      .delete(contacts)
      .where(
        and(
          eq(contacts.userId, userId),
          eq(contacts.contactId, contactId)
        )
      );
    return result.rowCount > 0;
  }

  // Conversation operations
  async getConversation(id: number): Promise<ConversationWithParticipants | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    
    if (!conversation) return undefined;
    
    // Get participants
    const participantIds = conversation.participantIds.map(id => parseInt(id));
    const participants = await db
      .select()
      .from(users)
      .where(inArray(users.id, participantIds));
    
    // Get last message with sender
    const [lastMessage] = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, id))
      .orderBy(desc(messages.sentAt))
      .limit(1);
    
    return {
      ...conversation,
      participants,
      lastMessage: lastMessage ? { ...lastMessage.message, sender: lastMessage.sender } : undefined,
    };
  }

  async getConversationByParticipants(participantIds: string[]): Promise<ConversationWithParticipants | undefined> {
    // This is complex because we need to find a conversation with the exact participants
    // First, fetch all conversations that have at least one participant from the list
    const allConversations = await db
      .select()
      .from(conversations);
    
    // Then filter to find the one with exactly the matching participants
    const sortedInputIds = [...participantIds].sort();
    
    const matchingConversation = allConversations.find(conv => {
      const convIds = [...conv.participantIds].sort();
      return JSON.stringify(convIds) === JSON.stringify(sortedInputIds);
    });
    
    if (!matchingConversation) return undefined;
    
    return this.getConversation(matchingConversation.id);
  }

  async getUserConversations(userId: number): Promise<ConversationWithParticipants[]> {
    const userIdString = userId.toString();
    
    // Find all conversations where the user is a participant
    const allConversations = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt));
    
    const userConversations = allConversations.filter(
      conv => conv.participantIds.includes(userIdString)
    );
    
    // Fetch full conversation details for each
    const conversationsWithDetails = await Promise.all(
      userConversations.map(conv => this.getConversation(conv.id))
    );
    
    return conversationsWithDetails.filter(
      (conv): conv is ConversationWithParticipants => conv !== undefined
    );
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async updateLastMessageTime(id: number): Promise<boolean> {
    const result = await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, id));
    return result.rowCount > 0;
  }

  // Message operations
  async getMessage(id: number): Promise<MessageWithSender | undefined> {
    const [messageWithSender] = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, id));
    
    if (!messageWithSender) return undefined;
    
    return { ...messageWithSender.message, sender: messageWithSender.sender };
  }

  async getConversationMessages(conversationId: number): Promise<MessageWithSender[]> {
    const messagesWithSenders = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.sentAt);
    
    return messagesWithSenders.map(({ message, sender }) => ({ ...message, sender }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    
    // Update conversation's last message time
    await this.updateLastMessageTime(message.conversationId);
    
    return newMessage;
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async updateTransactionStatus(
    id: number,
    status: string,
    txHash?: string
  ): Promise<Transaction | undefined> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set({ 
        status,
        ...(txHash ? { txHash } : {})
      })
      .where(eq(transactions.id, id))
      .returning();
    
    return updatedTransaction;
  }

  async getMessageTransaction(messageId: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.messageId, messageId));
    
    return transaction;
  }

  // Connection operations
  async addConnection(connection: InsertConnection): Promise<Connection> {
    const [newConnection] = await db
      .insert(connections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async removeConnection(socketId: string): Promise<boolean> {
    const result = await db
      .delete(connections)
      .where(eq(connections.socketId, socketId));
    return result.rowCount > 0;
  }

  async getUserConnection(userId: number): Promise<Connection | undefined> {
    const [connection] = await db
      .select()
      .from(connections)
      .where(eq(connections.userId, userId));
    
    return connection;
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
