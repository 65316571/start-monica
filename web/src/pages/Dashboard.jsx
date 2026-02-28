import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import ForceGraph2D from 'react-force-graph-2d';
import { Users, Calendar, Activity, Filter } from 'lucide-react';
import { stringToColor } from '../lib/utils';

const Dashboard = () => {
  const [stats, setStats] = useState({ people: 0, events: 0, relationships: 0 });
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Settings & Filters
  const [showGraph, setShowGraph] = useState(true);
  const [colorByTag, setColorByTag] = useState(true);
  const [selectedTag, setSelectedTag] = useState('all');
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    const storedShowGraph = localStorage.getItem('monica_show_graph');
    if (storedShowGraph !== null) setShowGraph(storedShowGraph === 'true');

    const storedColorByTag = localStorage.getItem('monica_color_by_tag');
    if (storedColorByTag !== null) setColorByTag(storedColorByTag === 'true');
    else setColorByTag(true);
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedTag, colorByTag]); // Refetch/Re-calculate when filter or color mode changes

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
      const { count: peopleCount } = await supabase.from('people').select('*', { count: 'exact', head: true });
      const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
      const { count: relCount } = await supabase.from('relationships').select('*', { count: 'exact', head: true });

      setStats({
        people: peopleCount || 0,
        events: eventsCount || 0,
        relationships: relCount || 0
      });

      // Fetch graph data
      const { data: people } = await supabase.from('people').select('id, name');
      // Fetch explicit relationships
      const { data: relationships } = await supabase.from('relationships').select('person_a_id, person_b_id, strength, type');
      // Fetch tags for implicit relationships
      const { data: personTags } = await supabase.from('person_tags').select('person_id, tags(id, name, color)');

      if (people) {
        const nodes = people.map(p => ({ id: p.id, name: p.name, val: 1 })); // val for node size
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
            // Group people by tag
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

            // Create links for each tag group
            Object.values(tagGroups).forEach(group => {
                const peopleIds = group.people;
                for (let i = 0; i < peopleIds.length; i++) {
                    for (let j = i + 1; j < peopleIds.length; j++) {
                        const p1 = peopleIds[i];
                        const p2 = peopleIds[j];
                        
                        links.push({
                            source: p1 < p2 ? p1 : p2,
                            target: p1 < p2 ? p2 : p1,
                            value: 1, // Base strength for tag connection
                            type: 'tag',
                            label: group.name,
                            isTag: true,
                            tagName: group.name, // Store for filtering
                            color: group.color || stringToColor(group.name) // Use db color or generate one
                        });
                        totalConnections++;
                    }
                }
            });
        }
        
        // Update stats with actual connection count (lines)
        setStats(prev => ({ ...prev, relationships: totalConnections }));

        // 3. Filter Links
        let filteredLinks = links;
        if (selectedTag !== 'all') {
            filteredLinks = links.filter(link => 
                (link.type === 'tag' && link.tagName === selectedTag) || 
                link.type === 'explicit'
            );
        }

        // 5. Filter Nodes based on filtered links
        // Only keep nodes that are part of at least one link
        const connectedNodeIds = new Set();
        filteredLinks.forEach(link => {
            connectedNodeIds.add(link.source.id || link.source); // Handle both object (if already processed) and ID
            connectedNodeIds.add(link.target.id || link.target);
        });

        // If we have a specific filter, hide unconnected nodes.
        // If "all", we might still want to show isolated nodes? 
        // User request says "hide contents without that condition", implies hiding nodes too.
        // Let's hide isolated nodes if any filter is active OR if we just want a clean graph.
        // Usually force graph shows all nodes. But for strict filtering:
        const filteredNodes = selectedTag !== 'all' 
            ? nodes.filter(n => connectedNodeIds.has(n.id))
            : nodes;

        // 6. Calculate Curvature for multiple links between same nodes
        const linkGroups = {};
        filteredLinks.forEach(link => {
            const s = link.source.id || link.source;
            const t = link.target.id || link.target;
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

        // Adjust node value based on connections (re-calculate for filtered set)
        filteredNodes.forEach(node => {
            node.val = 1; // Reset
        });
        filteredLinks.forEach(link => {
            const s = link.source.id || link.source;
            const t = link.target.id || link.target;
            const nodeA = filteredNodes.find(n => n.id === s);
            const nodeB = filteredNodes.find(n => n.id === t);
            if (nodeA) nodeA.val += link.value * 0.5;
            if (nodeB) nodeB.val += link.value * 0.5;
        });

        setGraphData({ nodes: filteredNodes, links: filteredLinks });
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 h-full flex flex-col">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">仪表盘</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center">
          <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">人物总数</dt>
              <dd className="text-3xl font-semibold text-gray-900">{stats.people}</dd>
            </dl>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center">
          <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
            <Calendar className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">事件总数</dt>
              <dd className="text-3xl font-semibold text-gray-900">{stats.events}</dd>
            </dl>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center">
          <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
            <Activity className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">关系连接数</dt>
              <dd className="text-3xl font-semibold text-gray-900">{stats.relationships}</dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Relationship Graph */}
      {showGraph && (
        <div className="flex-1 bg-white shadow rounded-lg overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">人际关系网络</h3>
            
            {/* Tag Filter */}
            <div className="flex items-center bg-gray-50 rounded-md px-3 py-1.5 border border-gray-200">
                <Filter className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-600 mr-2">筛选:</span>
                <select 
                    className="text-sm bg-transparent border-none focus:ring-0 text-gray-700 font-medium cursor-pointer outline-none"
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                >
                    <option value="all">全部关系</option>
                    {availableTags.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                    ))}
                </select>
            </div>
          </div>
          <div ref={containerRef} className="flex-1 relative min-h-[500px]">
            {!loading && graphData.nodes.length > 0 ? (
              <ForceGraph2D
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
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const label = node.name;
                  const fontSize = 12/globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                  ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = node.color || '#3b82f6'; // Default blue
                  ctx.fillText(label, node.x, node.y);
                  
                  // Draw circle
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
                  ctx.strokeStyle = node.color || '#3b82f6';
                  ctx.stroke();
                }}
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
