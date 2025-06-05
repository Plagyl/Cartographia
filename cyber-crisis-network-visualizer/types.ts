
export interface NodeData {
  id: string;
  name: string;
  type: string;
  depth: number;
  children: NodeData[];
  value: number;
  status: 'active' | 'warning';
  parent: string | null;
  ip: string | null;
  criticality: 'high' | 'medium' | 'low';
  // D3 simulation properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  // For rendering
  isCenter?: boolean;
  isParent?: boolean;
  hasChildren?: boolean;
  compromised?: boolean;
}

export interface LinkData {
  source: string | NodeData;
  target: string | NodeData;
  value: number;
  isParentLink?: boolean;
  compromised?: boolean;
}

export interface InfrastructureTypeDetails {
  names: string[];
  type: string;
  color: string;
}

export interface InfrastructureTypes {
  [key: number]: InfrastructureTypeDetails;
}

export interface AttackType {
  name: string;
  severity: string;
  spread: number;
  vector: string;
  impacts: string[];
}

export interface AttackChainEvent {
  timestamp: string;
  node: NodeData;
  reason: string;
  impact: string;
  nodePath: string;
}

export interface TooltipData {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

export interface CrisisState {
  active: boolean;
  paused: boolean;
  currentAttack: AttackType | null;
  startTime: number | null;
  totalPausedTime: number;
  propagationSpeed: number;
}