import React, { useState, useEffect, useCallback } from 'react';
import { JobCard } from './JobCard';
import { ChevronLeftIcon } from './Icons';
import type { WorksheetData, JobData } from '../types';

interface WorksheetViewProps {
  worksheetId: string;
  onBack: () => void;
}

const AGENT_API_URL = localStorage.getItem('agentApiUrl') || 'http://localhost:8000';

export const WorksheetView: React.FC<WorksheetViewProps> = ({ worksheetId, onBack }) => {
  const [worksheet, setWorksheet] = useState<WorksheetData | null>(null);
  const [comments, setComments] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    const saved = localStorage.getItem(`worksheet_${worksheetId}`);
    if (saved) {
      const data = JSON.parse(saved);
      setWorksheet(data);
      setComments(data.comments || {});
    }
  }, [worksheetId]);

  const handleCommentChange = useCallback((index: number, comment: string) => {
    setComments(prev => {
      const updated = { ...prev, [index]: comment };
      if (worksheet) {
        const updatedWorksheet = { ...worksheet, comments: updated };
        localStorage.setItem(`worksheet_${worksheetId}`, JSON.stringify(updatedWorksheet));
      }
      return updated;
    });
  }, [worksheet, worksheetId]);

  const handleUpdateJob = useCallback((index: number, updatedJob: JobData) => {
    if (!worksheet) return;
    
    const newJobs = [...worksheet.jobs];
    newJobs[index] = updatedJob;
    
    const updatedWorksheet = { ...worksheet, jobs: newJobs };
    setWorksheet(updatedWorksheet);
    localStorage.setItem(`worksheet_${worksheetId}`, JSON.stringify(updatedWorksheet));
  }, [worksheet, worksheetId]);

  if (!worksheet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading worksheet...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeftIcon />
          <span>Back to worksheets</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500">
              {worksheet.dateLabel}
            </h1>
            <p className="text-slate-400 text-lg font-light mt-1">
              {worksheet.jobs.length} jobs • Tap cards to expand
            </p>
          </div>
          <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
            Active Worksheet
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {worksheet.jobs.map((job, index) => (
          <JobCard
            key={index}
            index={index}
            {...job}
            time={worksheet.timeSlots[index] 
             ? `${worksheet.timeSlots[index].start} - ${worksheet.timeSlots[index].end}`
              : job.time}
            onCommentChange={handleCommentChange}
            onUpdateJob={handleUpdateJob}
            savedComment={comments[index] || ''}
            agentApiUrl={AGENT_API_URL}
          />
        ))}
      </div>
    </div>
  );
};