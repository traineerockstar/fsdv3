import React, { useState } from 'react';
import { CopyIcon, CheckIcon } from './Icons';

interface NotificationsProps {
  messages: string[];
}

export const Notifications: React.FC<NotificationsProps> = ({ messages }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (!messages || messages.length === 0) {
    return <p className="text-slate-400">No notifications generated.</p>;
  }

  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <div key={index} className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-slate-300">Message {index + 1}</h4>
            <button
                onClick={() => handleCopy(message, index)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-cyan-300 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 focus:ring-offset-slate-900"
            >
                {copiedIndex === index ? (
                    <>
                        <CheckIcon />
                        Copied!
                    </>
                ) : (
                    <>
                        <CopyIcon />
                        Copy
                    </>
                )}
            </button>
          </div>
          <p className="text-slate-300 whitespace-pre-wrap">{message}</p>
          {index < messages.length - 1 && <hr className="mt-4 border-slate-700" />}
        </div>
      ))}
    </div>
  );
};