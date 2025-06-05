
import React from 'react';
import { CrisisState } from '../types';
import { ROOT_NODE_ID } from '../constants';

interface ControlsPanelProps {
    visibleNodes: number;
    currentLevel: number;
    compromisedCount: number;
    crisisState: CrisisState;
    crisisTime: number;
    breadcrumbItems: { id: string, name: string }[];
    onNavigateToNode: (nodeId: string) => void;
    onNavigateBack: () => void;
    onSimulateCrisis: () => void;
    onToggleCrisisPause: () => void;
    onClearCrisis: () => void;
    onSpeedChange: (speed: number) => void;
    isGraphAnimating: boolean;
    onToggleGraphAnimation: () => void;
    onResetZoom: () => void; 
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
    visibleNodes, currentLevel, compromisedCount, crisisState, crisisTime,
    breadcrumbItems, onNavigateToNode, onNavigateBack,
    onSimulateCrisis, onToggleCrisisPause, onClearCrisis, onSpeedChange,
    isGraphAnimating, onToggleGraphAnimation, onResetZoom,
    isCollapsed, onToggleCollapse
}) => {

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`absolute top-4 left-4 bg-neutral-900/95 p-4 rounded-xl backdrop-blur-lg border border-white/10 shadow-2xl text-sm text-neutral-200 flex flex-col max-h-[calc(100vh-32px)] transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-full max-w-xs sm:max-w-sm'}`}>
            <button
                onClick={onToggleCollapse}
                className="absolute top-3 right-3 text-neutral-400 hover:text-white p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                aria-label={isCollapsed ? "Expand Panel" : "Collapse Panel"}
            >
                {isCollapsed ? '»' : '«'}
            </button>

            {!isCollapsed && (
                <>
                    <h3 className="text-lg font-semibold mb-3 text-white border-b border-neutral-700 pb-2 pr-8">Contrôle Cybercrise</h3>
                    <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 pr-1">
                        <div className="mb-3 p-3 bg-neutral-800/70 rounded-lg">
                            <div className="text-xs text-neutral-400 mb-1">Navigation:</div>
                            {breadcrumbItems.map((item, index) => (
                                <React.Fragment key={`breadcrumb-${item.id}-${index}`}>
                                    <span
                                        className={`cursor-pointer transition-colors ${index === breadcrumbItems.length - 1 ? 'text-sky-400 font-medium' : 'text-sky-500 hover:text-sky-300'}`}
                                        onClick={() => index < breadcrumbItems.length - 1 && onNavigateToNode(item.id)}
                                        onKeyPress={(e) => e.key === 'Enter' && index < breadcrumbItems.length - 1 && onNavigateToNode(item.id)}
                                        tabIndex={index < breadcrumbItems.length - 1 ? 0 : -1}

                                    >
                                        {item.name}
                                    </span>
                                    {index < breadcrumbItems.length - 1 && <span className="mx-1.5 text-neutral-500">/</span>}
                                </React.Fragment>
                            ))}
                            {breadcrumbItems.length === 0 && <span className="text-sky-500 hover:text-sky-300 cursor-pointer" onClick={() => onNavigateToNode(ROOT_NODE_ID)}>Chargement...</span>}
                        </div>

                        <div className="mb-3 p-3 bg-neutral-800/70 rounded-lg space-y-1.5">
                            <Stat label="Nœuds visibles:" value={visibleNodes.toString()} />
                            <Stat label="Niveau actuel:" value={currentLevel === -1 ? "Racine" : currentLevel.toString()} />
                            <Stat label="Total infrastructure:" value="~10k assets" valueColor="text-neutral-400" />
                            <Stat label="Assets compromis:" value={compromisedCount.toString()} valueColor={compromisedCount > 0 ? 'text-red-400 font-bold' : 'text-green-400'} />
                        </div>

                        {crisisState.active && crisisState.currentAttack && (
                            <div className="mb-3 p-3 bg-red-900/60 border border-red-700/70 rounded-lg space-y-2">
                                <h4 className="text-md font-semibold text-red-300">🚨 Cybercrise Active 🚨</h4>
                                <CrisisStat label="Type:" value={crisisState.currentAttack.name} />
                                <CrisisStat label="Vecteur:" value={crisisState.currentAttack.vector} />
                                <CrisisStat label="Sévérité:" value={crisisState.currentAttack.severity} />
                                <CrisisStat label="Temps écoulé:" value={formatTime(crisisTime)} />
                                <div className="pt-1">
                                    <label htmlFor="speed-slider" className="block text-xs text-neutral-300 mb-1">Vitesse propagation: <span className="font-medium text-red-300">{(20000 / crisisState.propagationSpeed).toFixed(1)}x ({ (crisisState.propagationSpeed / 1000).toFixed(1)}s/tick)</span></label>
                                    <input
                                        type="range"
                                        id="speed-slider"
                                        min="200" 
                                        max="10000" 
                                        value={crisisState.propagationSpeed}
                                        step="100"
                                        onChange={(e) => onSpeedChange(parseInt(e.target.value))}
                                        className="w-full h-2 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
                                        aria-label="Vitesse de propagation de la crise"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-neutral-700 grid grid-cols-2 gap-2 text-xs">
                        <Button onClick={onNavigateBack} className="bg-sky-600 hover:bg-sky-500" disabled={breadcrumbItems.length <=1 && (currentLevel <=0 || currentLevel === -1) }>← Retour</Button>
                        <Button onClick={onResetZoom} className="bg-neutral-600 hover:bg-neutral-500">Réinitialiser Zoom</Button>
                        <Button onClick={onToggleGraphAnimation} className="bg-neutral-600 hover:bg-neutral-500" aria-pressed={isGraphAnimating}>
                            {isGraphAnimating ? '⏹️ Pause Graphe' : '▶️ Reprendre Graphe'}
                        </Button>
                        <Button onClick={onSimulateCrisis} className="bg-red-600 hover:bg-red-500 col-span-2" disabled={crisisState.active}>🔥 Simuler Crise</Button>
                        <Button onClick={onToggleCrisisPause} className="bg-yellow-500 hover:bg-yellow-400 text-black" disabled={!crisisState.active} aria-pressed={crisisState.paused}>
                            {crisisState.paused ? '▶️ Reprendre Crise' : '⏸️ Stopper Propagation'}
                        </Button>
                        <Button onClick={onClearCrisis} className="bg-green-600 hover:bg-green-500" disabled={!crisisState.active}>🧹 Nettoyer Crise</Button>
                    </div>
                </>
            )}
             {isCollapsed && (
                <div className="flex items-center justify-center h-full">
                </div>
            )}
        </div>
    );
};

interface StatProps {
    label: string;
    value: string;
    valueColor?: string;
}
const Stat: React.FC<StatProps> = ({ label, value, valueColor = "text-sky-400" }) => (
    <div className="flex justify-between items-center text-xs">
        <span className="text-neutral-300">{label}</span>
        <span className={`font-semibold ${valueColor}`}>{value}</span>
    </div>
);

interface CrisisStatProps {
    label: string;
    value: string;
}
const CrisisStat: React.FC<CrisisStatProps> = ({ label, value }) => (
    <div className="text-xs">
       <span className="text-red-300">{label}</span> <strong className="text-red-200">{value}</strong>
    </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}
const Button: React.FC<ButtonProps> = ({ children, className, ...props }) => (
    <button
        className={`px-3 py-2.5 rounded-md text-white font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-60 disabled:cursor-not-allowed ${className} ${props.disabled ? '' : 'hover:scale-105 hover:-translate-y-px active:scale-95'}`}
        {...props}
    >
        {children}
    </button>
);

export default ControlsPanel;
