import React, { useEffect, useState } from 'react';
import { estimateTravelTime, RouteResult } from '../services/routingService';

interface TravelConnectorProps {
  origin: string;
  destination: string;
}

export const TravelConnector: React.FC<TravelConnectorProps> = ({ origin, destination }) => {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchRoute = async () => {
      if (!origin || !destination) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const result = await estimateTravelTime(origin, destination);
      
      if (mounted) {
        setRoute(result);
        setLoading(false);
      }
    };

    fetchRoute();

    return () => {
      mounted = false;
    };
  }, [origin, destination]);

  return (
    <div className="ml-8 pl-8 border-l-2 border-dashed border-slate-700/50 min-h-[60px] my-2 relative flex items-center">
      <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-900 rounded-full border-2 border-slate-700 flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
      </div>
      
      <div className="ml-6 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700 flex items-center gap-3 text-xs text-slate-400">
        {loading ? (
            <span className="animate-pulse">Calculating route...</span>
        ) : route ? (
            <a 
                href={route.googleMapsUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-3 hover:text-cyan-400 transition-colors"
            >
                <span className="font-semibold text-cyan-400">{route.durationText}</span>
                <span className="w-1 h-1 bg-slate-600 rounded-full" />
                <span>{route.distanceText}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-60">View Map</span>
            </a>
        ) : (
            <span>Route unavailable</span>
        )}
      </div>
    </div>
  );
};
