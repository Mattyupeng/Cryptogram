import React, { useState } from 'react';
import { Conversation } from '@/types';
import { Search, MenuIcon, PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useChat } from '@/hooks/useChat';
import { shortenAddress } from '@/lib/walletUtils';
import { useToast } from '@/hooks/use-toast';

interface ChatListProps {
  onToggleSidebar: () => void;
  conversations: Conversation[];
  currentConversationId?: number;
  onSelectConversation: (conversation: Conversation) => void;
}

const ChatList: React.FC<ChatListProps> = ({
  onToggleSidebar,
  conversations,
  currentConversationId,
  onSelectConversation
}) => {
  const { user } = useWallet();
  const { contacts, addContact, startNewConversation } = useChat();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [newContactAddress, setNewContactAddress] = useState('');
  const [newContactNickname, setNewContactNickname] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  
  // Filter conversations by search query
  const filteredConversations = conversations.filter(conversation => {
    // For now, we'll just check if any participant's address contains the search query
    return conversation.participants.some(participant => {
      const displayName = participant.ensName || participant.walletAddress;
      return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  });
  
  // Format the timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // If today, return time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this week, return day name
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise, return date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  // Get the other participant in a conversation
  const getOtherParticipant = (conversation: Conversation) => {
    if (!user) return conversation.participants[0]; // Default to first participant if no user
    const otherParticipant = conversation.participants.find(p => p.id !== user.id);
    return otherParticipant || conversation.participants[0]; // Fallback to first participant
  };
  
  // Handle adding a new contact
  const handleAddContact = async () => {
    if (!newContactAddress) {
      toast({
        title: "Address required",
        description: "Please enter a wallet address",
        variant: "destructive",
      });
      return;
    }
    
    setIsAddingContact(true);
    
    try {
      const contact = await addContact(newContactAddress, newContactNickname || undefined);
      
      if (contact) {
        toast({
          title: "Contact added successfully",
          description: "Go to the Contacts tab to start a conversation",
          variant: "default",
        });
        setNewContactAddress('');
        setNewContactNickname('');
        setAddContactOpen(false);
        setSearchQuery('@@contacts'); // Switch to contacts tab
      }
    } catch (error) {
      toast({
        title: "Error adding contact",
        description: error instanceof Error ? error.message : "Failed to add contact",
        variant: "destructive",
      });
    } finally {
      setIsAddingContact(false);
    }
  };
  
  return (
    <div className="w-full md:w-80 border-r border-border bg-card h-full overflow-hidden flex flex-col">
      {/* Header with search and menu */}
      <div className="p-4 border-b border-border flex items-center">
        <button 
          onClick={onToggleSidebar}
          className="md:hidden mr-2 p-1 rounded-lg hover:bg-muted"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search chats"
            className="w-full pl-10 bg-muted"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Tabs for Chats and Contacts */}
      <div className="border-b border-border">
        <div className="flex">
          <button 
            className={`flex-1 py-3 text-center font-medium ${searchQuery ? 'text-muted-foreground' : 'text-primary border-b-2 border-primary'}`}
            onClick={() => setSearchQuery('')}
          >
            Chats
          </button>
          <button 
            className={`flex-1 py-3 text-center font-medium ${searchQuery === '@@contacts' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setSearchQuery('@@contacts')}
          >
            Contacts
          </button>
        </div>
      </div>

      {/* Chat and Contacts list */}
      <div className="overflow-y-auto scrollbar-hide flex-1">
        {searchQuery === '@@contacts' ? (
          // Contacts View
          <>
            {contacts.length > 0 ? (
              contacts.map((contact) => {
                const displayName = contact.nickname || 
                  contact.user.ensName || 
                  shortenAddress(contact.user.walletAddress);
                
                // Get initials for avatar
                const initials = displayName.substring(0, 2).toUpperCase();
                
                return (
                  <div 
                    key={contact.id}
                    className="p-3 cursor-pointer hover:bg-muted"
                    onClick={async () => {
                      const conversation = await startNewConversation(contact.contactId);
                      if (conversation) {
                        setSearchQuery('');
                        onSelectConversation(conversation);
                        toast({
                          title: "Conversation started",
                          description: `Chat with ${contact.nickname || shortenAddress(contact.user.walletAddress)} started`,
                          variant: "default",
                        });
                      } else {
                        toast({
                          title: "Error",
                          description: "Failed to start conversation",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center mr-3">
                        <span className="text-white font-medium">{initials}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{displayName}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {shortenAddress(contact.user.walletAddress)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No contacts found.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add a new contact using the button below.
                </p>
              </div>
            )}
          </>
        ) : (
          // Conversations View
          <>
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => {
                const otherParticipant = getOtherParticipant(conversation);
                const isActive = conversation.id === currentConversationId;
                
                if (!otherParticipant) return null;
                
                const displayName = otherParticipant.ensName || shortenAddress(otherParticipant.walletAddress);
                const lastMessageTime = conversation.lastMessage 
                  ? formatTimestamp(conversation.lastMessage.sentAt)
                  : formatTimestamp(conversation.lastMessageAt);
                  
                const hasUnread = false; // We'll implement this later
                
                // Get initials for avatar
                const initials = displayName.substring(0, 2).toUpperCase();
                
                return (
                  <div 
                    key={conversation.id}
                    className={`p-3 cursor-pointer ${isActive ? 'border-l-4 border-primary bg-muted bg-opacity-40' : 'hover:bg-muted'}`}
                    onClick={() => onSelectConversation(conversation)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center mr-3">
                          <span className="text-white font-medium">{initials}</span>
                        </div>
                        <div>
                          <h3 className="font-medium">{displayName}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage?.decryptedContent || "No messages yet"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-xs text-muted-foreground">{lastMessageTime}</div>
                        {hasUnread && (
                          <Badge variant="default" className="rounded-full w-5 h-5 flex items-center justify-center text-xs mt-1">
                            1
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No conversations found.</p>
                {searchQuery && searchQuery !== '@@contacts' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Try a different search term or add a new contact.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Contact / Create New Chat */}
      <div className="p-4 border-t border-border">
        <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full flex items-center border-primary bg-background text-primary hover:bg-primary/10">
              <PlusCircle className="h-5 w-5 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a New Contact</DialogTitle>
              <DialogDescription>
                Enter a wallet address or ENS name to add a new contact.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Wallet Address or ENS</label>
                <Input
                  placeholder="0x... or name.eth"
                  value={newContactAddress}
                  onChange={(e) => setNewContactAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nickname (Optional)</label>
                <Input
                  placeholder="E.g. Friend"
                  value={newContactNickname}
                  onChange={(e) => setNewContactNickname(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setAddContactOpen(false)}
                disabled={isAddingContact}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddContact}
                disabled={isAddingContact || !newContactAddress}
              >
                {isAddingContact ? "Adding..." : "Add Contact"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ChatList;
