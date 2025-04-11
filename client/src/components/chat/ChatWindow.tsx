import React, { useState, useRef, useEffect } from 'react';
import { Conversation, Message, User } from '@/types';
import { useWallet } from '@/hooks/useWallet';
import { useChat } from '@/hooks/useChat';
import { shortenAddress } from '@/lib/walletUtils';
import MessageBubble from './MessageBubble';
import CryptoTransferDialog from './CryptoTransferDialog';
import { 
  Send, 
  DollarSign, 
  Paperclip, 
  Video, 
  MoreVertical,
  ArrowLeft
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ChatWindowProps {
  conversation: Conversation;
  onBackToList?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, onBackToList }) => {
  const { user } = useWallet();
  const { 
    currentMessages, 
    sendMessage, 
    transferDialog, 
    openTransferDialog, 
    closeTransferDialog 
  } = useChat();
  
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get the other participant
  const otherParticipant = conversation.participants.find(
    p => user && p.id !== user.id
  );
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);
  
  // Get user's online status (future enhancement)
  const isOnline = true; // Mock for now
  
  // Get display name for the conversation
  const getDisplayName = (participant: User | undefined) => {
    if (!participant) return 'Unknown';
    return participant.ensName || shortenAddress(participant.walletAddress);
  };
  
  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.sentAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages,
    }));
  };
  
  // Get date separator text
  const getDateSeparatorText = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    await sendMessage(messageInput.trim());
    setMessageInput('');
  };
  
  // Handle pressing Enter to send a message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Render typing indicator
  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    return (
      <div className="flex mb-4">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center mr-2">
          <span className="text-white text-xs">
            {otherParticipant ? getDisplayName(otherParticipant).substring(0, 2).toUpperCase() : '??'}
          </span>
        </div>
        <div className="bg-card rounded-lg p-3 message-bubble">
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  };
  
  const messageGroups = groupMessagesByDate(currentMessages);
  
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center">
          {onBackToList && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden mr-2"
              onClick={onBackToList}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center mr-3">
            <span className="text-white font-medium">
              {otherParticipant ? getDisplayName(otherParticipant).substring(0, 2).toUpperCase() : '??'}
            </span>
          </div>
          <div>
            <h3 className="font-medium">
              {otherParticipant ? getDisplayName(otherParticipant) : 'Unknown'}
            </h3>
            <div className="flex items-center">
              <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'} mr-2`}></span>
              <span className="text-xs text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon">
            <Video className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-muted/10">
        {messageGroups.map(({ date, messages }, groupIndex) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex justify-center mb-4 mt-4">
              <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                {getDateSeparatorText(date)}
              </span>
            </div>
            
            {/* Messages for this date */}
            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.id}-${index}`}
                message={message}
                isCurrentUser={user ? message.senderId === user.id : false}
                otherParticipant={otherParticipant}
              />
            ))}
          </div>
        ))}
        
        {/* Typing indicator */}
        {renderTypingIndicator()}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center">
          <Button variant="ghost" size="icon">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div className="relative flex-1 mx-2">
            <Input
              type="text"
              placeholder="Type a message"
              className="w-full py-2 px-4 bg-muted"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
          <div className="flex">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => openTransferDialog()}
              className="text-muted-foreground hover:text-primary mr-1"
            >
              <DollarSign className="h-5 w-5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Crypto Transfer Dialog */}
      {transferDialog.isOpen && (
        <CryptoTransferDialog 
          isOpen={transferDialog.isOpen}
          onClose={closeTransferDialog}
          recipient={transferDialog.recipient}
          conversationId={transferDialog.conversationId}
        />
      )}
    </div>
  );
};

export default ChatWindow;
