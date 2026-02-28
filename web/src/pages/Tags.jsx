import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash, Tag } from 'lucide-react';

const Tags = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tags:', error);
    } else {
      setTags(data);
    }
    setLoading(false);
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([{ name: newTag.trim() }])
        .select()
        .single();

      if (error) throw error;

      setTags([data, ...tags]);
      setNewTag('');
      setError(null);
    } catch (err) {
      setError(err.message.includes('unique constraint') ? '标签已存在' : err.message);
    }
  };

  const handleDeleteTag = async (id) => {
    if (!window.confirm('确定要删除这个标签吗？这将移除所有人物身上的此标签。')) return;

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTags(tags.filter(tag => tag.id !== id));
    } catch (err) {
      console.error('Error deleting tag:', err);
      alert('删除失败');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">标签管理</h1>
          <p className="mt-1 text-sm text-gray-500">创建和管理用于人物分类的标签。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Create Tag Section */}
        <div className="bg-white shadow rounded-lg p-6 h-fit">
          <h2 className="text-lg font-medium text-gray-900 mb-4">添加新标签</h2>
          <form onSubmit={handleAddTag}>
            <div className="mb-4">
              <label htmlFor="tagName" className="block text-sm font-medium text-gray-700 mb-1">
                标签名称
              </label>
              <input
                type="text"
                id="tagName"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：#小学同学"
              />
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={!newTag.trim()}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              添加
            </button>
          </form>
        </div>

        {/* Tags List Section */}
        <div className="md:col-span-2 bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">现有标签 ({tags.length})</h2>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-gray-500">加载中...</div>
          ) : tags.length === 0 ? (
            <div className="p-6 text-center text-gray-500">暂无标签</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {tags.map((tag) => (
                <li key={tag.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center">
                    <Tag className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-red-600 hover:text-red-900 p-2"
                    title="删除"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tags;
