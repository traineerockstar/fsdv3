import React, { useState, useEffect } from 'react';
import { ChatIcon, ChevronRightIcon, TrashIcon, CopyIcon, CheckIcon } from './Icons';
import type { SavedMessages } from '../types';

interface MessagesListProps {
  onSelectMessages?: (id: string) => void;
}

export const MessagesList: React.FC<MessagesListProps> = ({ onSelectMessages }) => {
  const [messageGroups, setMessageGroups] = useState<SavedMessages[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SavedMessages | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = () => {
    const groups: SavedMessages[] = [];
    
    // Scan localStorage for messages
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('messages_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          groups.push({
            id: key.replace('messages_', ''),
            date: data.date,
            dateLabel: data.dateLabel || data.date,
            messages: data.messages || [],
            createdAt: data.createdAt || data.date,
          });
        } catch (e) {
          console.error('Failed to parse messages:', key);
        }
      }
    }

    // Sort by date descending
    groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMessageGroups(groups);
  };

  const deleteMessages = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete these messages?')) {
      localStorage.removeItem(`messages_${id}`);
      loadMessages();
      if (selectedGroup?.id === id) {
        setSelectedGroup(null);
      }
    }
  };

  const copyMessage = async (message: string, index: number) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyAllMessages = async () => {
    if (!selectedGroup) return;
    try {
      await navigator.clipboard.writeText(selectedGroup.messages.join('\n\n---\n\n'));
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
    } catch {
      return dateStr;
    }
  };

  // Show individual messages when a group is selected
  if (selectedGroup) {
    return (
      <div className="max-w-2xl mx-auto">
        <header className="space-y-4 mb-8">
          <button
            onClick={() => setSelectedGroup(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRightIcon />
            <span>Back to messages</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500">
                {selectedGroup.dateLabel}
              </h1>
              <p className="text-slate-400 font-light mt-1">
                {selectedGroup.messages.length} message{selectedGroup.messages.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <button
              onClick={copyAllMessages}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-200 transition-colors"
            >
              {copiedIndex === -1 ? <CheckIcon /> : <CopyIcon />}
              {copiedIndex === -1 ? 'Copied!' : 'Copy All'}
            </button>
          </div>
        </header>

        <div className="space-y-4">
          {selectedGroup.messages.map((message, index) => (
            <div
              key={index}
              className="relative group bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs text-white font-bold">
                      {index + 1}
                    </span>
                    <span className="text-xs text-slate-500">Customer {index + 1}</span>
                  </div>
                  <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                    {message}
                  </p>
                </div>
                
                <button
                  onClick={() => copyMessage(message, index)}
                  className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                  title="Copy message"
                >
                  {copiedIndex === index ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show list of message groups
  if (messageGroups.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <header className="space-y-4 mb-8">
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500">
            Customer Messages
          </h1>
          <p className="text-slate-400 text-lg font-light">
            Your saved notification messages will appear here
          </p>
        </header>

        <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
          <ChatIcon />
          <p className="text-slate-400 mt-4">No messages yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Generate a schedule to create customer messages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <header className="space-y-4 mb-8">
        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500">
          Customer Messages
        </h1>
        <p className="text-slate-400 text-lg font-light">
          {messageGroups.length} saved message set{messageGroups.length !== 1 ? 's' : ''}
        </p>
      </header>

      <div className="space-y-3">
        {messageGroups.map((group) => (
          <div
            key={group.id}
            onClick={() => setSelectedGroup(group)}
            className="group relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:bg-white/5 hover:border-cyan-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center">
                  <ChatIcon />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{group.dateLabel}</h3>
                  <p className="text-sm text-slate-400">
                    {group.messages.length} message{group.messages.length !== 1 ? 's' : ''} • {formatDate(group.createdAt)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => deleteMessages(group.id, e)}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete messages"
                >
                  <TrashIcon />
                </button>
                <ChevronRightIcon />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};