
import { NodeData, InfrastructureTypes } from '../types';
import { INFRASTRUCTURE_TYPES, ROOT_NODE_ID, ROOT_NODE_NAME } from '../constants';

export function generateIP(depth: number, index: number): string {
    const subnet = 10 + depth;
    const host = (index % 254) + 1;
    return `192.168.${subnet}.${host}`;
}

export function generateNetworkData(depth = 0, maxDepth = 5, parentId: string | null = null, index = 0): NodeData {
    const config = INFRASTRUCTURE_TYPES[depth] || INFRASTRUCTURE_TYPES[4];
    let name: string;
    let id: string;
    
    if (depth === 0) {
        name = config.names[index % config.names.length];
        id = name.replace(/\s/g, '-');
    } else {
        const baseName = config.names[index % config.names.length];
        const suffix = Math.floor(index / config.names.length);
        name = suffix > 0 ? `${baseName}-${suffix + 1}` : baseName;
        id = parentId ? `${parentId}-${name.replace(/\s/g, '-')}` : name.replace(/\s/g, '-');
    }

    const node: NodeData = {
        id: id,
        name: name,
        type: config.type,
        depth: depth,
        children: [],
        value: Math.floor(Math.random() * 100) + 1,
        status: Math.random() > 0.05 ? 'active' : 'warning',
        parent: parentId,
        ip: depth > 1 ? generateIP(depth, index) : null,
        criticality: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
    };

    if (depth < maxDepth - 1) {
        const childCount = depth === 0 ? 8 : depth === 1 ? 12 : depth === 2 ? 10 : depth === 3 ? 8 : 5;
        for (let i = 0; i < childCount; i++) {
            node.children.push(generateNetworkData(depth + 1, maxDepth, id, i));
        }
    }
    return node;
}

export function createRootData(): NodeData {
    const rootData: NodeData = {
        id: ROOT_NODE_ID,
        name: ROOT_NODE_NAME,
        type: 'group',
        depth: -1,
        children: [],
        value: 100,
        status: 'active',
        parent: null,
        ip: null,
        criticality: 'low' // Or assign based on children
    };

    for (let i = 0; i < 8; i++) { // Corresponds to original 8 SA sites
        rootData.children.push(generateNetworkData(0, 5, ROOT_NODE_ID, i));
    }
    return rootData;
}


export function findNodeById(node: NodeData | null, id: string): NodeData | null {
    if (!node) return null;
    if (node.id === id) return node;
    for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
    }
    return null;
}

export function getNodePathString(nodeId: string, rootData: NodeData | null): string {
    const path: string[] = [];
    let currNode = findNodeById(rootData, nodeId);
    while (currNode && currNode.id !== ROOT_NODE_ID) {
        path.unshift(currNode.name);
        if (currNode.parent) {
            currNode = findNodeById(rootData, currNode.parent);
        } else {
            currNode = null; 
        }
    }
    if (rootData && (path.length === 0 || path[0] !== rootData.name) && nodeId !== ROOT_NODE_ID) {
      path.unshift(rootData.name);
    } else if (nodeId === ROOT_NODE_ID && rootData) {
        path.unshift(rootData.name);
    }
    return path.join(' / ');
}