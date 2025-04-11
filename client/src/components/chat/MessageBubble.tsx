import React from 'react';
import { Message, User } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { CheckIcon, LockIcon, Shield } from 'lucide-react';
import { shortenAddress } from '@/lib/walletUtils';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  otherParticipant?: User;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  otherParticipant
}) => {
  // Format timestamp
  const formatTimestamp = (date: string) => {
    try {
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Get initials for the avatar
  const getInitials = (user?: User) => {
    if (!user) return '??';
    
    const displayName = user.ensName || shortenAddress(user.walletAddress);
    return displayName.substring(0, 2).toUpperCase();
  };

  // Render transaction card if the message is a transaction
  const renderTransactionCard = () => {
    if (!message.isTransaction || !message.transaction) return null;
    
    const { amount, asset, chain, status } = message.transaction;
    const isCompleted = status === 'completed';
    
    return (
      <div className="mt-3 p-3 bg-background rounded-lg border border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary/20 mr-2 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{amount} {asset}</p>
              <p className="text-xs text-muted-foreground capitalize">{chain}</p>
            </div>
          </div>
          <div className={`text-xs ${isCompleted ? 'text-primary' : 'text-amber-500'}`}>
            {status === 'completed' ? 'Completed' : status === 'pending' ? 'Pending' : 'Failed'}
          </div>
        </div>
        {message.transaction.txHash && (
          <div className="mt-2 text-xs text-muted-foreground truncate">
            Tx: {message.transaction.txHash}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex mb-4 ${isCurrentUser ? 'justify-end' : ''}`}>
      {!isCurrentUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center mr-2">
          <span className="text-white text-xs">{getInitials(message.sender)}</span>
        </div>
      )}
      <div>
        <div className={`rounded-lg p-3 mb-1 max-w-[80%] ${
          isCurrentUser 
            ? 'bg-primary bg-opacity-20 text-foreground ml-auto' 
            : 'bg-card text-card-foreground'
        }`}>
          <p>{message.decryptedContent}</p>
          {renderTransactionCard()}
        </div>
        <div className={`flex items-center text-xs text-muted-foreground ${
          isCurrentUser ? 'justify-end' : ''
        }`}>
          <span>{formatTimestamp(message.sentAt)}</span>
          {isCurrentUser && (
            <div className="ml-1 text-primary">
              {message.isPending ? (
                <span className="text-muted-foreground">
                  <CheckIcon className="h-4 w-4" />
                </span>
              ) : (
                <CheckIcon className="h-4 w-4" />
              )}
            </div>
          )}
          <LockIcon className="h-3 w-3 ml-1 text-accent" title="End-to-end encrypted" />
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
