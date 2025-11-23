import React, { useState, useEffect } from 'react';
import { 
  MicIcon, 
  MicOffIcon, 
  SearchIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  PencilIcon,
  CheckIcon,
  CloseIcon 
} from './Icons';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import type { JobData } from '../types';

interface JobCardProps extends JobData {
  index: number;
  onCommentChange: (index: number, comment: string) => void;
  onUpdateJob?: (index: number, updatedJob: JobData) => void; // Callback for saving edits
  savedComment?: string;
  agentApiUrl: string;
}

export const JobCard: React.FC<JobCardProps> = ({
  index,
  time,
  address,
  productCode,
  productType,
  productBrand,
  fault,
  errorCode,
  productionYear,
  serialNumber,
  onCommentChange,
  onUpdateJob,
  savedComment = '',
  agentApiUrl,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [comment, setComment] = useState(savedComment);
  
  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<JobData>({
    time, address, productCode, productType, productBrand, 
    fault, errorCode, productionYear, serialNumber
  });

  // Parts search state
  const [showPartsSearch, setShowPartsSearch] = useState(false);
  const [partDescription, setPartDescription] = useState('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'complete' | 'failed'>('idle');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);

  // Speech Recognition Hook
  const { isListening, toggleListening, isSupported } = useSpeechRecognition({
    onResult: (text) => setComment((prev) => prev + text),
    continuous: true,
    interimResults: true
  });

  // Debounce save comment
  useEffect(() => {
    const timer = setTimeout(() => {
      onCommentChange(index, comment);
    }, 500);
    return () => clearTimeout(timer);
  }, [comment, index, onCommentChange]);

  // --- Handlers for Edit Mode ---
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    setIsEditing(true);
    setIsExpanded(true); // Force expand to see fields
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateJob) {
      onUpdateJob(index, editValues);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Revert values
    setEditValues({
      time, address, productCode, productType, productBrand, 
      fault, errorCode, productionYear, serialNumber
    });
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof JobData, value: string) => {
    setEditValues(prev => ({...prev, [field]: value }));
  };

  // --- Parts Search Logic (Existing) ---
  useEffect(() => {
    if (searchStatus !== 'searching' || !currentJobId) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${agentApiUrl}/job/${currentJobId}`);
        const data = await response.json();
        if (data.status === 'success') {
          setSearchResult(data.result);
          setSearchStatus('complete');
          clearInterval(interval);
        } else if (data.status === 'failed') {
          setSearchResult(data.result || 'Could not find part');
          setSearchStatus('failed');
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [searchStatus, currentJobId, agentApiUrl]);

  const handlePartsSearch = async () => {
    if (!partDescription.trim()) return;
    setSearchStatus('searching');
    setSearchResult(null);
    try {
      const response = await fetch(`${agentApiUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_number: productCode,
          part_description: partDescription.trim(),
          equipment_type: productType.toLowerCase().replace(/\s+/g, '-'),
        }),
      });
      if (!response.ok) throw new Error('Failed to submit');
      const data = await response.json();
      setCurrentJobId(data.job_id);
    } catch (error) {
      setSearchStatus('failed');
      setSearchResult('Could not connect to agent');
    }
  };

  // Helper for rendering fields
  const RenderField = ({ label, field, value }: { label: string, field: keyof JobData, value: string }) => (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      {isEditing ? (
        <input 
          type="text" 
          value={editValues[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-cyan-500 outline-none"
        />
      ) : (
        <p className="text-sm text-white font-mono truncate" title={value}>{value || 'N/A'}</p>
      )}
    </div>
  );

  return (
    <div className={`bg-black/30 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-300 ${isEditing ? 'border-cyan-500/50 ring-1 ring-cyan-500/30' : 'border-white/10'}`}>
      {/* Card Header */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {index + 1}
          </div>
          <div className="min-w-0">
            {isEditing ? (
               <input 
                type="text"
                value={editValues.address}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white font-semibold w-full mb-1"
                placeholder="Address"
               />
            ) : (
               <p className="font-semibold text-white truncate">{address}</p>
            )}
            
            <p className="text-sm text-slate-400 truncate">
              {time} • {isEditing ? editValues.productType : productType}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {errorCode && !isEditing && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hidden sm:inline-block">
              {errorCode}
            </span>
          )}
          
          {/* Edit/Save Actions */}
          {isEditing ? (
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1 border border-slate-600">
              <button onClick={handleSaveEdit} className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded" title="Save Changes">
                <CheckIcon />
              </button>
              <button onClick={handleCancelEdit} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded" title="Cancel">
                <CloseIcon />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleEditClick}
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
              title="Edit Job Details"
            >
              <PencilIcon />
            </button>
          )}

          {!isEditing && (isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />)}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Job Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white/5 rounded-xl">
            <RenderField label="Product Code" field="productCode" value={productCode} />
            <RenderField label="Brand" field="productBrand" value={productBrand} />
            <RenderField label="Year" field="productionYear" value={productionYear} />
            <RenderField label="Serial" field="serialNumber" value={serialNumber} />
          </div>

          {/* Fault Description */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-xs text-amber-400 uppercase tracking-wider mb-1">Fault Description</p>
            {isEditing ? (
              <textarea 
                value={editValues.fault}
                onChange={(e) => handleInputChange('fault', e.target.value)}
                className="w-full bg-slate-900/50 border border-amber-500/30 rounded p-2 text-amber-100 text-sm focus:ring-1 focus:ring-amber-500 outline-none"
                rows={3}
              />
            ) : (
              <p className="text-sm text-amber-100">{fault}</p>
            )}
          </div>

          {/* Comments Section with Robust Speech-to-Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Engineer Notes</p>
              <button
                onClick={toggleListening}
                disabled={!isSupported}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                  isListening 
                   ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                    : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white'
                }`}
                title={isListening ? 'Stop recording' : 'Start voice input'}
              >
                {isListening ? <MicOffIcon /> : <MicIcon />}
                {isListening && <span className="text-xs font-bold">REC</span>}
              </button>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add notes about this job..."
              className="w-full h-24 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
            />
            {isListening && (
              <p className="text-xs text-red-400 animate-pulse">
                🎤 Listening... (Speak clearly, pauses will auto-resume)
              </p>
            )}
          </div>

          {/* Parts Search (Unchanged logic, just wrapped) */}
          <div className="border-t border-white/10 pt-4">
            <button
              onClick={() => setShowPartsSearch(!showPartsSearch)}
              className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <SearchIcon />
              {showPartsSearch ? 'Hide Parts Search' : 'Search for Parts'}
            </button>

            {showPartsSearch && (
              <div className="mt-4 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={partDescription}
                    onChange={(e) => setPartDescription(e.target.value)}
                    placeholder="e.g. door seal..."
                    className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm"
                  />
                  <button
                    onClick={handlePartsSearch}
                    disabled={searchStatus === 'searching' || !partDescription.trim()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    {searchStatus === 'searching' ? 'Searching...' : 'Find'}
                  </button>
                </div>
                {searchStatus === 'complete' && searchResult && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-sm text-emerald-100 font-mono">{searchResult}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};