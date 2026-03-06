import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Upload, FileJson, CheckCircle, AlertCircle, Database, Trash2, Edit, Plus, X, Search, ChevronDown, ChevronUp, Eye, LayoutDashboard, Users, Calendar, Activity, PieChart } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

import { format } from 'date-fns';

const DataManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exportUrl, setExportUrl] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  
  // Clear All Data State
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState('');
  
  // CRUD State
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('data_activeTab') || 'export_import'); // 'export_import', 'people', 'events', 'tags', 'relationships'
  const [tableData, setTableData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('data_searchTerm') || '');
  const [page, setPage] = useState(() => parseInt(sessionStorage.getItem('data_page')) || 1);
  const [sortConfig, setSortConfig] = useState(() => {
      const saved = sessionStorage.getItem('data_sortConfig');
      return saved ? JSON.parse(saved) : { key: 'created_at', direction: 'desc' };
  });
  const PAGE_SIZE = 50;

  // Persist State
  useEffect(() => {
      sessionStorage.setItem('data_activeTab', activeTab);
      sessionStorage.setItem('data_searchTerm', searchTerm);
      sessionStorage.setItem('data_page', page);
      sessionStorage.setItem('data_sortConfig', JSON.stringify(sortConfig));
  }, [activeTab, searchTerm, page, sortConfig]);

  // Header Translations
  const headerMap = {
      'id': 'ID',
      'name': '名称',
      'description': '描述',
      'created_at': '创建时间',
      'updated_at': '更新时间',
      'event_date': '事件日期',
      'type': '类型',
      'gender': '性别',
      'contact_info': '联系方式',
      'avatar_url': '头像链接',
      'color': '颜色',
      'person_a_id': '人物A ID',
      'person_b_id': '人物B ID',
      'strength': '关系强度',
      'person_id': '人物 ID',
      'event_id': '事件 ID',
      'tag_id': '标签 ID',
      'relationship': '关系',
      'known_since': '认识时间',
      'location': '地区',
      'industry': '行业',
      'notes': '备注',
      'identity': '身份',
      'meet_date': '相识日期',
      'province': '省份',
      'city': '城市'
  };

  useEffect(() => {
      if (activeTab !== 'export_import') {
          fetchTableData(activeTab);
      }
  }, [activeTab, page, sortConfig]); // Refetch on sort change

  const handleSort = (key) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const fetchTableData = async (table) => {
      setTableLoading(true);
      const start = (page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;
      
      let query = supabase.from(table).select('*', { count: 'exact' });
      
      if (searchTerm) {
          // Simple search implementation based on common text fields
          if (table === 'people' || table === 'tags') {
              query = query.ilike('name', `%${searchTerm}%`);
          } else if (table === 'events') {
              query = query.ilike('name', `%${searchTerm}%`);
          }
      }

      // Apply sorting
      if (sortConfig.key) {
          query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      }

      const { data, error, count } = await query.range(start, end);
      
      if (error) {
          console.error(`Error fetching ${table}:`, error);
      } else {
          setTableData(data || []);
      }
      setTableLoading(false);
  };

  const handleDelete = async (table, id) => {
      if (!window.confirm('确定要删除这条数据吗？此操作不可恢复。')) return;
      
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
          alert(`删除失败: ${error.message}`);
      } else {
          setTableData(tableData.filter(item => item.id !== id));
      }
  };

  const renderTable = () => {
      if (tableLoading) return <div className="p-8 text-center text-gray-500">加载中...</div>;
      if (tableData.length === 0) return <div className="p-8 text-center text-gray-500">暂无数据</div>;

      const columns = Object.keys(tableData[0]).filter(key => key !== 'id' && key !== 'user_id');

      return (
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                          {columns.map(col => (
                              <th 
                                  key={col} 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  onClick={() => handleSort(col)}
                              >
                                  <div className="flex items-center space-x-1">
                                      <span>{headerMap[col] || col}</span>
                                      {sortConfig.key === col && (
                                          sortConfig.direction === 'asc' 
                                              ? <ChevronUp className="h-3 w-3" /> 
                                              : <ChevronDown className="h-3 w-3" />
                                      )}
                                      {sortConfig.key !== col && (
                                          <div className="flex flex-col opacity-30">
                                              <ChevronUp className="h-2 w-2 -mb-0.5" />
                                              <ChevronDown className="h-2 w-2" />
                                          </div>
                                      )}
                                  </div>
                              </th>
                          ))}
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {tableData.map(row => (
                          <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              {columns.map(col => {
                                  let content = row[col];
                                  // Format Dates
                                  if (col === 'created_at' || col === 'updated_at' || col === 'event_date' || col === 'known_since' || col === 'meet_date') {
                                      if (content) {
                                          try {
                                            content = format(new Date(content), 'yyyy-MM-dd HH:mm');
                                          } catch (e) {
                                            // keep original if invalid date
                                          }
                                      }
                                  }
                                  // Translate Gender
                                  else if (col === 'gender') {
                                      const genderMap = { 'Male': '男', 'Female': '女', 'Other': '其他' };
                                      content = genderMap[content] || content || '未知';
                                  }
                                  // Handle Objects/Arrays
                                  else if (typeof content === 'object') {
                                      content = JSON.stringify(content);
                                  }
                                  
                                  return (
                                    <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate" title={String(content)}>
                                        {content}
                                    </td>
                                  );
                              })}
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {(activeTab === 'people' || activeTab === 'events') && (
                                        <button 
                                            onClick={() => {
                                                if (activeTab === 'people') navigate(`/people/${row.id}`);
                                                if (activeTab === 'events') navigate(`/events/${row.id}`);
                                            }}
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                                            title="查看详情"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button 
                                      onClick={() => handleDelete(activeTab, row.id)}
                                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                      title="删除"
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      );
  };

  // --- Export Functionality ---
  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch all data
      const { data: people } = await supabase.from('people').select('*');
      const { data: events } = await supabase.from('events').select('*');
      const { data: tags } = await supabase.from('tags').select('*');
      const { data: relationships } = await supabase.from('relationships').select('*');
      const { data: eventParticipants } = await supabase.from('event_participants').select('*');
      const { data: personTags } = await supabase.from('person_tags').select('*');

      const exportData = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: {
          people: people || [],
          events: events || [],
          tags: tags || [],
          relationships: relationships || [],
          event_participants: eventParticipants || [],
          person_tags: personTags || []
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      setExportUrl(url);
      
      // Auto download
      const a = document.createElement('a');
      a.href = url;
      a.download = `start-monica-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败');
    } finally {
      setLoading(false);
    }
  };

  // --- Import Functionality ---
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setImportStatus(null);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.data || !json.version) {
          throw new Error('无效的导入文件格式');
        }

        const { people, events, tags, relationships, event_participants, person_tags } = json.data;

        // 1. Upsert People
        if (people?.length) {
            const { error } = await supabase.from('people').upsert(people);
            if (error) throw error;
        }

        // 2. Upsert Tags
        if (tags?.length) {
            const { error } = await supabase.from('tags').upsert(tags);
            if (error) throw error;
        }

        // 3. Upsert Events
        if (events?.length) {
            const { error } = await supabase.from('events').upsert(events);
            if (error) throw error;
        }

        // 4. Upsert Relationships
        if (relationships?.length) {
            const { error } = await supabase.from('relationships').upsert(relationships);
            if (error) throw error;
        }

        // 5. Upsert Junction Tables
        if (event_participants?.length) {
            const { error } = await supabase.from('event_participants').upsert(event_participants);
            if (error) throw error;
        }

        if (person_tags?.length) {
            const { error } = await supabase.from('person_tags').upsert(person_tags);
            if (error) throw error;
        }

        setImportStatus({ type: 'success', message: '数据导入成功！' });
        e.target.value = null; // Reset input

      } catch (error) {
        console.error('Import failed:', error);
        setImportStatus({ type: 'error', message: `导入失败: ${error.message}` });
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  // --- Clear All Functionality ---
  const handleClearAllData = async () => {
      if (clearConfirmation !== '确认删除') return;
      
      setLoading(true);
      try {
          // Delete in order to respect foreign keys
          // 1. Junction tables
          await supabase.from('event_participants').delete().neq('id', 0); // Delete all
          await supabase.from('person_tags').delete().neq('id', 0);
          
          // 2. Main tables
          await supabase.from('relationships').delete().neq('id', 0);
          await supabase.from('events').delete().neq('id', 0);
          await supabase.from('people').delete().neq('id', 0);
          await supabase.from('tags').delete().neq('id', 0);
          
          alert('所有数据已清空');
          setShowClearModal(false);
          setClearConfirmation('');
      } catch (error) {
          console.error('Clear failed:', error);
          alert('清空失败: ' + error.message);
      } finally {
          setLoading(false);
      }
  };

  // Translations for tab names
  const tabNames = {
      'export_import': '导入/导出',
      'people': '人物列表',
      'events': '事件列表',
      'tags': '标签列表',
      'relationships': '关系列表',
      'event_participants': '参与记录',
      'person_tags': '人物标签关联'
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">数据管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">直接管理数据库记录或导入导出。</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto scrollbar-hide">
          <nav className="-mb-px flex space-x-8 min-w-max" aria-label="Tabs">
              {['export_import', 'people', 'events', 'tags', 'relationships'].map((tab) => (
                  <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`${
                          activeTab === tab
                              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                  >
                      {tabNames[tab] || tab}
                  </button>
              ))}
          </nav>
      </div>

      {activeTab === 'export_import' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Export Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors duration-200">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full mr-4">
                  <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">导出数据</h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                将所有人物、事件、关系和标签数据导出为 JSON 文件。您可以将其用于备份或迁移。
              </p>
              <button
                onClick={handleExport}
                disabled={loading}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? '处理中...' : '一键导出'}
              </button>
            </div>

            {/* Import Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors duration-200">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full mr-4">
                  <Upload className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">导入数据</h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                选择之前导出的 JSON 文件进行恢复。注意：这将尝试合并或覆盖现有 ID 的数据。
              </p>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={loading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 transition-colors">
                  <FileJson className="mr-2 h-4 w-4 text-white" />
                  {loading ? '导入中...' : '选择文件导入'}
                </div>
              </div>

              {importStatus && (
                <div className={`mt-4 p-3 rounded-md flex items-start ${importStatus.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'}`}>
                  {importStatus.type === 'success' ? (
                    <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  )}
                  <span className="text-sm">{importStatus.message}</span>
                </div>
              )}
            </div>

            {/* Clear Data Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors duration-200 border border-red-100 dark:border-red-900/30">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full mr-4">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">清空数据</h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                危险操作：将永久删除系统中的所有数据（人物、事件、标签等）。此操作无法撤销。
              </p>
              <button
                onClick={() => setShowClearModal(true)}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                清空所有数据
              </button>
            </div>
          </div>
      ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden transition-colors duration-200">
              {/* CRUD Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white capitalize">{tabNames[activeTab] || activeTab}</h3>
                  <div className="flex items-center space-x-2">
                      <div className="relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Search className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                              type="text"
                              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                              placeholder="搜索 ID 或名称..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && fetchTableData(activeTab)}
                          />
                      </div>
                      <button 
                          onClick={() => fetchTableData(activeTab)}
                          className="p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                      >
                          <Search className="h-4 w-4" />
                      </button>
                  </div>
              </div>
              
              {renderTable()}

              {/* Pagination (Simple) */}
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                      <button 
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                          上一页
                      </button>
                      <button 
                          onClick={() => setPage(p => p + 1)}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                          下一页
                      </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                              当前第 <span className="font-medium">{page}</span> 页
                          </p>
                      </div>
                      <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                              <button
                                  onClick={() => setPage(p => Math.max(1, p - 1))}
                                  disabled={page === 1}
                                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                              >
                                  <span className="sr-only">Previous</span>
                                  <ChevronDown className="h-5 w-5 transform rotate-90" />
                              </button>
                              <button
                                  onClick={() => setPage(p => p + 1)}
                                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                              >
                                  <span className="sr-only">Next</span>
                                  <ChevronUp className="h-5 w-5 transform rotate-90" />
                              </button>
                          </nav>
                      </div>
                  </div>
              </div>
          </div>
      )}
      {/* Clear Data Modal */}
      {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                  <div className="flex items-center mb-4 text-red-600">
                      <AlertCircle className="h-6 w-6 mr-2" />
                      <h3 className="text-lg font-bold">危险操作：清空所有数据</h3>
                  </div>
                  <p className="text-gray-600 mb-4 text-sm">
                      您即将删除系统中的所有数据（人物、事件、标签、关系等）。此操作无法撤销。
                  </p>
                  <p className="text-gray-700 mb-2 text-sm font-medium">
                      请输入 "<span className="select-all font-mono text-red-600">确认删除</span>" 以继续：
                  </p>
                  <input 
                      type="text" 
                      className="w-full border border-gray-300 rounded-md px-3 py-2 mb-6 focus:ring-red-500 focus:border-red-500"
                      value={clearConfirmation}
                      onChange={(e) => setClearConfirmation(e.target.value)}
                      placeholder="确认删除"
                  />
                  <div className="flex justify-end space-x-3">
                      <button 
                          onClick={() => { setShowClearModal(false); setClearConfirmation(''); }}
                          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 text-sm font-medium"
                      >
                          取消
                      </button>
                      <button 
                          onClick={handleClearAllData}
                          disabled={clearConfirmation !== '确认删除' || loading}
                          className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {loading ? '删除中...' : '确认清空'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DataManagement;
