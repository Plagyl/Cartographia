
import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { NodeData, LinkData } from '../types';
import { INFRASTRUCTURE_TYPES } from '../constants';
import { getNodePathString } from '../utils/networkUtils';

interface NetworkGraphProps {
    nodes: NodeData[];
    links: LinkData[];
    onNodeClick: (node: NodeData) => void;
    onShowTooltip: (content: string, x: number, y: number) => void;
    onHideTooltip: () => void;
    isAnimating: boolean;
    compromisedNodes: Set<string>;
    rootData: NodeData | null;
    onNodePositionsChange: (positions: Map<string, { x: number, y: number }>) => void;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({
    nodes,
    links,
    onNodeClick,
    onShowTooltip,
    onHideTooltip,
    isAnimating,
    compromisedNodes,
    rootData,
    onNodePositionsChange
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const simulationRef = useRef<d3.Simulation<NodeData, LinkData> | null>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const gRef = useRef<SVGGElement | null>(null);
    const gLinksRef = useRef<SVGGElement | null>(null);
    const gNodesRef = useRef<SVGGElement | null>(null);

    const memoizedNodes = useMemo(() => nodes.map(n => ({...n, compromised: compromisedNodes.has(n.id)})), [nodes, compromisedNodes]);
    const memoizedLinks = useMemo(() => links.map(l => {
        const sourceId = typeof l.source === 'string' ? l.source : (l.source as NodeData).id;
        const targetId = typeof l.target === 'string' ? l.target : (l.target as NodeData).id;
        const sourceCompromised = compromisedNodes.has(sourceId);
        const targetCompromised = compromisedNodes.has(targetId);
        return {...l, source: sourceId, target: targetId, compromised: sourceCompromised && targetCompromised };
    }), [links, compromisedNodes]);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        if (!gRef.current) {
            gRef.current = svg.append('g').node() as SVGGElement;
            gLinksRef.current = d3.select(gRef.current).append('g').attr('class', 'links-group').node() as SVGGElement;
            gNodesRef.current = d3.select(gRef.current).append('g').attr('class', 'nodes-group').node() as SVGGElement;
        }
        const gLinks = d3.select(gLinksRef.current);
        const gNodes = d3.select(gNodesRef.current);

        gLinks.selectAll('*').remove();
        gNodes.selectAll('*').remove();


        if (!zoomRef.current) {
            zoomRef.current = d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.1, 4])
                .on('zoom', (event) => {
                    if (gRef.current) {
                        d3.select(gRef.current).attr('transform', event.transform);
                    }
                });
            svg.call(zoomRef.current);
            
            (svg.node() as any).resetZoom = () => { // Attach resetZoom to the SVG node itself
                if (zoomRef.current && svgRef.current && gRef.current) {
                     svg.transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity);
                }
            };
        }
        
        if (!simulationRef.current) {
            simulationRef.current = d3.forceSimulation<NodeData, LinkData>()
                .force('link', d3.forceLink<NodeData, LinkData>().id(d => d.id).distance(d => (d as any).isParentLink ? 200 : 150).strength(0.5))
                // Adjusted charge: less repulsion for children, moderate for center
                .force('charge', d3.forceManyBody().strength(d => (d as any).isParent ? -500 : (d as any).isCenter ? -600 : -300))
                // Adjusted collision strength
                .force('collision', d3.forceCollide().radius(d => (d as any).isCenter ? 50 : (d as any).isParent ? 40 : 30).strength(0.7))
                .force('x', d3.forceX(width / 2).strength(0.1))
                .force('y', d3.forceY(height / 2).strength(0.1))
                .alphaDecay(0.0228); // Default alpha decay
        }
        
        simulationRef.current.nodes(memoizedNodes);
        (simulationRef.current.force('link') as d3.ForceLink<NodeData, LinkData>).links(memoizedLinks);
        
        simulationRef.current
            .force('x', d3.forceX(d => (d as any).fx !== undefined ? (d as any).fx : width / 2).strength(d => (d as any).fx !== undefined ? 1 : 0.1))
            .force('y', d3.forceY(d => (d as any).fy !== undefined ? (d as any).fy : height / 2).strength(d => (d as any).fy !== undefined ? 1 : 0.1));


        const linkElements = gLinks.selectAll<SVGLineElement, LinkData>('line.link')
            .data(memoizedLinks, d => `${d.source}-${d.target}`) 
            .join('line')
            .attr('class', d => `link ${d.isParentLink ? 'parent-link' : ''}`)
            .attr('stroke-width', d => d.compromised ? 2.5 : Math.sqrt(d.value || 1))
            .attr('stroke', d => d.compromised ? '#ef4444' : (d.isParentLink ? '#6b7280' : '#4b5563'))
            .attr('stroke-opacity', d => d.compromised ? 0.9 : (d.isParentLink ? 0.3 : 0.6))
            .classed('link-compromised', d => !!d.compromised)
            .classed('animated', d => !!d.compromised && isAnimating);


        const nodeGroups = gNodes.selectAll<SVGGElement, NodeData>('g.node-group')
            .data(memoizedNodes, d => d.id)
            .join(
                enter => {
                    const group = enter.append('g').attr('class', 'node-group cursor-pointer focus:outline-none');
                    group.append('circle')
                        .attr('class', 'node');
                    group.append('text')
                        .attr('class', 'node-label select-none pointer-events-none node-label-styled')
                        .attr('text-anchor', 'middle');
                    return group;
                }
            )
            .attr('tabindex', 0)
            .call(drag(simulationRef.current, onNodePositionsChange, memoizedNodes, isAnimating))
            .each(function(d_node) { 
                const group = d3.select(this);
                const circle = group.select<SVGCircleElement>('circle.node');
                const transitionName = `pulse-${d_node.id}`;

                circle.interrupt(transitionName); 

                if (d_node.compromised) {
                     if(isAnimating) {
                        const pulseAnimation = () => {
                            // Check if node is still compromised and part of the current view
                            const currentNodeStillCompromised = memoizedNodes.find(n => n.id === d_node.id && n.compromised);
                            if(!isAnimating || !currentNodeStillCompromised || circle.empty()) {
                                if(!circle.empty()) {
                                   circle
                                         .attr('r', d_node.isCenter ? 35 : d_node.isParent ? 30 : 25)
                                         .style('opacity', d_node.status === 'active' ? 1 : 0.7);
                                    if(currentNodeStillCompromised){
                                        circle.attr('fill', '#f43f5e');
                                    } else {
                                        // Reset fill if no longer compromised
                                        const typeConfig = Object.values(INFRASTRUCTURE_TYPES).find(t => t.type === d_node.type);
                                        circle.attr('fill', typeConfig ? typeConfig.color : '#3b82f6');
                                    }
                                }
                                return;
                            }
                            circle.transition(transitionName)
                                .duration(700)
                                .attr('r', (d_node.isCenter ? 35 : d_node.isParent ? 30 : 25) * 1.2)
                                .style('opacity', 0.6)
                                .transition(transitionName)
                                .duration(700)
                                .attr('r', d_node.isCenter ? 35 : d_node.isParent ? 30 : 25)
                                .style('opacity', 1)
                                .on('end', pulseAnimation);
                        };
                        pulseAnimation();
                    } else {
                         circle.attr('r', d_node.isCenter ? 35 : d_node.isParent ? 30 : 25).style('opacity', 1);
                    }
                } else {
                    circle.style('opacity', d_node.status === 'active' ? 1 : 0.7)
                          .attr('r', d_node.isCenter ? 35 : d_node.isParent ? 30 : 25);
                }
                
                group.select<SVGTextElement>('text.node-label.node-label-styled')
                    .text(d_node.name.length > 15 && !d_node.isCenter ? d_node.name.substring(0, 12) + '...' : d_node.name)
                    .attr('dy', (d_node.isCenter ? 35 : d_node.isParent ? 30 : 25) + 14);
            });

        nodeGroups.select<SVGCircleElement>('circle.node')
            .attr('r', d => d.isCenter ? 35 : d.isParent ? 30 : 25) 
            .attr('fill', d => {
                if (d.compromised) return '#f43f5e'; 
                const typeConfig = Object.values(INFRASTRUCTURE_TYPES).find(t => t.type === d.type);
                return typeConfig ? typeConfig.color : '#3b82f6';
            })
            .attr('stroke', d => d.compromised ? '#be123c' : (d.isParent ? '#9ca3af' : '#e5e7eb')) 
            .attr('stroke-width', d => d.compromised ? 2.5 : (d.isParent ? 1.5 : 1.5))
            .style('opacity', d => {
                if (d.compromised && isAnimating) return null; 
                if (d.compromised && !isAnimating) return 1; 
                return d.status === 'active' ? 1 : 0.7;
            })
             .classed('parent-node', d => !!d.isParent)
             .style('stroke-dasharray', d => d.isParent ? '4,4' : 'none');

        nodeGroups.on('click', (event, d) => {
            onNodeClick(d);
            if (d.isCenter || d.isParent) {
                 d.fx = d.x;
                 d.fy = d.y;
            } else if (d.hasChildren){ // Pin child if it's clicked and leads to new view
                 d.fx = d.x;
                 d.fy = d.y;
            }

            if (isAnimating && simulationRef.current) simulationRef.current.alpha(0.3).restart();
        })
        .on('mouseover', (event, d) => {
            d3.select(event.currentTarget).select('circle.node').transition().duration(200).attr('stroke-width', d.compromised ? 3.5 : 3);
            const fullPath = getNodePathString(d.id, rootData);
            let statusText = d.compromised ? '<span class="text-red-400 font-semibold">COMPROMIS</span>' : (d.status === 'active' ? '<span class="text-green-400">Actif</span>' : '<span class="text-yellow-400">Avertissement</span>');
            let ipText = d.ip ? `<br/>IP: ${d.ip}` : '';
            let criticalityText = d.criticality ? `<br/>Criticité: <span class="font-bold ${d.criticality === 'high' ? 'text-red-400' : d.criticality === 'medium' ? 'text-yellow-400' : 'text-green-400'}">${d.criticality.toUpperCase()}</span>` : '';

            const content = `
                <strong class="text-base block mb-1">${d.name}</strong>
                <span class="text-xs text-neutral-400">Type: ${d.type}${ipText}${criticalityText}</span><br/>
                <span class="text-xs text-neutral-400">Chemin: ${fullPath}</span><br/> 
                <span class="text-xs">Status: ${statusText}</span><br/>
                <em class="text-xs text-neutral-500 mt-1 block">${d.isParent ? 'Cliquez pour revenir' : d.hasChildren ? 'Cliquez pour explorer' : 'Asset terminal'}</em>
            `;
            onShowTooltip(content, event.pageX, event.pageY);
        })
        .on('mouseout', (event, d) => {
            d3.select(event.currentTarget).select('circle.node').transition().duration(200).attr('stroke-width', d.compromised ? 2.5 : 1.5);
            onHideTooltip();
        });

        simulationRef.current.on('tick', () => {
            linkElements
                .attr('x1', d => (d.source as NodeData).x!)
                .attr('y1', d => (d.source as NodeData).y!)
                .attr('x2', d => (d.target as NodeData).x!)
                .attr('y2', d => (d.target as NodeData).y!);
            nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
        });
        
        if (simulationRef.current.alpha() < 0.1 || !isAnimating) { // Give a little kick if alpha is low or if it was previously not animating
           simulationRef.current.alphaTarget(isAnimating ? 0.3 : 0).restart();
        } else {
           simulationRef.current.alphaTarget(isAnimating ? 0.3 : 0); // just set alpha target if already running hot
        }
        
        return () => {
            const finalPositions = new Map<string, {x: number, y: number}>();
            // Capture positions from the nodes D3 has.
            // It's crucial that memoizedNodes here refers to the exact objects D3 manipulated.
            // If memoizedNodes is a new array of new objects (even if same data), D3's x/y won't be on them.
            // simulationRef.current.nodes() returns the array D3 is using.
            simulationRef.current?.nodes().forEach(node => { 
                if (node.x != null && node.y != null) {
                    finalPositions.set(node.id, {x: node.x, y: node.y});
                }
            });
            onNodePositionsChange(finalPositions);
        };
    }, [memoizedNodes, memoizedLinks, isAnimating, rootData, onNodeClick, onShowTooltip, onHideTooltip, onNodePositionsChange]);


    useEffect(() => {
        const handleResize = () => {
            if (svgRef.current && simulationRef.current) {
                const newWidth = svgRef.current.clientWidth;
                const newHeight = svgRef.current.clientHeight;
                simulationRef.current.force('x', d3.forceX((d:any) => d.fx !== undefined ? d.fx : newWidth / 2).strength((d:any) => d.fx !== undefined ? 1: 0.1));
                simulationRef.current.force('y', d3.forceY((d:any) => d.fy !== undefined ? d.fy : newHeight / 2).strength((d:any) => d.fy !== undefined ? 1: 0.1));
                if (isAnimating) simulationRef.current.alpha(0.3).restart(); 
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); 
        return () => window.removeEventListener('resize', handleResize);
    }, [isAnimating]); 


    return (
        <svg id="network-graph-svg" ref={svgRef} className="flex-1 h-full w-full bg-neutral-800 select-none" aria-label="Network Visualization Area">
            {/* gRef will contain gLinksRef and gNodesRef */}
        </svg>
    );
};

