import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  ChatIcon,
  SidebarLeftIcon,
  DocumentIcon,
  SettingsIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BrainIcon
} from './Icons'; 

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface SavedItem {
  id: string;
  dateLabel: string;
  date: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, isOpen, onClose }) => {
  const [worksheets, setWorksheets] = useState<SavedItem[]>([]);
  const [messages, setMessages] = useState<SavedItem[]>([]);
  const [expandedSections, setExpandedSections] = useState<{ worksheets: boolean; messages: boolean }>({
    worksheets: false,
    messages: false,
  });

  // Load saved worksheets and messages from localStorage
  useEffect(() => {
    loadSavedItems();
  }, [activeView]);

  const loadSavedItems = () => {
    const worksheetItems: SavedItem[] = [];
    const messageItems: SavedItem[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          if (key.startsWith('worksheet_')) {
            const data = JSON.parse(localStorage.getItem(key) || '');
            worksheetItems.push({
              id: key.replace('worksheet_', ''),
              dateLabel: data.dateLabel || 'Untitled',
              date: data.createdAt || data.date,
            });
          } else if (key.startsWith('messages_')) {
            const data = JSON.parse(localStorage.getItem(key) || '');
            messageItems.push({
              id: key.replace('messages_', ''),
              dateLabel: data.dateLabel || 'Untitled',
              date: data.createdAt || data.date,
            });
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    worksheetItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    messageItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setWorksheets(worksheetItems.slice(0, 5));
    setMessages(messageItems.slice(0, 5));
  };

  const toggleSection = (section: 'worksheets' | 'messages') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleNavigate = (view: string) => {
    onNavigate(view);
    if (window.innerWidth < 768) onClose();
  };

  const NavButton: React.FC<{ 
    id: string; 
    label: string; 
    icon: React.ReactNode; 
    hasChildren?: boolean;
    isExpanded?: boolean;
    onToggle?: () => void;
  }> = ({ id, label, icon, hasChildren, isExpanded, onToggle }) => {
    const isActive = activeView === id || activeView.startsWith(id.replace('s_list', '') + '_');
    
    return (
      <button
        onClick={() => hasChildren && onToggle ? onToggle() : handleNavigate(id)}
        className={`w-full flex items-center justify-between p-3 px-4 rounded-xl transition-all duration-300 group relative overflow-hidden ${
          isActive 
            ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] border border-cyan-500/20' 
            : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent'
        }`}
      >
        <div className="flex items-center">
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-500 rounded-r-full shadow-[0_0_10px_#06b6d4]" />
          )}
          <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
            {icon}
          </span>
          <span className={`ml-3 text-sm font-medium relative z-10 ${isActive ? 'text-cyan-100' : ''}`}>
            {label}
          </span>
        </div>
        
        {hasChildren && (
          <span className="text-slate-500">
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </span>
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </button>
    );
  };

  const SubNavItem: React.FC<{ id: string; label: string }> = ({ id, label }) => {
    const isActive = activeView === id;
    
    return (
      <button
        onClick={() => handleNavigate(id)}
        className={`w-full text-left pl-12 pr-4 py-2 text-sm rounded-lg transition-colors ${
          isActive 
            ? 'text-cyan-400 bg-cyan-500/10' 
            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <aside 
      className={`fixed left-0 top-0 h-full w-64 flex flex-col backdrop-blur-xl bg-black/90 md:bg-black/40 border-r border-white/10 z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Logo Area */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.5)] flex-shrink-0" />
          <span className="ml-3 font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            FSD.Pro
          </span>
        </div>
        
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Close Menu"
        >
          <SidebarLeftIcon />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {/* Tomorrow - Main upload/generate */}
        <NavButton id="tomorrow" label="Plan Tomorrow" icon={<PlusIcon />} />

        {/* Local Assistant (NEW) */}
        <NavButton id="local_assistant" label="Local Assistant" icon={<BrainIcon />} />

        {/* Worksheets Section */}
        <div className="pt-2">
          <NavButton 
            id="worksheets_list" 
            label="Worksheets" 
            icon={<DocumentIcon />} 
            hasChildren={worksheets.length > 0}
            isExpanded={expandedSections.worksheets}
            onToggle={() => worksheets.length > 0 ? toggleSection('worksheets') : handleNavigate('worksheets_list')}
          />
          
          {expandedSections.worksheets && worksheets.length > 0 && (
            <div className="mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
              {worksheets.map(ws => (
                <SubNavItem 
                  key={ws.id} 
                  id={`worksheet_${ws.id}`} 
                  label={ws.dateLabel} 
                />
              ))}
              <button
                onClick={() => handleNavigate('worksheets_list')}
                className="w-full text-left pl-12 pr-4 py-2 text-xs text-slate-600 hover:text-cyan-400 transition-colors"
              >
                View all →
              </button>
            </div>
          )}
        </div>

        {/* Messages Section */}
        <div className="pt-1">
          <NavButton 
            id="messages_list" 
            label="Messages" 
            icon={<ChatIcon />} 
            hasChildren={messages.length > 0}
            isExpanded={expandedSections.messages}
            onToggle={() => messages.length > 0 ? toggleSection('messages') : handleNavigate('messages_list')}
          />
          
          {expandedSections.messages && messages.length > 0 && (
            <div className="mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
              {messages.map(msg => (
                <SubNavItem 
                  key={msg.id} 
                  id={`message_${msg.id}`} 
                  label={msg.dateLabel} 
                />
              ))}
              <button
                onClick={() => handleNavigate('messages_list')}
                className="w-full text-left pl-12 pr-4 py-2 text-xs text-slate-600 hover:text-cyan-400 transition-colors"
              >
                View all →
              </button>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="pt-4 border-t border-white/5 mt-4">
          <NavButton id="settings" label="Settings" icon={<SettingsIcon />} />
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center justify-start gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
          <div className="w-8 h-8 rounded-full bg-slate-700 border border-white/10" />
          <div>
            <p className="text-xs font-bold text-slate-300">Matt Engineer</p>
            <p className="text-[10px] text-cyan-500">Online</p>
          </div>
        </div>
      </div>
    </aside>
  );
};