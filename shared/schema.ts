import { pgTable, text, serial, timestamp, jsonb, primaryKey, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table (wallet addresses)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  ensName: text("ens_name"),
  publicKey: text("public_key").notNull(),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contactId: integer("contact_id").notNull().references(() => users.id),
  nickname: text("nickname"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participantIds: text("participant_ids").array().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  encryptedContent: text("encrypted_content").notNull(),
  iv: text("iv").notNull(), // Initialization vector for encryption
  sentAt: timestamp("sent_at").defaultNow(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  amount: text("amount").notNull(),
  currency: text("currency").notNull(),
  chain: text("chain").notNull(),
  status: text("status").notNull(),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow(),
});

// WebSocket connections
export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  socketId: text("socket_id").notNull(),
  connectedAt: timestamp("connected_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  connectedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connections.$inferSelect;

// WebSocket message types
export const messageTypes = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  NEW_MESSAGE: 'new_message',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  USER_TYPING: 'user_typing',
  TRANSACTION_UPDATE: 'transaction_update',
} as const;

export type WebSocketMessage = {
  type: string;
  payload: any;
};

// Additional types for client-side
export type ContactWithUser = Contact & {
  user: User;
};

export type MessageWithSender = Message & {
  sender: User;
};

export type ConversationWithParticipants = Conversation & {
  participants: User[];
  lastMessage?: MessageWithSender;
};

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  contacts: many(contacts, { relationName: "user_contacts" }),
  sentMessages: many(messages, { relationName: "message_sender" }),
  connections: many(connections),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
    relationName: "user_contacts"
  }),
  contactUser: one(users, {
    fields: [contacts.contactId],
    references: [users.id]
  })
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages)
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id]
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "message_sender"
  }),
  transaction: many(transactions)
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  message: one(messages, {
    fields: [transactions.messageId],
    references: [messages.id]
  })
}));

export const connectionsRelations = relations(connections, ({ one }) => ({
  user: one(users, {
    fields: [connections.userId],
    references: [users.id]
  })
}));
