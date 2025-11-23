import React, { useState, useEffect, useRef } from 'react';
import { useLocalLLM } from '../hooks/useLocalLLM';
import { BrainIcon, MicIcon, ChevronRightIcon } from './Icons';

export const ChatInterface: React.FC = () => {
  const { 
    initEngine, 
    progress, 
    loadPercentage, 
    isLoading, 
    isReady, 
    messages, 
    isGenerating, 
    sendMessage,
    resetChat 
  } = useLocalLLM();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isReady && !isLoading) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-[70vh] text-center space-y-8">
        <div className="w-24 h-24 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-violet-500/20">
          <BrainIcon />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white mb-2">Local AI Assistant</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            Initialize the Llama-3-8B model locally in your browser. 
            This downloads ~4GB of data and caches it for offline use.
          </p>
        </div>
        <button 
          onClick={initEngine}
          className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg hover:shadow-white/20"
        >
          Initialize Inference Engine
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center justify-center h-[70vh] space-y-8">
        <div className="w-full space-y-4">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-white">Loading Model Weights</span>
            <span className="text-cyan-400">{loadPercentage || 0}%</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${loadPercentage}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 font-mono text-center animate-pulse">
            {progress || "Initializing worker..."}
          </p>
        </div>
        <p className="text-slate-400 text-sm max-w-xs text-center">
          Please wait while we cache the model. Do not close this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600/20 text-violet-400 rounded-lg flex items-center justify-center border border-violet-500/30">
            <BrainIcon />
          </div>
          <div>
            <h3 className="font-bold text-white">Llama-3-8B-Instruct</h3>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              Running Locally (WebGPU)
            </p>
          </div>
        </div>
        <button 
          onClick={resetChat}
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors"
        >
          Clear Chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center opacity-50">
            <p className="text-slate-500">Ask me anything about industrial maintenance...</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-tl-sm flex gap-2 items-center">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/40 border-t border-white/10">
        <div className="relative flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 resize-none h-14 max-h-32 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={isGenerating || !input.trim()}
            className="absolute right-2 top-2 p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg disabled:opacity-50 disabled:hover:bg-violet-600 transition-all shadow-lg"
          >
            <ChevronRightIcon />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-2 text-center">
          AI runs completely on-device. No data leaves your browser.
        </p>
      </div>
    </div>
  );
};