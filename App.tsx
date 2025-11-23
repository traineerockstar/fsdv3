import React, { useState, useCallback, useMemo } from 'react';
import { processFieldDataFromImages } from './services/geminiService';
import type { ProcessedData } from './types';
import { ImageUploader } from './components/ImageUploader';
import { TimeSlotManager } from './components/TimeSlotManager';
import { Sidebar } from './components/Sidebar';
import { SidebarLeftIcon } from './components/Icons';
import { WorksheetList } from './components/WorksheetList';
import { WorksheetView } from './components/WorksheetView';
import { MessagesList } from './components/MessagesList';
import { ChatInterface } from './components/ChatInterface';

// Helper to parse markdown table into job objects
const parseMarkdownTable = (markdown: string) => {
  const lines = markdown.trim().split('\n');
  const jobs: any[] = [];
  
  for (const line of lines) {
    if (!line.includes('|') || line.includes('---') || (line.toLowerCase().includes('time') && line.toLowerCase().includes('address'))) {
      continue;
    }
    
    const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
    // Note: splitting by | usually leaves empty strings at start/end
    // The regex /\|/ gives us parts. A valid row: | data | data |
    // Split results: ["", "data", "data", ""]
    
    const cleanCols = line.split('|').slice(1, -1).map(c => c.trim());
    
    if (cleanCols.length >= 8) {
      jobs.push({
        time: cleanCols[0] || 'TBD',
        address: cleanCols[1] || '',
        productCode: cleanCols[2] || '',
        productType: cleanCols[3] || '',
        productBrand: cleanCols[4] || '',
        fault: cleanCols[5] || '',
        errorCode: cleanCols[6] || '',
        productionYear: cleanCols[7] || '',
        serialNumber: cleanCols[8] || '',
      });
    }
  }
  
  return jobs;
};

// Helper to get date label from markdown (first line usually has date)
const extractDateLabel = (markdown: string): string => {
  const firstLine = markdown.trim().split('\n')[0];
  // Look for day/date pattern like "Thursday, Nov 13"
  const match = firstLine.match(/([A-Za-z]+day,?\s+[A-Za-z]+\s+\d+)/i);
  if (match) return match[1];
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
};

