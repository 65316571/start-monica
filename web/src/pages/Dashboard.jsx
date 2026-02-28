import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import ForceGraph2D from 'react-force-graph-2d';
import { Users, Calendar, Activity } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({ people: 0, events: 0, relationships: 0 });
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const storedShowGraph = localStorage.getItem('monica_show_graph');
    // Default to true if not set, or use stored value
    if (storedShowGraph !== null) {
      setShowGraph(storedShowGraph === 'true');
    } else {
      setShowGraph(true);
    }
  }, []);

  const [showGraph, setShowGraph] = useState(true);

  useEffect(() => {
    fetchData();
    
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
      const { data: relationships } = await supabase.from('relationships').select('person_a_id, person_b_id, strength');

      if (people && relationships) {
        const nodes = people.map(p => ({ id: p.id, name: p.name, val: 1 })); // val for node size
        const links = relationships.map(r => ({
          source: r.person_a_id,
          target: r.person_b_id,
          value: r.strength
        }));

        // Adjust node value based on connections
        links.forEach(link => {
            const nodeA = nodes.find(n => n.id === link.source);
            const nodeB = nodes.find(n => n.id === link.target);
            if (nodeA) nodeA.val += link.value;
            if (nodeB) nodeB.val += link.value;
        });

        setGraphData({ nodes, links });
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
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">人际关系网络</h3>
          </div>
          <div ref={containerRef} className="flex-1 relative min-h-[500px]">
            {!loading && graphData.nodes.length > 0 ? (
              <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel="name"
                nodeAutoColorBy="group"
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
