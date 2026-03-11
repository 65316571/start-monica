import React, { useEffect, useState, useRef, useMemo } from 'react';
import { api } from '../lib/api';
import ForceGraph2D from 'react-force-graph-2d';
import { Users, Calendar, Activity, Filter, RotateCcw } from 'lucide-react';
import { stringToColor } from '../lib/utils';

const Dashboard = () => {
  const [stats, setStats] = useState({ people: 0, events: 0, relationships: 0 });
  // rawGraphData stores the initial data from DB (immutable)
  const [rawGraphData, setRawGraphData] = useState({ nodes: [], links: [] });
  // graphData is what we pass to the component
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const fgRef = useRef();
  
  // Settings & Filters
  const [showGraph, setShowGraph] = useState(true);
  const [colorByTag, setColorByTag] = useState(true);
  const [selectedTag, setSelectedTag] = useState('all');
  const [availableTags, setAvailableTags] = useState([]);
  
  // Clustering State
  const [expandedClusters, setExpandedClusters] = useState(new Set());

  useEffect(() => {
    const storedShowGraph = localStorage.getItem('monica_show_graph');
    if (storedShowGraph !== null) setShowGraph(storedShowGraph === 'true');

    const storedColorByTag = localStorage.getItem('monica_color_by_tag');
    if (storedColorByTag !== null) setColorByTag(storedColorByTag === 'true');
    else setColorByTag(true);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // Process graph data whenever dependencies change
  useEffect(() => {
    if (rawGraphData.nodes.length > 0) {
        const processed = processGraphData(rawGraphData, selectedTag, colorByTag, expandedClusters);
        setGraphData(processed);
    }
  }, [rawGraphData, selectedTag, colorByTag, expandedClusters]);

  useEffect(() => {
    // Update dimensions on resize
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial size
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const { data: people } = await api.people.list();
      const { data: events } = await api.events.list();
      const { data: relationships } = await api.relationships.list();
      const { data: personTags } = await api.personTags.list();

      setStats({
        people: people?.length || 0,
        events: events?.length || 0,
        relationships: relationships?.length || 0
      });

      // Fetch graph data
      // already fetched above for stats

      if (people) {
        const nodes = people.map(p => ({ id: p.id, name: p.name, val: 1 }));
        let links = [];
        let totalConnections = 0;

        // 1. Add explicit relationships
        if (relationships) {
            relationships.forEach(r => {
                links.push({
                    source: r.person_a_id,
                    target: r.person_b_id,
                    value: r.strength || 1,
                    type: 'explicit',
                    label: r.type || '关系',
                    color: '#9ca3af' // Default gray
                });
                totalConnections++;
            });
        }

        // 2. Add implicit relationships based on tags
        const tagsList = new Set();
        if (personTags) {
            const tagGroups = {};
            personTags.forEach(pt => {
                if (!pt.tags) return;
                const tagId = pt.tags.id;
                const tagName = pt.tags.name;
                const tagColor = pt.tags.color;
                tagsList.add(tagName);

                if (!tagGroups[tagId]) {
                    tagGroups[tagId] = { name: tagName, color: tagColor, people: [] };
                }
                tagGroups[tagId].people.push(pt.person_id);
            });

            setAvailableTags(Array.from(tagsList).sort());

            Object.values(tagGroups).forEach(group => {
                const peopleIds = group.people;
                for (let i = 0; i < peopleIds.length; i++) {
                    for (let j = i + 1; j < peopleIds.length; j++) {
                        const p1 = peopleIds[i];
                        const p2 = peopleIds[j];
                        
                        links.push({
                            source: p1 < p2 ? p1 : p2,
                            target: p1 < p2 ? p2 : p1,
                            value: 1, 
                            type: 'tag',
                            label: group.name,
                            isTag: true,
                            tagName: group.name,
                            color: group.color || stringToColor(group.name)
                        });
                        totalConnections++;
                    }
                }
            });
        }
        
        setStats(prev => ({ ...prev, relationships: totalConnections }));
        setRawGraphData({ nodes, links });
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Graph Processing Logic ---

  const getConnectedComponents = (nodes, links) => {
    const adj = {};
    nodes.forEach(n => adj[n.id] = []);
    
    // Build adjacency list using IDs
    links.forEach(l => {
        // Ensure we are working with IDs (in case passed objects)
        const s = l.source.id || l.source;
        const t = l.target.id || l.target;
        
        // Only add if nodes exist in current set
        if (adj[s] && adj[t]) {
            adj[s].push(t);
            adj[t].push(s);
        }
    });

    const visited = new Set();
    const components = [];

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component = [];
        const stack = [node.id];
        visited.add(node.id);
        while (stack.length) {
          const curr = stack.pop();
          component.push(curr);
          if (adj[curr]) {
            adj[curr].forEach(neighbor => {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    stack.push(neighbor);
                }
            });
          }
        }
        components.push(component);
      }
    });
    return components;
  };

  const processGraphData = (raw, filterTag, useColor, expanded) => {
    // 1. Deep clone to avoid mutation by D3
    const nodesCopy = JSON.parse(JSON.stringify(raw.nodes));
    const linksCopy = JSON.parse(JSON.stringify(raw.links));

    // 2. Filter Links
    let filteredLinks = linksCopy;
    if (filterTag !== 'all') {
        filteredLinks = linksCopy.filter(link => 
            link.type === 'tag' && link.tagName === filterTag
        );
    }

    // 3. Filter Nodes (Keep connected or all?)
    // For clustering to work best, we should consider all nodes that fit the filter context.
    // If filter is 'all', we take all nodes.
    // If filter is specific tag, we usually only show people with that tag.
    let currentNodes = nodesCopy;
    if (filterTag !== 'all') {
        const connectedNodeIds = new Set();
        filteredLinks.forEach(link => {
            connectedNodeIds.add(link.source);
            connectedNodeIds.add(link.target);
        });
        currentNodes = nodesCopy.filter(n => connectedNodeIds.has(n.id));
    }

    // 4. Clustering / Aggregation
    const finalNodes = [];
    const finalLinks = [];

    const components = getConnectedComponents(currentNodes, filteredLinks);

    components.forEach((componentIds, index) => {
        const clusterId = `cluster-${index}`;
        const isExpanded = expanded.has(clusterId);
        
        // If component has more than 1 node AND is not expanded -> Cluster it
        // Only cluster if we are viewing "All" tags. If filtering by specific tag, show all nodes.
        const shouldCluster = filterTag === 'all' && componentIds.length > 1 && !isExpanded;

        if (shouldCluster) {
            // Calculate cluster properties
            // Find most common tag or just use generic name
            const tagCounts = {};
            let maxCount = 0;
            let dominantTag = '';
            let dominantColor = '#f59e0b'; // Default Amber

            // Analyze internal links to find dominant tag
            const compSet = new Set(componentIds);
            filteredLinks.forEach(l => {
                if (compSet.has(l.source) && compSet.has(l.target) && l.tagName) {
                    tagCounts[l.tagName] = (tagCounts[l.tagName] || 0) + 1;
                    if (tagCounts[l.tagName] > maxCount) {
                        maxCount = tagCounts[l.tagName];
                        dominantTag = l.tagName;
                        dominantColor = l.color;
                    }
                }
            });

            const clusterName = dominantTag ? `${dominantTag}圈` : `群体 ${index + 1}`;
            const clusterColor = dominantTag ? dominantColor : '#f59e0b';

            finalNodes.push({
                id: clusterId,
                name: `${clusterName} (${componentIds.length}人)`,
                val: Math.max(8, componentIds.length), // Size
                color: clusterColor, 
                isCluster: true,
                members: componentIds
            });
            // No links added for cluster
        } else {
            // Add individual nodes
            componentIds.forEach(nid => {
                const n = currentNodes.find(node => node.id === nid);
                if (n) finalNodes.push(n);
            });
            // Add internal links
            const compSet = new Set(componentIds);
            const internalLinks = filteredLinks.filter(l => 
                compSet.has(l.source) && compSet.has(l.target)
            );
            finalLinks.push(...internalLinks);
        }
    });

    // 5. Merge Links if Color Mode is OFF
    let processedLinks = finalLinks;
    if (!useColor) {
        const mergedLinksMap = {};
        processedLinks.forEach(link => {
            const s = link.source;
            const t = link.target;
            const sId = s < t ? s : t;
            const tId = s < t ? t : s;
            const key = `${sId}-${tId}`;

            if (!mergedLinksMap[key]) {
                mergedLinksMap[key] = { ...link, value: 0, label: '', isMerged: true };
            }
            
            mergedLinksMap[key].value += link.value;
            if (!mergedLinksMap[key].label.includes(link.label)) {
                    mergedLinksMap[key].label += (mergedLinksMap[key].label ? ', ' : '') + link.label;
            }
        });
        processedLinks = Object.values(mergedLinksMap);
    }

    // 6. Calculate Curvature (for display)
    const linkGroups = {};
    processedLinks.forEach(link => {
        const s = link.source;
        const t = link.target;
        const key = `${s}-${t}`; 
        if (!linkGroups[key]) linkGroups[key] = [];
        linkGroups[key].push(link);
    });

    Object.values(linkGroups).forEach(group => {
        const count = group.length;
        if (count > 1) {
            group.forEach((link, index) => {
                const range = 0.5;
                if (count % 2 === 1) {
                    link.curvature = (index - (count - 1) / 2) / ((count - 1) / 2 || 1) * range;
                } else {
                    link.curvature = (index - (count - 1) / 2) / (count / 2) * range; 
                }
            });
        } else {
            group[0].curvature = 0;
        }
    });
    
    // Adjust node val based on links
    processedLinks.forEach(link => {
         const nodeA = finalNodes.find(n => n.id === link.source);
         const nodeB = finalNodes.find(n => n.id === link.target);
         if (nodeA && !nodeA.isCluster) nodeA.val += link.value * 0.5;
         if (nodeB && !nodeB.isCluster) nodeB.val += link.value * 0.5;
    });

    return { nodes: finalNodes, links: processedLinks };
  };

  const handleNodeClick = (node) => {
    if (node.isCluster) {
        const newExpanded = new Set(expandedClusters);
        newExpanded.add(node.id);
        setExpandedClusters(newExpanded);
        
        // Optional: Zoom to cluster? 
        // ForceGraph handles position update automatically as data changes
    } else {
        // Standard click behavior (e.g., show details)
        // For now, maybe just log or nothing
    }
  };

  const handleResetClusters = () => {
    setExpandedClusters(new Set());
    if (fgRef.current) {
        fgRef.current.zoomToFit(400);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 h-full flex flex-col">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">仪表盘</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5 flex items-center transition-colors duration-200">
          <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 rounded-md p-3">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">人物总数</dt>
              <dd className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.people}</dd>
            </dl>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5 flex items-center transition-colors duration-200">
          <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/50 rounded-md p-3">
            <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">事件总数</dt>
              <dd className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.events}</dd>
            </dl>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5 flex items-center transition-colors duration-200">
          <div className="flex-shrink-0 bg-purple-100 dark:bg-purple-900/50 rounded-md p-3">
            <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">关系连接数</dt>
              <dd className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.relationships}</dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Relationship Graph */}
      {showGraph && (
        <div className="flex-1 bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-col transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">人际关系网络</h3>
            
            <div className="flex items-center space-x-4">
                {/* Reset Button */}
                {expandedClusters.size > 0 && (
                    <button 
                        onClick={handleResetClusters}
                        className="flex items-center px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md border border-blue-200 dark:border-blue-800 transition-colors"
                    >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        重置视图
                    </button>
                )}

                {/* Tag Filter */}
                <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-md px-3 py-1.5 border border-gray-200 dark:border-gray-600">
                    <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 mr-2">筛选:</span>
                    <select 
                        className="text-sm bg-transparent border-none focus:ring-0 text-gray-700 dark:text-gray-200 font-medium cursor-pointer outline-none"
                        value={selectedTag}
                        onChange={(e) => setSelectedTag(e.target.value)}
                    >
                        <option value="all" className="text-gray-900 dark:text-gray-900">全部关系</option>
                        {availableTags.map(tag => (
                            <option key={tag} value={tag} className="text-gray-900 dark:text-gray-900">{tag}</option>
                        ))}
                    </select>
                </div>
            </div>
          </div>
          <div ref={containerRef} className="flex-1 relative min-h-[500px]">
            {!loading && graphData.nodes.length > 0 ? (
              <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel="name"
                nodeAutoColorBy="group"
                linkCurvature="curvature"
              linkWidth={link => link.isTag ? 1 : Math.sqrt(link.value)}
              linkColor={link => {
                if (!link.isTag) return '#9ca3af'; // Explicit links always gray
                return colorByTag ? link.color : '#93c5fd'; // Color by tag or default blue
              }}
              linkLabel={link => link.label}
              linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={d => d.value * 0.001}
                onNodeClick={handleNodeClick}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const label = node.name;
                  const fontSize = (node.isCluster ? 16 : 12) / globalScale;
                  ctx.font = `${node.isCluster ? 'bold ' : ''}${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                  // Draw node circle first (bottom layer)
                  ctx.beginPath();
                  const r = node.isCluster ? 10 : 5;
                  ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                  ctx.fillStyle = node.color || '#3b82f6';
                  ctx.strokeStyle = node.color || '#3b82f6';
                  
                  if (node.isCluster) {
                      ctx.fill(); 
                      // Add a second ring for cluster
                      ctx.beginPath();
                      ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI, false);
                      ctx.strokeStyle = node.color;
                      ctx.lineWidth = 1 / globalScale;
                      ctx.stroke();
                  } else {
                      // Solid fill for normal nodes too, to hide lines behind
                      ctx.fill();
                      ctx.stroke();
                  }
                }}
                nodeCanvasObjectMode={() => 'after'} // Draw label AFTER (on top of) node
                onNodeClick={handleNodeClick}
                // Custom paint function to draw labels on top of everything
                onRenderFramePost={(ctx, globalScale) => {
                    // This runs after nodes and links are drawn
                    graphData.nodes.forEach(node => {
                        // Skip if node is out of view (optimization) - optional
                        const label = node.name;
                        const fontSize = (node.isCluster ? 16 : 12) / globalScale;
                        ctx.font = `${node.isCluster ? 'bold ' : ''}${fontSize}px Sans-Serif`;
                        const textWidth = ctx.measureText(label).width;
                        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                        // Label Background
                        // Cluster has stronger background, normal node has semi-transparent
                        ctx.fillStyle = node.isCluster ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.85)';
                        
                        // Shift label down so it doesn't cover the node circle directly, or keep centered?
                        // User said "text not covered by image", usually means label on top.
                        // Let's keep centered but ensure z-index (drawing order) is correct.
                        // Drawing here in onRenderFramePost ensures it's above ALL links and nodes.
                        
                        if (node.isCluster) {
                            ctx.beginPath();
                            ctx.roundRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1], 8);
                            ctx.fill();
                            
                            ctx.strokeStyle = node.color;
                            ctx.lineWidth = 2 / globalScale;
                            ctx.stroke();
                            
                            ctx.fillStyle = node.color; // Text color matches cluster
                        } else {
                            // Standard node label
                            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);
                            ctx.fillStyle = '#1f2937'; // Dark gray text for better readability on white
                        }

                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(label, node.x, node.y);
                    });
                }}
                cooldownTicks={100}
                d3VelocityDecay={0.3}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                {loading ? '正在加载图谱...' : '暂无足够数据展示关系网络。'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
