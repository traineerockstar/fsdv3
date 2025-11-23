import React, { useState, useEffect } from 'react';
import { CalendarIcon, ChevronRightIcon, TrashIcon } from './Icons';
import { Modal } from './Modal';
import type { SavedWorksheet } from '../types';

interface WorksheetListProps {
  onSelectWorksheet: (id: string) => void;
}

export const WorksheetList: React.FC<WorksheetListProps> = ({ onSelectWorksheet }) => {
  const [worksheets, setWorksheets] = useState<SavedWorksheet[]>([]);
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  useEffect(() => {
    loadWorksheets();
  }, []);

  const loadWorksheets = () => {
    const worksheetIds: SavedWorksheet[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('worksheet_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          worksheetIds.push({
            id: key.replace('worksheet_', ''),
            date: data.date,
            dateLabel: data.dateLabel || data.date,
            jobCount: data.jobs?.length || 0,
            createdAt: data.createdAt || data.date,
          });
        } catch (e) {
          console.error('Failed to parse worksheet:', key);
        }
      }
    }
    worksheetIds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setWorksheets(worksheetIds);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, id });
  };

  const handleDelete = () => {
    if (deleteModal.id) {
      localStorage.removeItem(`worksheet_${deleteModal.id}`);
      // Also try to remove associated messages
      localStorage.removeItem(`messages_${deleteModal.id}`);
      loadWorksheets();
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short', day: 'numeric', month: 'short' 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <header className="space-y-4 mb-8">
        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500">
          Worksheets
        </h1>
        <p className="text-slate-400 text-lg font-light">
          {worksheets.length} saved worksheet{worksheets.length !== 1 ? 's' : ''}
        </p>
      </header>

      <div className="space-y-3">
        {worksheets.length === 0 ? (
           <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
             <CalendarIcon />
             <p className="text-slate-400 mt-4">No worksheets yet</p>
           </div>
        ) : (
          worksheets.map((ws) => (
            <div
              key={ws.id}
              onClick={() => onSelectWorksheet(ws.id)}
              className="group relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:bg-white/5 hover:border-cyan-500/30 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
                    <CalendarIcon />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{ws.dateLabel}</h3>
                    <p className="text-sm text-slate-400">
                      {ws.jobCount} job{ws.jobCount !== 1 ? 's' : ''} • Created {formatDate(ws.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => confirmDelete(ws.id, e)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete worksheet"
                  >
                    <TrashIcon />
                  </button>
                  <ChevronRightIcon />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal 
        isOpen={deleteModal.isOpen}
        title="Delete Worksheet"
        content={
          <div className="space-y-2">
            <p>Are you sure you want to delete this worksheet?</p>
            <p className="text-sm text-slate-500">This action cannot be undone and will remove all associated job data and messages.</p>
          </div>
        }
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />
    </div>
  );
};