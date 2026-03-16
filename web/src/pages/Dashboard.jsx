import React, { useEffect, useState, useRef, useMemo } from 'react';
import { api } from '../lib/api';
import ForceGraph2D from 'react-force-graph-2d';
import { Users, Calendar, Activity, Filter, RotateCcw, Tag, Smile, Heart, Star, Sun, Moon, Cloud, Music, Coffee, Book, Briefcase, Home, User, Globe, MapPin, Zap, Gift, Award } from 'lucide-react';
import { stringToColor } from '../lib/utils';
import * as LucideIcons from 'lucide-react';
import { createRoot } from 'react-dom/client';

const ICONS = {
  Tag, Smile, Heart, Star, Sun, Moon, Cloud, Music, Coffee, Book, Briefcase, Home, User, Users, Globe, MapPin, Zap, Activity, Gift, Award
};

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
  const [selectedTags, setSelectedTags] = useState(['all']);
  const [availableTags, setAvailableTags] = useState([]);
  const [relationshipMode, setRelationshipMode] = useState('group'); // 'real' | 'group'
  
  // Show Create Form State
  const [showCreateRel, setShowCreateRel] = useState(false);
  
  // Relationship Creation State
  const [selectedPersonA, setSelectedPersonA] = useState('');
  const [selectedPersonB, setSelectedPersonB] = useState('');
  const [selectedRelType, setSelectedRelType] = useState('');
  const [relationshipTypes, setRelationshipTypes] = useState([]);
  
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
        const processed = processGraphData(rawGraphData, selectedTags, colorByTag, expandedClusters);
        setGraphData(processed);
    }
  }, [rawGraphData, selectedTags, colorByTag, expandedClusters]);

  // Refetch data when relationshipMode changes
  useEffect(() => {
    fetchData();
  }, [relationshipMode]);

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
      const { data: personTags } = await api.personTags.list();

      // 根据关系模式获取关系数据
      let relationships = [];
      if (relationshipMode === 'real') {
        // 真实关系模式：只获取 relationships 表中 relationship_kind = 'real' 的记录
        const { data: realRels } = await api.relationships.list({ relationship_kind: 'real' });
        if (realRels) relationships = realRels;
      }
      // 群组关系模式：不获取 relationships 表数据，只从 person_tags 推导

      setStats({
        people: people?.length || 0,
        events: events?.length || 0,
        relationships: relationships?.length || 0
      });

      // Fetch graph data
      // already fetched above for stats

      if (people) {
        // Create a map of person_id -> array of tags
        const personTagsMap = {};
        if (personTags) {
            personTags.forEach(pt => {
                if (pt.tags) {
                    if (!personTagsMap[pt.person_id]) {
                        personTagsMap[pt.person_id] = [];
                    }
                    // Avoid duplicates
                    if (!personTagsMap[pt.person_id].some(t => t.id === pt.tags.id)) {
                        personTagsMap[pt.person_id].push({
                            id: pt.tags.id,
                            name: pt.tags.name,
                            color: pt.tags.color,
                            icon: pt.tags.icon
                        });
                    }
                }
            });
        }

        const nodes = people.map(p => ({ 
            id: p.id, 
            name: p.name, 
            val: 1,
            tags: personTagsMap[p.id] || [],
            // Default color is only used if no tags match filters
            color: (personTagsMap[p.id] && personTagsMap[p.id][0]?.color) || '#3b82f6' 
        }));
        let links = [];
        let totalConnections = 0;

        // 1. Add implicit relationships based on tags (group mode or both mode)
        if ((relationshipMode === 'group' || relationshipMode === 'both') && personTags) {
            const tagGroups = {};
            personTags.forEach(pt => {
                if (!pt.tags) return;
                const tagId = pt.tags.id;
                const tagName = pt.tags.name;
                const tagColor = pt.tags.color;
                const tagIcon = pt.tags.icon;

                if (!tagGroups[tagId]) {
                    tagGroups[tagId] = { name: tagName, color: tagColor, icon: tagIcon, people: [] };
                }
                tagGroups[tagId].people.push(pt.person_id);
            });

            setAvailableTags(Object.values(tagGroups).map(g => g.name).sort());

            Object.values(tagGroups).forEach(group => {
                const peopleIds = group.people;
                // Connect everyone in this group to everyone else in this group
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
                            color: group.color || stringToColor(group.name),
                            icon: group.icon,
                            relationshipKind: 'group'
                        });
                        totalConnections++;
                    }
                }
            });
        }

        // 2. Add explicit relationships from relationships table (real mode or both mode)
        if ((relationshipMode === 'real' || relationshipMode === 'both') && relationships) {
            relationships.forEach(r => {
                // 真实关系使用 type 字段自动生成颜色
                const typeColor = stringToColor(r.type || '关系');
                links.push({
                    source: r.person_a_id,
                    target: r.person_b_id,
                    value: r.strength || 1,
                    type: 'explicit',
                    label: r.type || '关系',
                    color: typeColor,
                    relationshipKind: r.relationship_kind || 'real'
                });
                totalConnections++;
            });
        }
        
        // 真实关系模式下获取 relationship 类型的标签作为筛选选项
        if (relationshipMode === 'real') {
            const { data: relTags } = await api.tags.list('relationship');
            console.log('Relationship tags from API:', relTags);
            if (relTags) {
                const filteredTags = relTags.filter(t => t.tag_type === 'relationship');
                console.log('Filtered relationship tags:', filteredTags);
                setAvailableTags(filteredTags.map(t => t.name));
            } else {
                setAvailableTags([]);
            }
            setSelectedTags(['all']);
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

  // Helper to get SVG string for an icon
  const getIconSvg = (iconName, color) => {
    // We can't easily get the SVG string from Lucide React components directly in a synchronous way for canvas drawing
    // A workaround is to define simple path strings for common icons or fetch them.
    // However, since we are drawing on Canvas, we might need to render the component to a string.
    // A simpler approach for this demo: use a map of predefined path strings or just text emojis if SVG is too complex.
    // BETTER APPROACH: Use `ReactDOMServer.renderToString` (if available) or pre-render to images.
    
    // For now, let's try to render the icon to an image data URL
    // But since that's async, we might struggle with ForceGraph's immediate render.
    // Alternative: Just draw text (emoji) or simple shapes.
    
    // Let's stick to text label for now, but enhanced with the icon name if possible.
    // The user specifically asked for SVG icons.
    // Let's try to map icon names to some unicode characters or just draw a placeholder?
    // actually, we can draw the icon using Path2D if we had the path data.
    
    // Let's use a simpler approach: Render the icon into a hidden DOM element, convert to image, and cache it.
    return null;
  };

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

  const processGraphData = (raw, filterTags, useColor, expanded) => {
    try {
        // 1. Deep clone to avoid mutation by D3
        const nodesCopy = JSON.parse(JSON.stringify(raw.nodes));
        const linksCopy = JSON.parse(JSON.stringify(raw.links));

        const isAll = filterTags.includes('all') || filterTags.length === 0;

        // 2. Filter Links
        let filteredLinks = linksCopy;
        if (!isAll) {
            filteredLinks = linksCopy.filter(link => 
                link.type === 'explicit' || (link.type === 'tag' && filterTags.includes(link.tagName))
            );
        }

        // 3. Filter Nodes
        let currentNodes = nodesCopy;
        if (!isAll) {
            const connectedNodeIds = new Set();
            filteredLinks.forEach(link => {
                connectedNodeIds.add(link.source);
                connectedNodeIds.add(link.target);
            });
            // Also include nodes that match the filter tags even if they have no links (isolated)
            // But usually tag nodes have links.
            currentNodes = nodesCopy.filter(n => {
                if (connectedNodeIds.has(n.id)) return true;
                const hasTag = n.tags && n.tags.some(t => filterTags.includes(t.name));
                return hasTag;
            });
        }

        // Determine display colors
        currentNodes.forEach(node => {
            if (!useColor) {
                node.displayColors = ['#3b82f6'];
                return;
            }
            if (node.tags && node.tags.length > 0) {
                if (isAll) {
                    node.displayColors = node.tags.map(t => t.color);
                } else {
                    const relevant = node.tags.filter(t => filterTags.includes(t.name));
                    node.displayColors = relevant.length > 0 ? relevant.map(t => t.color) : [node.color];
                }
            } else {
                node.displayColors = [node.color || '#3b82f6'];
            }
        });

        // 4. Clustering Logic: Pure vs Bridge
        const finalNodes = [];
        const finalLinks = [];

        // Buckets for "Pure" nodes (nodes that only belong to ONE active tag group)
        const pureBuckets = {}; 
        // List for "Bridge" nodes (nodes that belong to MULTIPLE active tag groups)
        const bridgeNodes = [];
        // List for nodes with NO active tags (or explicit only)
        const otherNodes = [];

        currentNodes.forEach(node => {
            // Identify which tags are "active" for this node in the current view
            const activeNodeTags = (node.tags || []).filter(t => isAll || filterTags.includes(t.name));
            
            if (activeNodeTags.length > 1) {
                // Bridge Node: Has multiple active tags (e.g. HS and Uni)
                bridgeNodes.push(node);
            } else if (activeNodeTags.length === 1) {
                // Pure Node: Has exactly one active tag
                const tagName = activeNodeTags[0].name;
                if (!pureBuckets[tagName]) pureBuckets[tagName] = [];
                pureBuckets[tagName].push(node);
            } else {
                // No active tags (maybe explicit links only)
                otherNodes.push(node);
            }
        });

        // Process Pure Buckets -> Clusters
        const clusterMap = {}; // Maps originalNodeId -> clusterId

        Object.entries(pureBuckets).forEach(([tagName, groupNodes]) => {
            const clusterId = `cluster-tag-${tagName}`;
            const isExpanded = expanded.has(clusterId);
            
            // Threshold for clustering: > 1 node
            if (groupNodes.length > 1 && !isExpanded) {
                // Create Cluster Node
                const sampleNode = groupNodes[0];
                const tagObj = sampleNode.tags.find(t => t.name === tagName);
                
                finalNodes.push({
                    id: clusterId,
                    name: `${tagName}圈 (${groupNodes.length}人)`,
                    val: Math.max(8, groupNodes.length),
                    color: tagObj?.color || '#f59e0b',
                    isCluster: true,
                    members: groupNodes.map(n => n.id),
                    icon: tagObj?.icon || 'Tag'
                });

                // Map members to this cluster
                groupNodes.forEach(n => {
                    clusterMap[n.id] = clusterId;
                });
            } else {
                // Don't cluster, add as individual nodes
                groupNodes.forEach(n => finalNodes.push(n));
            }
        });

        // Add Bridge and Other nodes directly
        bridgeNodes.forEach(n => finalNodes.push(n));
        otherNodes.forEach(n => finalNodes.push(n));

        // 5. Process and Remap Links
        filteredLinks.forEach(link => {
            const s = link.source?.id || link.source;
            const t = link.target?.id || link.target;
            
            if (!s || !t) return;

            // Remap endpoints if they belong to a cluster
            const newS = clusterMap[s] || s;
            const newT = clusterMap[t] || t;

            // Hide internal links within the same cluster
            if (newS === newT && clusterMap[s] && clusterMap[t]) {
                return;
            }

            finalLinks.push({
                ...link,
                source: newS,
                target: newT
            });
        });

        // 6. Deduplicate/Merge Links between same entities
        // Especially important for Cluster <-> Bridge links which might be numerous
        const mergedLinksMap = {};
        finalLinks.forEach(link => {
            const s = link.source;
            const t = link.target;
            // Ensure consistent direction for key
            const sId = s < t ? s : t;
            const tId = s < t ? t : s;
            
            // We want to distinguish links by tagName to keep different colored lines
            // e.g. Bridge Person -> HS Circle (Green Line) vs Bridge Person -> Uni Circle (Orange Line)
            const typeKey = link.tagName || 'explicit'; 
            const key = `${sId}-${tId}-${typeKey}`;

            if (!mergedLinksMap[key]) {
                mergedLinksMap[key] = { 
                    ...link, 
                    value: 0,
                    // Ensure label is initialized
                    label: link.label || ''
                };
            }
            mergedLinksMap[key].value += (link.value || 1);
        });

        const processedLinks = Object.values(mergedLinksMap);

        // 7. Calculate Curvature for multiple links between same nodes
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
                    // Distribute curvature
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

        // 8. Adjust Node Sizes based on connections
        processedLinks.forEach(link => {
            const nodeA = finalNodes.find(n => n.id === link.source);
            const nodeB = finalNodes.find(n => n.id === link.target);
            if (nodeA && !nodeA.isCluster) nodeA.val = (nodeA.val || 1) + (link.value || 1) * 0.2;
            if (nodeB && !nodeB.isCluster) nodeB.val = (nodeB.val || 1) + (link.value || 1) * 0.2;
        });

        return { nodes: finalNodes, links: processedLinks };
    } catch (error) {
        console.error("Graph Processing Error:", error);
        return { nodes: [], links: [] };
    }
  };

  const handleNodeClick = (node) => {
    if (node.isCluster) {
        const newExpanded = new Set(expandedClusters);
        newExpanded.add(node.id);
        setExpandedClusters(newExpanded);
    } else {
        // Navigate to person detail
        window.location.href = `/people/${node.id}`;
    }
  };

  const handleResetClusters = () => {
    setExpandedClusters(new Set());
    if (fgRef.current) {
        fgRef.current.zoomToFit(400);
    }
  };

  // Fetch relationship types when in real mode
  useEffect(() => {
    if (relationshipMode === 'real') {
      fetchRelationshipTypes();
    }
  }, [relationshipMode]);

  const fetchRelationshipTypes = async () => {
    const { data } = await api.tags.list('relationship');
    if (data) setRelationshipTypes(data);
  };

  const handleCreateRelationship = async () => {
    if (!selectedPersonA || !selectedPersonB || !selectedRelType) {
      alert('请选择两个人物和关系类型');
      return;
    }
    if (selectedPersonA === selectedPersonB) {
      alert('不能选择同一个人物');
      return;
    }

    try {
      // 确保 person_a_id < person_b_id
      const personA = selectedPersonA < selectedPersonB ? selectedPersonA : selectedPersonB;
      const personB = selectedPersonA < selectedPersonB ? selectedPersonB : selectedPersonA;
      
      const relType = relationshipTypes.find(t => t.id === selectedRelType);
      
      await api.relationships.create({
        person_a_id: personA,
        person_b_id: personB,
        type: relType?.name || '关系',
        strength: 1,
        source: 'manual',
        relationship_kind: 'real'
      });
      
      // 刷新数据
      fetchData();
      
      // 重置选择
      setSelectedPersonA('');
      setSelectedPersonB('');
      setSelectedRelType('');
      setShowCreateRel(false);
      
      alert('关系创建成功');
    } catch (err) {
      console.error('Error creating relationship:', err);
      alert('创建失败: ' + err.message);
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
                {/* Relationship Mode Toggle */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">关系模式:</span>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setRelationshipMode('group')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                relationshipMode === 'group'
                                    ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-600 dark:text-blue-400'
                                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            群组关系
                        </button>
                        <button
                            onClick={() => setRelationshipMode('real')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                relationshipMode === 'real'
                                    ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-600 dark:text-blue-400'
                                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            真实关系
                        </button>
                    </div>
                </div>

                {/* Create Relationship Button - Only in Real Mode */}
                {relationshipMode === 'real' && (
                    <button
                        onClick={() => setShowCreateRel(!showCreateRel)}
                        className="flex items-center px-3 py-1.5 text-sm text-orange-600 dark:text-purple-400 bg-orange-50 dark:bg-purple-900/30 hover:bg-orange-100 dark:hover:bg-purple-900/50 rounded-md border border-orange-200 dark:border-purple-800 transition-colors"
                    >
                        <Heart className="h-3.5 w-3.5 mr-1.5" />
                        {showCreateRel ? '取消' : '添加关系'}
                    </button>
                )}

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
                <div className="flex items-center gap-2 flex-wrap max-w-xl">
                    <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">筛选:</span>
                    
                    <button
                        onClick={() => setSelectedTags(['all'])}
                        className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedTags.includes('all')
                                ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                        }`}
                    >
                        全部
                    </button>

                    {availableTags.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                            <button
                                key={tag}
                                onClick={() => {
                                    let newTags;
                                    if (isSelected) {
                                        newTags = selectedTags.filter(t => t !== tag);
                                        if (newTags.length === 0) newTags = ['all'];
                                    } else {
                                        newTags = selectedTags.filter(t => t !== 'all');
                                        newTags.push(tag);
                                    }
                                    setSelectedTags(newTags);
                                }}
                                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                    isSelected
                                        ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                                }`}
                            >
                                {tag}
                            </button>
                        );
                    })}
                </div>
            </div>
          </div>

          {/* Relationship Creation Form - Real Mode */}
          {showCreateRel && relationshipMode === 'real' && (
            <div className="px-6 py-4 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">创建关系:</span>
                
                <select
                  value={selectedPersonA}
                  onChange={(e) => setSelectedPersonA(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">选择人物 A</option>
                  {graphData.nodes.filter(n => !n.isCluster).map(node => (
                    <option key={node.id} value={node.id}>{node.name}</option>
                  ))}
                </select>

                <span className="text-gray-500">→</span>

                <select
                  value={selectedPersonB}
                  onChange={(e) => setSelectedPersonB(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">选择人物 B</option>
                  {graphData.nodes.filter(n => !n.isCluster).map(node => (
                    <option key={node.id} value={node.id}>{node.name}</option>
                  ))}
                </select>

                <select
                  value={selectedRelType}
                  onChange={(e) => setSelectedRelType(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">选择关系类型</option>
                  {relationshipTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>

                <button
                  onClick={handleCreateRelationship}
                  disabled={!selectedPersonA || !selectedPersonB || !selectedRelType}
                  className="px-4 py-1.5 text-sm text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  创建
                </button>
              </div>
            </div>
          )}

          <div ref={containerRef} className="flex-1 relative min-h-[500px]">
            {!loading && graphData.nodes.length > 0 ? (
              <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel="name"
                nodeAutoColorBy={null}
                linkCurvature="curvature"
                linkWidth={link => link.isTag ? 1 : Math.sqrt(link.value)}
                linkColor={link => {
                  if (link.relationshipKind === 'real') return link.color;
                  if (!link.isTag) return '#9ca3af';
                  return colorByTag ? link.color : '#93c5fd';
                }}
                linkLabel={link => link.label}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={d => d.value * 0.001}
                onNodeClick={handleNodeClick}
                d3Force={{
                  charge: (force) => force.strength(-400).distanceMax(800),
                  collide: (force) => force.radius(node => {
                    // 根据节点名称长度计算碰撞半径（每个字符约14px + padding）
                    const nameLength = (node.name || '').length;
                    return nameLength * 15 + 60;
                  }).strength(0.9),
                  link: (force) => force.distance(200).strength(0.2)
                }}
                warmupTicks={100}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const label = node.name;
                  const fontSize = (node.isCluster ? 14 : 12) / globalScale;
                  ctx.font = `bold ${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  
                  const paddingX = fontSize * 0.8;
                  const paddingY = fontSize * 0.5;
                  
                  // Shape dimensions
                  const width = textWidth + paddingX * 2;
                  const height = fontSize + paddingY * 2;
                  const x = node.x - width / 2;
                  const y = node.y - height / 2;
                  const r = height / 2; // Pill shape

                  // Draw Background
                  let fillStyle = node.color || '#3b82f6';
                  
                  // Use displayColors for multi-tag nodes
                  if (!node.isCluster && node.displayColors && node.displayColors.length > 0) {
                      if (node.displayColors.length > 1) {
                          // Validate coordinates before creating gradient
                          if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(width) && Number.isFinite(height)) {
                              const gradient = ctx.createLinearGradient(x, y, x + width, y);
                              const colors = node.displayColors;
                              const step = 1 / colors.length;
                              
                              colors.forEach((color, index) => {
                                  // Hard stops for clear separation
                                  gradient.addColorStop(index * step, color);
                                  gradient.addColorStop((index + 1) * step, color);
                              });
                              fillStyle = gradient;
                          } else {
                              fillStyle = node.displayColors[0];
                          }
                      } else {
                          fillStyle = node.displayColors[0];
                      }
                  }

                  ctx.fillStyle = fillStyle;
                  
                  // Cluster gets a double border effect or slightly different style
                  if (node.isCluster) {
                      // Outer ring for cluster
                      ctx.beginPath();
                      ctx.roundRect(
                          x - 2/globalScale, 
                          y - 2/globalScale, 
                          width + 4/globalScale, 
                          height + 4/globalScale, 
                          r + 2/globalScale
                      );
                      ctx.strokeStyle = node.color;
                      ctx.lineWidth = 1 / globalScale;
                      ctx.stroke();
                  }

                  // Main Pill
                  ctx.beginPath();
                  ctx.roundRect(x, y, width, height, r);
                  ctx.fill();
                  
                  // White border for contrast
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 1.5 / globalScale;
                  ctx.stroke();

                  // Draw Text
                  ctx.fillStyle = '#000000'; // Black text
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(label, node.x, node.y);
                }}
                nodeCanvasObjectMode={() => 'replace'} 
                nodePointerAreaPaint={(node, color, ctx) => {
                  const globalScale = fgRef.current ? fgRef.current.zoom() : 1;
                  const label = node.name;
                  const fontSize = (node.isCluster ? 14 : 12) / globalScale;
                  ctx.font = `bold ${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  
                  const paddingX = fontSize * 0.8;
                  const paddingY = fontSize * 0.5;
                  
                  const width = textWidth + paddingX * 2;
                  const height = fontSize + paddingY * 2;
                  const x = node.x - width / 2;
                  const y = node.y - height / 2;
                  const r = height / 2;

                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.roundRect(x, y, width, height, r);
                  ctx.fill();
                }}
                onNodeClick={handleNodeClick}
                onRenderFramePost={null} // Removed separate label rendering
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
