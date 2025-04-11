import React from 'react';
import { useWallet } from '@/hooks/useWallet';
import WalletConnector from '../wallet/WalletConnector';
import { ThemeMode } from '@/types';
import { 
  Sun, 
  Moon, 
  MessageSquare, 
  Users, 
  HelpCircle, 
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose,
  theme,
  onToggleTheme
}) => {
  const { wallet } = useWallet();
  
  return (
    <aside 
      className={cn(
        "bg-sidebar fixed md:relative w-64 h-full z-30 md:z-auto border-r border-sidebar-border transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="flex flex-col h-full">
        {/* App Logo and Theme Toggle */}
        <div className="flex justify-between items-center p-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <h1 className="text-xl font-semibold text-sidebar-foreground">CryptoChat</h1>
          </div>
          <button 
            onClick={onToggleTheme} 
            className="p-2 rounded-full hover:bg-sidebar-accent hover:bg-opacity-10"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-sidebar-foreground" />
            ) : (
              <Moon className="h-5 w-5 text-sidebar-foreground" />
            )}
          </button>
        </div>

        {/* Wallet Connection */}
        <div className="p-4 border-b border-sidebar-border">
          <WalletConnector />
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-2">
          <Link href="/" className="flex items-center py-2 px-3 rounded-lg bg-primary bg-opacity-20 text-primary">
            <MessageSquare className="h-5 w-5 mr-3" />
            Chats
          </Link>
          <Link href="/contacts" className="flex items-center py-2 px-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:bg-opacity-10 transition-colors">
            <Users className="h-5 w-5 mr-3" />
            Contacts
          </Link>
          <Link href="/help" className="flex items-center py-2 px-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:bg-opacity-10 transition-colors">
            <HelpCircle className="h-5 w-5 mr-3" />
            Help
          </Link>
        </nav>

        {/* Settings and Preferences */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Link href="/settings" className="flex items-center py-2 px-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:bg-opacity-10 transition-colors">
            <Settings className="h-5 w-5 mr-3" />
            Settings
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