function drag(simulation: d3.Simulation<NodeData, any> | null, onNodePositionsChange: Function, currentSimNodesState: NodeData[], isAnimatingGlobal: boolean) {
    function dragstarted(event: d3.D3DragEvent<SVGGElement, NodeData, NodeData>) {
        if (isAnimatingGlobal && !event.active && simulation) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, NodeData, NodeData>) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, NodeData, NodeData>) {
        if (isAnimatingGlobal && !event.active && simulation) {
             simulation.alphaTarget(isAnimatingGlobal ? 0.3 : 0);
        }
        // Persist fx/fy for the dragged node.
        // For other nodes, their current x/y (or fx/fy if they were already pinned) should be preserved.
        const newPositions = new Map<string, {x: number, y: number}>();
        simulation?.nodes().forEach(n => {
          if (n.id === event.subject.id) { // For the dragged node, save its fx/fy
             if (n.fx != null && n.fy != null) newPositions.set(n.id, { x: n.fx, y: n.fy });
          } else { // For other nodes, save their current x/y or fx/fy
            if (n.fx != null && n.fy != null) {
                newPositions.set(n.id, { x: n.fx, y: n.fy });
            } else if (n.x != null && n.y != null) {
                newPositions.set(n.id, { x: n.x, y: n.y });
            }
          }
        });
        onNodePositionsChange(newPositions);
    }
    return d3.drag<SVGGElement, NodeData>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
}

export default NetworkGraph;
