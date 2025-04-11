import React, { useState, useEffect, ReactNode } from 'react';
import Sidebar from './Sidebar';
import ChatList from './ChatList';
import ChatWindow from '../chat/ChatWindow';
import { useWallet } from '@/hooks/useWallet';
import { useChat } from '@/hooks/useChat';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { ThemeMode } from '@/types';

interface AppLayoutProps {
  children?: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { wallet, user } = useWallet();
  const { currentConversation, setCurrentConversation, conversations, wsConnected } = useChat();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const { toast } = useToast();
  
  // Effect to check if WebSocket is connected
  useEffect(() => {
    if (!wsConnected && user) {
      toast({
        title: "Connection issue",
        description: "Trying to reconnect to the messaging service...",
        variant: "destructive",
      });
    }
  }, [wsConnected, user, toast]);
  
  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Toggle theme between light and dark mode
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Update document classes
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  // Set dark mode by default
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Overlay for Sidebar */}
      <div 
        className={`md:hidden fixed inset-0 bg-black bg-opacity-50 z-20 ${mobileMenuOpen ? 'block' : 'hidden'}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      
      {/* Sidebar - Hidden on mobile unless toggled */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block`}>
        <Sidebar 
          isOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)} 
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>
      
      {/* Chat List - Hidden on mobile when conversation is selected */}
      <div className={`${currentConversation && window.innerWidth < 768 ? 'hidden' : 'block'} md:block`}>
        <ChatList 
          onToggleSidebar={toggleSidebar}
          conversations={conversations}
          currentConversationId={currentConversation?.id}
          onSelectConversation={(conversation) => {
            setCurrentConversation(conversation);
            // On mobile, ChatList will be hidden when a conversation is selected
          }}
        />
      </div>
      
      {/* Content Area: Children or Chat Window */}
      <div className={`flex-1 ${!currentConversation && window.innerWidth < 768 ? 'hidden' : 'block'}`}>
        {children ? (
          children
        ) : currentConversation ? (
          <ChatWindow 
            conversation={currentConversation}
            onBackToList={() => window.innerWidth < 768 && setCurrentConversation(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-muted/10">
            <div className="text-center p-8">
              <h2 className="text-2xl font-semibold mb-2">Welcome to CryptoChat</h2>
              <p className="text-muted-foreground">
                {wallet && user 
                  ? "Select a conversation to start chatting or add a new contact." 
                  : "Connect your wallet to start secure, encrypted conversations."}
              </p>
            </div>
          </div>
        )}
      </div>
      
      <Toaster />
    </div>
  );
};

export default AppLayout;