export default function App(): React.ReactElement {
  const [activeView, setActiveView] = useState<string>('tomorrow');
  const [stage, setStage] = useState<'input' | 'review' | 'saved'>('input');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [timeSlots, setTimeSlots] = useState<{ start: string; end: string; }[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [jobCount, setJobCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  
  // For viewing specific worksheets
  const [selectedWorksheetId, setSelectedWorksheetId] = useState<string | null>(null);

  // --- EXTRACT ADDRESSES FOR TIME SLOT MANAGER ---
  const extractedAddresses = useMemo(() => {
    if (!processedData?.dataTable) return [];
    const jobs = parseMarkdownTable(processedData.dataTable);
    return jobs.map(j => j.address);
  }, [processedData]);

  const handleProcessImages = useCallback(async () => {
    if (imageFiles.length === 0) {
      setError("Please upload at least one image.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    setProcessedData(null);

    try {
      const base64Images = await Promise.all(
        imageFiles.map(file => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        }))
      );

      const result = await processFieldDataFromImages(base64Images);
      setProcessedData(result);
      setJobCount(result.notifications.length);
      setStage('review');
    } catch (e) {
      console.error(e);
      setError("An error occurred while processing the images. Please ensure API Key is set.");
    } finally {
      setIsProcessing(false);
    }
  }, [imageFiles]);

  // --- SAVE WORKSHEET AND MESSAGES ---
  const handleSaveWorksheet = () => {
    if (!processedData) return;

    const dateLabel = extractDateLabel(processedData.dataTable);
    const worksheetId = Date.now().toString();
    const messagesId = worksheetId; // Same ID for correlation

    // Parse jobs from table
    const jobs = parseMarkdownTable(processedData.dataTable);

    // Update notifications with time slots
    const finalMessages = processedData.notifications.map((msg, index) => {
      const slot = timeSlots[index];
      const timeString = slot ? `${slot.start} - ${slot.end}` : '[TIME]';
      return msg.replace('{{TIME_SLOT}}', timeString);
    });

    // Save worksheet
    const worksheetPayload = {
      dateLabel,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      timeSlots,
      jobs,
      comments: {},
    };
    localStorage.setItem(`worksheet_${worksheetId}`, JSON.stringify(worksheetPayload));

    // Save messages
    const messagesPayload = {
      dateLabel,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      messages: finalMessages,
    };
    localStorage.setItem(`messages_${messagesId}`, JSON.stringify(messagesPayload));

    setStage('saved');
  };

  const handleStartNew = () => {
    setStage('input');
    setImageFiles([]);
    setTimeSlots([]);
    setProcessedData(null);
    setJobCount(0);
  };

  const handleImagesSelected = (files: File[]) => setImageFiles(files);

  // --- NAVIGATION HANDLER ---
  const handleNavigate = (view: string) => {
    setActiveView(view);
    
    // Handle worksheet_ID format
    if (view.startsWith('worksheet_')) {
      setSelectedWorksheetId(view.replace('worksheet_', ''));
    } else {
      setSelectedWorksheetId(null);
    }
  };

  // --- RENDER ---
  const renderContent = () => {
    // Tomorrow - Upload and Generate
    if (activeView === 'tomorrow') {
      return (
        <div className="max-w-4xl mx-auto space-y-12">
          <header className="space-y-4 mb-12">
            <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500 drop-shadow-sm">
              Plan Tomorrow's Schedule
            </h1>
            <p className="text-slate-400 text-lg font-light max-w-2xl leading-relaxed">
              {stage === 'input' ? "Upload screenshots from Field Service Lightning to generate your worksheet." : 
               stage === 'review' ? "Review and adjust your time slots, then save." : 
               "Worksheet saved successfully!"}
            </p>
          </header>

          {stage === 'input' && (
            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
                <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 p-2 rounded-3xl">
                  <ImageUploader onFilesSelected={handleImagesSelected} />
                </div>
              </div>
              {error && <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/20">{error}</div>}
              <div className="flex justify-end">
                <button onClick={handleProcessImages} disabled={isProcessing || imageFiles.length === 0} className="px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all disabled:opacity-50">
                  {isProcessing ? "Analyzing..." : "Generate Schedule"}
                </button>
              </div>
            </div>
          )}

          {stage === 'review' && processedData && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <TimeSlotManager 
                jobCount={jobCount} 
                timeSlots={timeSlots} 
                onTimeSlotsChange={setTimeSlots} 
                addresses={extractedAddresses} 
              />

              <div className="flex justify-end">
                <button 
                  onClick={handleSaveWorksheet} 
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-3"
                >
                  Save Worksheet & Messages
                </button>
              </div>
            </div>
          )}

          {stage === 'saved' && (
            <div className="text-center py-24 space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white">Worksheet Saved!</h2>
              <p className="text-slate-400">Your worksheet and customer messages have been saved.</p>
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => handleNavigate('worksheets_list')} 
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-200"
                >
                  View Worksheets
                </button>
                <button 
                  onClick={handleStartNew} 
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-medium"
                >
                  Create Another
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Worksheets List
    if (activeView === 'worksheets_list') {
      return (
        <WorksheetList 
          onSelectWorksheet={(id) => handleNavigate(`worksheet_${id}`)} 
        />
      );
    }

    // Individual Worksheet View
    if (activeView.startsWith('worksheet_') && selectedWorksheetId) {
      return (
        <WorksheetView 
          worksheetId={selectedWorksheetId}
          onBack={() => handleNavigate('worksheets_list')}
        />
      );
    }

    // Messages List
    if (activeView === 'messages_list' || activeView.startsWith('message_')) {
      return <MessagesList />;
    }

    // Local Assistant
    if (activeView === 'local_assistant') {
      return <ChatInterface />;
    }

    // Settings
    if (activeView === 'settings') {
      return (
        <div className="max-w-2xl mx-auto">
          <header className="space-y-4 mb-8">
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500">
              Settings
            </h1>
          </header>

          <div className="space-y-6">
            {/* Agent Settings */}
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Parts Search Agent</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Agent API URL</label>
                  <input
                    type="text"
                    defaultValue={localStorage.getItem('agentApiUrl') || 'http://localhost:8000'}
                    onChange={(e) => localStorage.setItem('agentApiUrl', e.target.value)}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="http://your-pc:8000"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    The URL of your home PC running the GiasTech browser agent.
                    Use Tailscale or Cloudflare Tunnel to access remotely.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Data Management</h2>
              <button
                onClick={() => {
                  if (confirm('Clear all saved worksheets and messages? This cannot be undone.')) {
                    const keys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key && (key.startsWith('worksheet_') || key.startsWith('messages_'))) {
                        keys.push(key);
                      }
                    }
                    keys.forEach(k => localStorage.removeItem(k));
                    alert('Data cleared');
                  }
                }}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl text-sm transition-colors"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <div className="text-center py-40 text-slate-500">View: {activeView}</div>;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black text-slate-200 font-sans selection:bg-cyan-500/30 flex overflow-hidden">
      <Sidebar 
        activeView={activeView} 
        onNavigate={handleNavigate} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Open Sidebar Button */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className={`fixed top-4 left-4 md:top-6 md:left-6 z-[60] p-2.5 rounded-xl bg-black/50 text-white backdrop-blur-md border border-white/10 shadow-lg hover:bg-white/10 hover:scale-105 transition-all duration-300 ${isSidebarOpen ? 'opacity-0 pointer-events-none -translate-x-4' : 'opacity-100 translate-x-0'}`}
        aria-label="Open Menu"
      >
        <SidebarLeftIcon />
      </button>

      <main className={`flex-1 h-screen overflow-y-auto w-full relative scroll-smooth transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
        <div className="p-6 md:p-12 pb-32 md:pb-12 max-w-[1600px] mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}