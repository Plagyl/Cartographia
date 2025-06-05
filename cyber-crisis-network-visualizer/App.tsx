import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { NodeData, LinkData, AttackType, AttackChainEvent, TooltipData, CrisisState } from './types';
import { createRootData, findNodeById, getNodePathString } from './utils/networkUtils';
import { ATTACK_TYPES, ROOT_NODE_ID, ROOT_NODE_NAME } from './constants';
import ControlsPanel from './components/ControlsPanel';
import AttackTracePanel from './components/AttackTracePanel';
import Tooltip from './components/Tooltip';
import NetworkGraph from './components/NetworkGraph';

const App: React.FC = () => {
    const [rootData, setRootData] = useState<NodeData | null>(null);
    const [currentViewNode, setCurrentViewNode] = useState<NodeData | null>(null);
    const [parentOfViewNode, setParentOfViewNode] = useState<NodeData | null>(null);
    const [navigationHistory, setNavigationHistory] = useState<NodeData[]>([]);
    
    const [compromisedNodes, setCompromisedNodes] = useState<Set<string>>(new Set());
    const [attackChain, setAttackChain] = useState<AttackChainEvent[]>([]);
    const [crisisState, setCrisisState] = useState<CrisisState>({
        active: false,
        paused: false,
        currentAttack: null,
        startTime: null,
        totalPausedTime: 0,
        propagationSpeed: 2000,
    });
    const [crisisTime, setCrisisTime] = useState<number>(0);

    const [tooltip, setTooltip] = useState<TooltipData>({ visible: false, content: '', x: 0, y: 0 });
    const [isGraphAnimating, setIsGraphAnimating] = useState<boolean>(true);
    const [nodePositions, setNodePositions] = useState<Map<string, { x: number, y: number }>>(new Map());
    const [isControlsPanelCollapsed, setIsControlsPanelCollapsed] = useState(false);

    // Store pause start time in ref instead of localStorage
    const pauseStartTimeRef = useRef<number | null>(null);
    const crisisIntervalRef = useRef<number | null>(null);
    const crisisTimeUpdateIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const initialRootData = createRootData();
        setRootData(initialRootData);
        setCurrentViewNode(initialRootData);
    }, []);

    const updateNodeCompromiseStatus = useCallback((node: NodeData): NodeData => {
        const newNode = { ...node, compromised: compromisedNodes.has(node.id) };
        if (node.children) {
            newNode.children = node.children.map(child => updateNodeCompromiseStatus(child));
        }
        return newNode;
    }, [compromisedNodes]);
    
    const currentDisplayData = useMemo(() => {
        if (!currentViewNode) return { nodes: [], links: [] };

        const svgElement = document.querySelector('svg#network-graph-svg'); 
        const viewWidth = svgElement?.clientWidth || window.innerWidth * (isControlsPanelCollapsed ? 0.95 : 0.75);
        const viewHeight = svgElement?.clientHeight || window.innerHeight;

        const centerX = viewWidth / 2;
        const centerY = viewHeight / 2;
        const radius = Math.min(viewWidth, viewHeight) * 0.3;

        const nodes: NodeData[] = [];
        const links: LinkData[] = [];

        const currentViewNodeWithStatus = updateNodeCompromiseStatus(currentViewNode);

        if (parentOfViewNode) {
            const parentWithStatus = updateNodeCompromiseStatus(parentOfViewNode);
            nodes.push({
                ...parentWithStatus,
                isParent: true,
                hasChildren: true, 
                fx: centerX,
                fy: centerY - radius * 1.5,
            });
            links.push({
                source: parentWithStatus.id,
                target: currentViewNodeWithStatus.id,
                isParentLink: true,
                value: 10,
                compromised: compromisedNodes.has(parentWithStatus.id) && compromisedNodes.has(currentViewNodeWithStatus.id),
            });
        }

        nodes.push({
            ...currentViewNodeWithStatus,
            isCenter: true,
            hasChildren: currentViewNodeWithStatus.children.length > 0,
            fx: centerX,
            fy: centerY,
        });

        const angleStep = currentViewNodeWithStatus.children.length > 0 ? (2 * Math.PI) / currentViewNodeWithStatus.children.length : 0;
        currentViewNodeWithStatus.children.forEach((child, i) => {
            const angle = i * angleStep - Math.PI / 2; 
            const childWithStatus = updateNodeCompromiseStatus(child);
            const pos = nodePositions.get(childWithStatus.id);
            nodes.push({
                ...childWithStatus,
                hasChildren: childWithStatus.children.length > 0,
                x: pos ? pos.x : centerX + radius * Math.cos(angle),
                y: pos ? pos.y : centerY + radius * Math.sin(angle),
            });
            links.push({
                source: currentViewNodeWithStatus.id,
                target: childWithStatus.id,
                value: Math.random() * 10 + 1,
                compromised: compromisedNodes.has(currentViewNodeWithStatus.id) && compromisedNodes.has(childWithStatus.id),
            });
        });
        return { nodes, links };
    }, [currentViewNode, parentOfViewNode, compromisedNodes, nodePositions, updateNodeCompromiseStatus, isControlsPanelCollapsed]);

    const navigateToRoot = useCallback(() => {
        setNavigationHistory([]);
        setParentOfViewNode(null);
        setCurrentViewNode(rootData);
        setNodePositions(new Map()); 
    }, [rootData]);

    const navigateBack = useCallback(() => {
        if (navigationHistory.length > 0) {
            const newHistory = [...navigationHistory];
            const previousNodeData = newHistory.pop(); 
            setNavigationHistory(newHistory);
            setCurrentViewNode(previousNodeData);
            const newParent = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
            setParentOfViewNode(newParent?.id === ROOT_NODE_ID ? rootData : newParent); 
            setNodePositions(new Map());
        } else if (currentViewNode?.id !== ROOT_NODE_ID) { 
            navigateToRoot();
        }
    }, [navigationHistory, currentViewNode, navigateToRoot, rootData]);
    
    const navigateToSpecificNodeFromChain = useCallback((nodeId: string) => {
        const targetNodeData = findNodeById(rootData, nodeId);
        if (!targetNodeData) return;

        const path: NodeData[] = [];
        let current = targetNodeData;
        
        while (current && current.parent && current.id !== ROOT_NODE_ID) {
            const parentNode = findNodeById(rootData, current.parent);
            if (parentNode && parentNode.id !== ROOT_NODE_ID) {
                 path.unshift(parentNode);
            }
            current = parentNode; 
        }
        
        setNavigationHistory(path);
        setCurrentViewNode(targetNodeData);
        setParentOfViewNode(path.length > 0 ? path[path.length - 1] : (targetNodeData.parent === ROOT_NODE_ID ? rootData : null));
        setNodePositions(new Map());
    }, [rootData]);

    const handleNodeClick = useCallback((node: NodeData) => {
        if (node.isParent) {
            navigateBack();
        } else if (node.hasChildren && !node.isCenter && !node.isParent) {
            const targetNodeFromRoot = findNodeById(rootData, node.id);
            if (targetNodeFromRoot && targetNodeFromRoot.children && targetNodeFromRoot.children.length > 0) {
                setNavigationHistory(prev => currentViewNode ? [...prev, currentViewNode] : []);
                setParentOfViewNode(currentViewNode);
                setCurrentViewNode(targetNodeFromRoot);
                setNodePositions(new Map());
            }
        }
    }, [navigateBack, rootData, currentViewNode]);

    const showTooltip = useCallback((content: string, x: number, y: number) => {
        setTooltip({ visible: true, content, x, y });
    }, []);

    const hideTooltip = useCallback(() => {
        setTooltip(prevState => ({ ...prevState, visible: false }));
    }, []);

    const compromiseSingleNode = useCallback((nodeToCompromise: NodeData, reason: string, currentAttack: AttackType) => {
        if (!nodeToCompromise || compromisedNodes.has(nodeToCompromise.id)) return false;

        setCompromisedNodes(prev => new Set(prev).add(nodeToCompromise.id));
        const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const impact = currentAttack.impacts[Math.floor(Math.random() * currentAttack.impacts.length)];
        const nodePath = getNodePathString(nodeToCompromise.id, rootData);
        setAttackChain(prev => [{ timestamp, node: nodeToCompromise, reason, impact, nodePath }, ...prev]);
        return true;
    }, [compromisedNodes, rootData]);

    const spreadAttack = useCallback(() => {
        if (!crisisState.currentAttack || !rootData) return;
        const currentAttack = crisisState.currentAttack;
        
        const newlyCompromised: { node: NodeData, reason: string }[] = [];
    
        const currentCompromisedSnapshot = new Set(compromisedNodes); 

        currentCompromisedSnapshot.forEach(nodeId => {
            const node = findNodeById(rootData, nodeId);
            if (node) {
                node.children.forEach(child => {
                    if (!currentCompromisedSnapshot.has(child.id) && !compromisedNodes.has(child.id) && Math.random() < currentAttack.spread) {
                        newlyCompromised.push({ node: child, reason: `Propagation depuis ${node.name}` });
                    }
                });
                if (node.parent && node.parent !== ROOT_NODE_ID && !currentCompromisedSnapshot.has(node.parent) && !compromisedNodes.has(node.parent) && Math.random() < currentAttack.spread * 0.3) { 
                    const parentNode = findNodeById(rootData, node.parent);
                    if (parentNode) {
                        newlyCompromised.push({ node: parentNode, reason: `Mouvement latéral vers ${parentNode.name}` });
                    }
                }
            }
        });
        
        const uniqueNewCompromises = new Map<string, {node: NodeData, reason: string}>();
        newlyCompromised.forEach(item => {
            if (!uniqueNewCompromises.has(item.node.id) && !compromisedNodes.has(item.node.id)) {
                uniqueNewCompromises.set(item.node.id, item);
            }
        });

        uniqueNewCompromises.forEach(item => {
           compromiseSingleNode(item.node, item.reason, currentAttack);
        });
    }, [crisisState.currentAttack, rootData, compromisedNodes, compromiseSingleNode]);

    const spreadAttackRef = useRef(spreadAttack);
    useEffect(() => {
        spreadAttackRef.current = spreadAttack;
    }, [spreadAttack]);

    useEffect(() => {
        if (crisisState.active && !crisisState.paused) {
            if (crisisIntervalRef.current) clearInterval(crisisIntervalRef.current);
            crisisIntervalRef.current = window.setInterval(() => {
                spreadAttackRef.current();
            }, crisisState.propagationSpeed);

            if (crisisTimeUpdateIntervalRef.current) clearInterval(crisisTimeUpdateIntervalRef.current);
            crisisTimeUpdateIntervalRef.current = window.setInterval(() => {
                if (crisisState.startTime !== null) {
                    const elapsed = Math.floor((Date.now() - crisisState.startTime - crisisState.totalPausedTime) / 1000);
                    setCrisisTime(elapsed);
                }
            }, 1000);
        } else {
            if (crisisIntervalRef.current) clearInterval(crisisIntervalRef.current);
            if (crisisTimeUpdateIntervalRef.current) clearInterval(crisisTimeUpdateIntervalRef.current);
        }
        return () => {
            if (crisisIntervalRef.current) clearInterval(crisisIntervalRef.current);
            if (crisisTimeUpdateIntervalRef.current) clearInterval(crisisTimeUpdateIntervalRef.current);
        };
    }, [crisisState.active, crisisState.paused, crisisState.propagationSpeed, crisisState.startTime, crisisState.totalPausedTime]);

    const simulateCrisis = useCallback(() => {
        if (!rootData) return;
        const selectedAttack = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
        
        setCompromisedNodes(new Set());
        setAttackChain([]);
        setCrisisTime(0);

        setCrisisState(prev => ({
            ...prev,
            active: true,
            paused: false,
            currentAttack: selectedAttack,
            startTime: Date.now(),
            totalPausedTime: 0,
        }));

        const vulnerableNodes: NodeData[] = [];
        function findVulnerable(node: NodeData) {
            if (node.depth >= 2 && (node.status === 'warning' || node.criticality === 'low')) {
                vulnerableNodes.push(node);
            }
            node.children.forEach(child => findVulnerable(child));
        }
        if(rootData) findVulnerable(rootData);
        
        let initialTarget: NodeData | null = null;
        if (vulnerableNodes.length > 0) {
            initialTarget = vulnerableNodes[Math.floor(Math.random() * vulnerableNodes.length)];
        } else { 
            const allDeepNodes: NodeData[] = [];
            function collectDeepNodes(node: NodeData) {
                if (node.depth >=2) allDeepNodes.push(node);
                node.children.forEach(collectDeepNodes);
            }
            if(rootData) collectDeepNodes(rootData);
            if (allDeepNodes.length > 0) {
                 initialTarget = allDeepNodes[Math.floor(Math.random() * allDeepNodes.length)];
            } else { 
                let fallbackNode = rootData;
                if (fallbackNode?.children[0]?.children[0]?.children[0]) fallbackNode = fallbackNode.children[0].children[0].children[0];
                else if (fallbackNode?.children[0]?.children[0]) fallbackNode = fallbackNode.children[0].children[0];
                else if (fallbackNode?.children[0]) fallbackNode = fallbackNode.children[0];
                initialTarget = fallbackNode;
            }
        }
        
        if (initialTarget) {
            compromiseSingleNode(initialTarget, "Point d'entrée initial", selectedAttack);
        }
    }, [rootData, compromiseSingleNode]);

    const toggleCrisisPause = useCallback(() => {
        setCrisisState(prev => {
            if (!prev.active) return prev;
            const newPausedState = !prev.paused;
            let newTotalPausedTime = prev.totalPausedTime;
            
            if (newPausedState) { 
                // Store pause start time in ref instead of localStorage
                pauseStartTimeRef.current = Date.now();
            } else { 
                // Calculate pause duration from ref
                if (pauseStartTimeRef.current && prev.startTime) { 
                    newTotalPausedTime += (Date.now() - pauseStartTimeRef.current);
                    pauseStartTimeRef.current = null;
                }
            }
            return { ...prev, paused: newPausedState, totalPausedTime: newTotalPausedTime };
        });
    }, []); 

    const clearCrisis = useCallback(() => {
        setCrisisState(prev => ({
            ...prev,
            active: false,
            paused: false,
            currentAttack: null,
            startTime: null,
            totalPausedTime: 0,
        }));
        setCompromisedNodes(new Set());
        setAttackChain([]);
        setCrisisTime(0);
        pauseStartTimeRef.current = null;
    }, []);

    const handleSpeedChange = useCallback((speed: number) => {
        setCrisisState(prev => ({ ...prev, propagationSpeed: speed }));
    }, []);

    const toggleGraphAnimation = useCallback(() => {
        setIsGraphAnimating(prev => !prev);
    }, []);
    
    const handleBreadcrumbNavigation = useCallback((nodeId: string) => {
        if (nodeId === ROOT_NODE_ID) {
            navigateToRoot();
            return;
        }
        const targetNode = findNodeById(rootData, nodeId);
        if (!targetNode) return;

        const currentTrail = [...navigationHistory, currentViewNode].filter(Boolean) as NodeData[];
        if (currentTrail.length === 0 && targetNode.id !== ROOT_NODE_ID && rootData) { 
             currentTrail.unshift(rootData); 
        }

        const targetIndexInTrail = currentTrail.findIndex(n => n?.id === nodeId);

        if (targetIndexInTrail !== -1) {
            const newHistory = currentTrail.slice(0, targetIndexInTrail);
            const newCurrentView = currentTrail[targetIndexInTrail];
            const newParentOfView = newHistory.length > 0 ? newHistory[newHistory.length -1] : (newCurrentView?.parent === ROOT_NODE_ID ? rootData : null);
            
            setNavigationHistory(newHistory);
            setCurrentViewNode(newCurrentView);
            setParentOfViewNode(newParentOfView);
            setNodePositions(new Map());
        } else {
            navigateToSpecificNodeFromChain(nodeId);
        }
    }, [rootData, navigationHistory, currentViewNode, navigateToRoot, navigateToSpecificNodeFromChain]);

    if (!rootData || !currentViewNode) {
        return <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">Chargement des données réseau...</div>;
    }
    
    const breadcrumbItems = useMemo(() => {
        const items: {id: string, name: string}[] = [];
        if (rootData && rootData.id && rootData.name) {
            items.push({ id: ROOT_NODE_ID, name: ROOT_NODE_NAME });
        }

        navigationHistory.forEach(node => {
            if (node && typeof node.id === 'string' && typeof node.name === 'string' && node.id !== ROOT_NODE_ID) {
                items.push({ id: node.id, name: node.name });
            }
        });

        if (currentViewNode && typeof currentViewNode.id === 'string' && typeof currentViewNode.name === 'string' && currentViewNode.id !== ROOT_NODE_ID) {
            let currentViewNodeInItems = false;
            for(const existingItem of items) {
                if (existingItem && existingItem.id === currentViewNode.id) {
                    currentViewNodeInItems = true;
                    break;
                }
            }
            if (!currentViewNodeInItems) {
                 items.push({ id: currentViewNode.id, name: currentViewNode.name });
            }
        }
        
        const uniqueItems: {id: string, name: string}[] = [];
        const seenIds = new Set<string>();
        for (let i = items.length - 1; i >= 0; i--) {
            const currentItem = items[i];
            if (currentItem && typeof currentItem.id === 'string' && typeof currentItem.name === 'string') {
                if (!seenIds.has(currentItem.id)) {
                    uniqueItems.unshift(currentItem);
                    seenIds.add(currentItem.id);
                }
            }
        }
        return uniqueItems;
    }, [rootData, navigationHistory, currentViewNode]);

    return (
        <div className="flex h-screen w-screen font-sans antialiased bg-neutral-900 text-neutral-200 overflow-hidden">
            <ControlsPanel
                visibleNodes={currentDisplayData.nodes.length}
                currentLevel={currentViewNode.depth}
                compromisedCount={compromisedNodes.size}
                crisisState={crisisState}
                crisisTime={crisisTime}
                breadcrumbItems={breadcrumbItems}
                onNavigateToNode={handleBreadcrumbNavigation}
                onNavigateBack={navigateBack}
                onSimulateCrisis={simulateCrisis}
                onToggleCrisisPause={toggleCrisisPause}
                onClearCrisis={clearCrisis}
                onSpeedChange={handleSpeedChange}
                isGraphAnimating={isGraphAnimating}
                onToggleGraphAnimation={toggleGraphAnimation}
                onResetZoom={() => { 
                    const svgElement = document.querySelector('svg#network-graph-svg'); 
                    if (svgElement && (svgElement as any).resetZoom) {
                        (svgElement as any).resetZoom();
                    }
                }}
                isCollapsed={isControlsPanelCollapsed}
                onToggleCollapse={() => setIsControlsPanelCollapsed(prev => !prev)}
            />
            <NetworkGraph
                nodes={currentDisplayData.nodes}
                links={currentDisplayData.links}
                onNodeClick={handleNodeClick}
                onShowTooltip={showTooltip}
                onHideTooltip={hideTooltip}
                isAnimating={isGraphAnimating}
                compromisedNodes={compromisedNodes}
                rootData={rootData}
                onNodePositionsChange={setNodePositions}
            />
            <AttackTracePanel
                isActive={crisisState.active}
                attackChain={attackChain}
                onNavigateToNode={navigateToSpecificNodeFromChain}
            />
            <Tooltip
                visible={tooltip.visible}
                content={tooltip.content}
                x={tooltip.x}
                y={tooltip.y}
            />
        </div>
    );
};

export default App;
