import React, { useMemo, useState } from 'react';
import { CopyIcon, CheckIcon } from './Icons';

interface DataTableProps {
  markdownTable: string;
}

export const DataTable: React.FC<DataTableProps> = ({ markdownTable }) => {
  const [isCopied, setIsCopied] = useState(false);

  const { title, headers, rows } = useMemo(() => {
    if (!markdownTable) return { title: '', headers: [], rows: [] };

    const lines = markdownTable.trim().split('\n');
    const tableTitle = lines.length > 0 ? lines[0].trim() : '';
    const tableLines = lines.slice(1).filter(line => line.includes('|'));

    if (tableLines.length < 2) return { title: tableTitle, headers: [], rows: [] };

    const headerLine = tableLines[0];
    // Use slice(1, -1) to handle the leading and trailing pipes in a markdown table row.
    const tableHeaders = headerLine.split('|').slice(1, -1).map(h => h.trim());

    // Assume the line after the header is the separator, and actual data rows start from the third line of the table block.
    const tableRows = tableLines.slice(2).map(rowLine => 
      rowLine.split('|').slice(1, -1).map(cell => cell.trim())
    );

    return { title: tableTitle, headers: tableHeaders, rows: tableRows };
  }, [markdownTable]);

  const handleCopyToSheets = async () => {
    if (!markdownTable) return;

    try {
      const lines = markdownTable.trim().split('\n');
      const tableLines = lines.filter(line => line.includes('|'));

      // We need headers + data rows. We skip the separator line.
      const cleanRows = tableLines.filter(line => !line.includes('---'));

      const tsvString = cleanRows.map(line => {
        // Split by pipe
        const cells = line.split('|');
        // Remove first and last empty strings caused by leading/trailing pipes
        return cells.slice(1, -1).map(c => c.trim()).join('\t');
      }).join('\n');

      await navigator.clipboard.writeText(tsvString);
      
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to sheets:", err);
    }
  };

  if (headers.length === 0 || rows.length === 0) {
    return (
      <div className="text-slate-400 p-4 border border-slate-800 rounded-lg border-dashed">
        <p>No data available to display.</p>
        <p className="text-sm opacity-60 mt-1">The AI might not have found data matching the required format.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            {title && <h3 className="text-xl font-bold text-slate-300">{title}</h3>}
        </div>

        <div className="overflow-x-auto border border-slate-700/50 rounded-xl shadow-lg shadow-black/20">
            <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-cyan-300 uppercase bg-slate-800/80 backdrop-blur-sm">
                    <tr>
                        {headers.map((header, index) => (
                            <th key={index} scope="col" className="px-6 py-4 font-bold tracking-wider border-b border-slate-700">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-slate-900/30">
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-slate-800/50 hover:bg-cyan-900/10 transition-colors group">
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-6 py-4 group-hover:text-cyan-100 transition-colors whitespace-nowrap">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div className="flex justify-end">
            <button
                onClick={handleCopyToSheets}
                className={`
                    group flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 border
                    ${isCopied 
                        ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 shadow-lg'
                    }
                `}
            >
                {isCopied ? (
                    <>
                        <CheckIcon />
                        <span>Copied for Sheets!</span>
                    </>
                ) : (
                    <>
                        <CopyIcon />
                        <span>Copy Table for Sheets</span>
                    </>
                )}
            </button>
        </div>
    </div>
  );
};