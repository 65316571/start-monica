import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Trash, Tag, Edit, Save, X } from 'lucide-react';

const Tags = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6'); // Default blue
  const [error, setError] = useState(null);
  
  // Editing state
  const [editingTagId, setEditingTagId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    const { data, error } = await api.tags.list();

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
      const { data, error } = await api.tags.create({ name: newTag.trim(), color: newTagColor });

      if (error) throw error;

      setTags([data, ...tags]);
      setNewTag('');
      setNewTagColor('#3b82f6');
      setError(null);
    } catch (err) {
      setError(err.message.includes('unique constraint') ? '标签已存在' : err.message);
    }
  };

  const startEdit = (tag) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || '#3b82f6');
  };

  const cancelEdit = () => {
    setEditingTagId(null);
    setEditName('');
    setEditColor('');
  };

  const handleUpdateTag = async (id) => {
    if (!editName.trim()) return;

    try {
      const { error } = await api.tags.update(id, { name: editName.trim(), color: editColor });

      if (error) throw error;

      setTags(tags.map(t => t.id === id ? { ...t, name: editName.trim(), color: editColor } : t));
      setEditingTagId(null);
    } catch (err) {
      console.error('Error updating tag:', err);
      alert('更新失败: ' + err.message);
    }
  };

  const handleDeleteTag = async (id) => {
    if (!window.confirm('确定要删除这个标签吗？这将移除所有人物身上的此标签。')) return;

    try {
      const { error } = await api.tags.delete(id);

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">标签管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">创建和管理用于人物分类的标签。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Create Tag Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 h-fit transition-colors duration-200">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">添加新标签</h2>
          <form onSubmit={handleAddTag}>
            <div className="mb-4">
              <label htmlFor="tagName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                标签名称
              </label>
              <input
                type="text"
                id="tagName"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="例如：#小学同学"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="tagColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                标签颜色
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="tagColor"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="h-9 w-16 p-0 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer bg-white dark:bg-gray-700"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">{newTagColor}</span>
              </div>
            </div>
            {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={!newTag.trim()}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" />
              添加
            </button>
          </form>
        </div>

        {/* Tags List Section */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">现有标签 ({tags.length})</h2>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">加载中...</div>
          ) : tags.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">暂无标签</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {tags.map((tag) => (
                <li key={tag.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  {editingTagId === tag.id ? (
                    <div className="flex items-center flex-1 gap-4">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                      />
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="h-8 w-12 p-0 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer bg-white dark:bg-gray-700"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateTag(tag.id)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300">
                          <Save className="h-4 w-4" />
                        </button>
                        <button onClick={cancelEdit} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center">
                        <Tag className="h-5 w-5 mr-3" style={{ color: tag.color || '#9ca3af' }} />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{tag.name}</span>
                        <span className="ml-2 w-3 h-3 rounded-full" style={{ backgroundColor: tag.color || '#3b82f6' }} title={tag.color}></span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(tag)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-2"
                          title="编辑"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-2"
                          title="删除"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
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
