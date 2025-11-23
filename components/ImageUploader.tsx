import React, { useState, useCallback } from 'react';
import { UploadIcon, TrashIcon } from './Icons';

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFilesSelected }) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = (Array.from(e.dataTransfer.files) as File[]).filter(file => file.type === 'image/png');
    processFiles(droppedFiles);
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles: File[] = Array.from(event.target.files || []);
    processFiles(selectedFiles);
    event.target.value = '';
  }, []);

  const processFiles = (newFiles: File[]) => {
      if (newFiles.length > 0) {
        setFiles(prevFiles => {
            const updatedFiles = [...prevFiles, ...newFiles];
            onFilesSelected(updatedFiles);
            return updatedFiles;
        });
  
        newFiles.forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviews(prevPreviews => [...prevPreviews, reader.result as string]);
          };
          reader.readAsDataURL(file);
        });
      }
  };

  const removeImage = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setFiles(newFiles);
    setPreviews(newPreviews);
    onFilesSelected(newFiles);
  };

  return (
    <div className="space-y-8">
      {/* Drop Zone (Hero Element) */}
      <div 
        className={`relative group rounded-2xl p-12 text-center overflow-hidden transition-all duration-500 ${
            isDragging 
            ? 'border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_30px_rgba(6,182,212,0.15)] border-2 border-dashed' 
            : 'border-2 border-dashed border-slate-800 bg-slate-900/20 hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/png"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        <div className="relative z-0 flex flex-col items-center justify-center space-y-6 transition-transform duration-500 group-hover:scale-105">
          <div className={`p-5 rounded-full transition-all duration-500 ${isDragging ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-slate-800/80 text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]'}`}>
             <UploadIcon />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 group-hover:from-cyan-100 group-hover:to-blue-200 transition-all">
                Upload Field Screenshots
            </p>
            <p className="text-slate-500 font-medium group-hover:text-cyan-500/70 transition-colors">
                Drag & Drop or Click to Browse
            </p>
          </div>
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400 uppercase tracking-wider backdrop-blur-md">
            PNG Support Only
          </div>
        </div>
      </div>

      {/* Preview Grid */}
      {previews.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Upload Queue ({previews.length})</h3>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider">Ready to Process</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {previews.map((src, index) => (
                <div key={index} className="relative group rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all shadow-lg bg-black/40 backdrop-blur-sm">
                <img src={src} alt={`preview ${index}`} className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-500 p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg backdrop-blur-md border border-white/10"
                    aria-label="Remove image"
                >
                    <TrashIcon />
                </button>
                
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">IMG_{index + 1}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                </div>
                </div>
            ))}
            </div>
        </div>
      )}
    </div>
  );
};