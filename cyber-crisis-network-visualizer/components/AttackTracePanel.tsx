import React from 'react';
import { AttackChainEvent } from '../types';

interface AttackTracePanelProps {
    isActive: boolean;
    attackChain: AttackChainEvent[];
    onNavigateToNode: (nodeId: string) => void;
}

const AttackTracePanel: React.FC<AttackTracePanelProps> = ({ isActive, attackChain, onNavigateToNode }) => {
    if (!isActive) return null;

    return (
        <div className="absolute top-4 right-4 bg-neutral-900/95 p-4 rounded-xl backdrop-blur-lg border border-red-500/40 shadow-2xl w-full max-w-xs sm:max-w-sm text-sm text-neutral-200 flex flex-col max-h-[calc(100vh-32px)]">
            <h4 className="text-md font-semibold text-red-300 mb-3 pb-2 border-b border-red-600/50">🕵️ Chaîne d'Attaque</h4>
            <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-red-500/50 scrollbar-track-neutral-800 space-y-2 pr-1">
                {attackChain.length === 0 && <p className="text-neutral-400 italic text-xs py-2">Aucun événement d'attaque pour le moment.</p>}
                {attackChain.map((event, index) => (
                    <div
                        key={`${event.timestamp}-${event.node.id}-${index}`} // Updated key
                        className="bg-red-600/10 border border-red-500/30 rounded-lg p-2.5 cursor-pointer transition-all duration-150 ease-in-out group relative hover:bg-red-600/20 hover:shadow-lg hover:border-red-500/50 hover:-translate-x-1"
                        onClick={() => onNavigateToNode(event.node.id)}
                        tabIndex={0}
                        onKeyPress={(e) => e.key === 'Enter' && onNavigateToNode(event.node.id)}
                    >
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-400 text-xl opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150">➔</div>
                        <div className="text-xs text-red-400 mb-0.5">{event.timestamp}</div>
                        <div className="font-medium text-red-200 text-xs mb-0.5 pr-5">{event.node.name} <span className="text-neutral-400 text-[10px]">({event.node.type})</span></div>
                        <div className="text-[11px] text-neutral-300 break-words leading-tight pr-5">Cible: {event.nodePath}</div>
                        {event.node.ip && <div className="text-[11px] text-neutral-300 leading-tight pr-5">IP: {event.node.ip}</div>}
                        <div className="text-[11px] text-neutral-300 mt-0.5 leading-tight pr-5">Raison: {event.reason}</div>
                        <div className="text-[11px] text-orange-400 mt-0.5 font-medium leading-tight pr-5">Impact: {event.impact}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AttackTracePanel;