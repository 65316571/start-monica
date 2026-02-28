import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Upload, FileJson, CheckCircle, AlertCircle } from 'lucide-react';

const DataManagement = () => {
  const [loading, setLoading] = useState(false);
  const [exportUrl, setExportUrl] = useState(null);
  const [importStatus, setImportStatus] = useState(null); // { type: 'success' | 'error', message: string }

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

        // 5. Upsert Junction Tables (might need to handle conflicts carefully, but upsert should work if PKs match)
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">数据管理</h1>
          <p className="mt-1 text-sm text-gray-500">导出备份或恢复数据。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 rounded-full mr-4">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-lg font-medium text-gray-900">导出数据</h2>
          </div>
          <p className="text-gray-500 text-sm mb-6">
            将所有人物、事件、关系和标签数据导出为 JSON 文件。您可以将其用于备份或迁移。
          </p>
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? '处理中...' : '一键导出'}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-green-100 rounded-full mr-4">
              <Upload className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-lg font-medium text-gray-900">导入数据</h2>
          </div>
          <p className="text-gray-500 text-sm mb-6">
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
            <div className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <FileJson className="mr-2 h-4 w-4 text-gray-500" />
              {loading ? '导入中...' : '选择文件导入'}
            </div>
          </div>

          {importStatus && (
            <div className={`mt-4 p-3 rounded-md flex items-start ${importStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {importStatus.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              )}
              <span className="text-sm">{importStatus.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
