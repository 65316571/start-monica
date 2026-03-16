import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Trash, Tag, Edit, Save, X, Smile, Heart, Star, Sun, Moon, Cloud, Music, Coffee, Book, Briefcase, Home, User, Users, Globe, MapPin, Zap, Activity, Gift, Award, Camera, Image, Film, Phone, Mail, MessageCircle, Gamepad2, Dumbbell, Plane, Car, Bike, Trees, Flower2, PawPrint, Utensils, Cake, Wine, Shield, GraduationCap, Building2, Compass, Sparkles, Crown, Palette, PenTool, Laptop, Smartphone, Headphones, Mic, Bookmark, Flag, Timer, Wrench, Rocket } from 'lucide-react';

const ICONS = {
  Tag, Smile, Heart, Star, Sun, Moon, Cloud, Music, Coffee, Book, Briefcase, Home, User, Users, Globe, MapPin, Zap, Activity, Gift, Award, Camera, Image, Film, Phone, Mail, MessageCircle, Gamepad2, Dumbbell, Plane, Car, Bike, Trees, Flower2, PawPrint, Utensils, Cake, Wine, Shield, GraduationCap, Building2, Compass, Sparkles, Crown, Palette, PenTool, Laptop, Smartphone, Headphones, Mic, Bookmark, Flag, Timer, Wrench, Rocket
};

const ICON_GROUPS = [
  {
    name: '基础',
    icons: ['Tag', 'Bookmark', 'Flag', 'Star', 'Heart', 'Sparkles', 'Crown', 'Award']
  },
  {
    name: '人物与地点',
    icons: ['User', 'Users', 'Home', 'Building2', 'Globe', 'MapPin', 'Compass', 'Shield']
  },
  {
    name: '学习与工作',
    icons: ['Book', 'GraduationCap', 'Briefcase', 'PenTool', 'Palette', 'Laptop', 'Smartphone', 'Wrench']
  },
  {
    name: '媒体与通讯',
    icons: ['Camera', 'Image', 'Film', 'Music', 'Mic', 'Headphones', 'Phone', 'Mail', 'MessageCircle']
  },
  {
    name: '生活与兴趣',
    icons: ['Coffee', 'Utensils', 'Cake', 'Wine', 'Gamepad2', 'Dumbbell', 'Gift', 'Activity']
  },
  {
    name: '出行与自然',
    icons: ['Plane', 'Car', 'Bike', 'Trees', 'Flower2', 'PawPrint', 'Sun', 'Moon', 'Cloud']
  },
  {
    name: '能量与效率',
    icons: ['Zap', 'Timer', 'Rocket']
  }
];

const IconSelector = ({ selected, onSelect, color }) => {
  const [activeGroup, setActiveGroup] = useState(ICON_GROUPS[0].name);
  const currentGroup = ICON_GROUPS.find((group) => group.name === activeGroup) || ICON_GROUPS[0];

  return (
    <div className="mt-2 p-3 border rounded-md dark:border-gray-600 space-y-4">
      <div className="flex flex-wrap gap-2">
        {ICON_GROUPS.map((group) => (
          <button
            key={group.name}
            type="button"
            onClick={() => setActiveGroup(group.name)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeGroup === group.name
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{currentGroup.name}</div>
        <div className="grid grid-cols-5 gap-2">
          {currentGroup.icons.map((name) => {
            const Icon = ICONS[name];
            return (
              <button
                key={name}
                type="button"
                onClick={() => onSelect(name)}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-center items-center ${
                  selected === name ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500' : ''
                }`}
                title={name}
              >
                <Icon className="w-5 h-5" style={{ color: selected === name ? color : 'currentColor' }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Tags = () => {
  // Mode Switch: 'group' | 'real'
  const [tagMode, setTagMode] = useState('group'); // 'group' for person tags, 'real' for relationship types
  
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [newTagIcon, setNewTagIcon] = useState('Tag');
  const [error, setError] = useState(null);
  
  // Relationship Types State
  const [relationshipTypes, setRelationshipTypes] = useState([]);
  const [newRelType, setNewRelType] = useState('');
  const [newRelTypeColor, setNewRelTypeColor] = useState('#3b82f6');
  const [newRelTypeIcon, setNewRelTypeIcon] = useState('Heart');
  const [relTypesLoading, setRelTypesLoading] = useState(false);
  
  // Editing state for relationship types
  const [editingRelTypeId, setEditingRelTypeId] = useState(null);
  const [editRelTypeName, setEditRelTypeName] = useState('');
  const [editRelTypeColor, setEditRelTypeColor] = useState('');
  const [editRelTypeIcon, setEditRelTypeIcon] = useState('');
  
  // Editing state
  const [editingTagId, setEditingTagId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');

  useEffect(() => {
    if (tagMode === 'group') {
      fetchTags();
    } else {
      fetchRelationshipTypes();
    }
  }, [tagMode]);

  const fetchTags = async () => {
    setLoading(true);
    const { data, error } = await api.tags.list('person'); // 只获取人物标签

    if (error) {
      console.error('Error fetching tags:', error);
    } else {
      console.log('fetchTags raw data:', data);
      // 确保只显示 person 类型的标签，过滤掉 relationship 类型
      const filteredData = data?.filter(tag => tag.tag_type === 'person') || [];
      console.log('fetchTags filtered data:', filteredData);
      setTags(filteredData);
    }
    setLoading(false);
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    try {
      const { data, error } = await api.tags.create({ 
        name: newTag.trim(), 
        color: newTagColor,
        icon: newTagIcon,
        tag_type: 'person' // 明确指定为人物标签
      });

      if (error) throw error;

      setTags([data, ...tags]);
      setNewTag('');
      setNewTagColor('#3b82f6');
      setNewTagIcon('Tag');
      setError(null);
    } catch (err) {
      setError(err.message.includes('unique constraint') ? '标签已存在' : err.message);
    }
  };

  const startEdit = (tag) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || '#3b82f6');
    setEditIcon(tag.icon || 'Tag');
  };

  const cancelEdit = () => {
    setEditingTagId(null);
    setEditName('');
    setEditColor('');
    setEditIcon('');
  };

  const handleUpdateTag = async (id) => {
    if (!editName.trim()) return;

    try {
      const { error } = await api.tags.update(id, { 
        name: editName.trim(), 
        color: editColor,
        icon: editIcon
      });

      if (error) throw error;

      setTags(tags.map(t => t.id === id ? { ...t, name: editName.trim(), color: editColor, icon: editIcon } : t));
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

  const fetchRelationshipTypes = async () => {
    setRelTypesLoading(true);
    try {
      // 从 tags 表中获取 tag_type = 'relationship' 的记录
      const { data, error } = await api.tags.list('relationship');
      if (error) throw error;
      
      // 统计每种关系类型的使用次数
      const { data: relationships } = await api.relationships.list();
      const typeCount = {};
      relationships?.forEach(r => {
        if (r.type) {
          typeCount[r.type] = (typeCount[r.type] || 0) + 1;
        }
      });
      
      const types = data?.filter(tag => tag.tag_type === 'relationship').map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        icon: tag.icon || 'Heart',
        count: typeCount[tag.name] || 0
      })) || [];
      
      setRelationshipTypes(types);
    } catch (err) {
      console.error('Error fetching relationship types:', err);
    } finally {
      setRelTypesLoading(false);
    }
  };

  const handleAddRelationshipType = async (e) => {
    e.preventDefault();
    if (!newRelType.trim()) return;
    
    try {
      const { data, error } = await api.tags.create({ 
        name: newRelType.trim(), 
        color: newRelTypeColor,
        icon: newRelTypeIcon,
        tag_type: 'relationship'
      });

      if (error) throw error;

      setRelationshipTypes(prev => [...prev, { 
        id: data.id,
        name: data.name, 
        count: 0, 
        color: data.color,
        icon: data.icon || 'Heart'
      }]);
      setNewRelType('');
      setNewRelTypeColor('#3b82f6');
      setNewRelTypeIcon('Heart');
    } catch (err) {
      console.error('Error adding relationship type:', err);
      alert('添加失败: ' + err.message);
    }
  };

  const handleDeleteRelType = async (typeId, typeName) => {
    if (!window.confirm(`确定要删除关系类型 "${typeName}" 吗？`)) return;
    
    try {
      const { error } = await api.tags.delete(typeId);
      if (error) throw error;
      
      setRelationshipTypes(prev => prev.filter(t => t.id !== typeId));
    } catch (err) {
      console.error('Error deleting relationship type:', err);
      alert('删除失败');
    }
  };

  // Helper function to generate color from string
  const startEditRelType = (type) => {
    setEditingRelTypeId(type.id);
    setEditRelTypeName(type.name);
    setEditRelTypeColor(type.color || '#3b82f6');
    setEditRelTypeIcon(type.icon || 'Heart');
  };

  const cancelEditRelType = () => {
    setEditingRelTypeId(null);
    setEditRelTypeName('');
    setEditRelTypeColor('');
    setEditRelTypeIcon('');
  };

  const handleUpdateRelType = async (id) => {
    if (!editRelTypeName.trim()) return;

    try {
      const { error } = await api.tags.update(id, { 
        name: editRelTypeName.trim(), 
        color: editRelTypeColor,
        icon: editRelTypeIcon
      });

      if (error) throw error;

      setRelationshipTypes(prev => prev.map(t => t.id === id ? { ...t, name: editRelTypeName.trim(), color: editRelTypeColor, icon: editRelTypeIcon } : t));
      setEditingRelTypeId(null);
    } catch (err) {
      console.error('Error updating relationship type:', err);
      alert('更新失败: ' + err.message);
    }
  };

  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  const renderIcon = (iconName, color, className = "w-5 h-5") => {
    const Icon = ICONS[iconName] || ICONS.Tag;
    return <Icon className={className} style={{ color }} />;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">标签管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {tagMode === 'group' ? '创建和管理用于人物分类的群组标签。' : '创建和管理人物之间的真实关系类型。'}
          </p>
        </div>
        
        {/* Mode Toggle Switch */}
        <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
          <span className={`text-sm font-medium ${tagMode === 'group' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            群组关系
          </span>
          <button
            onClick={() => setTagMode(tagMode === 'group' ? 'real' : 'group')}
            className="relative w-12 h-6 rounded-full transition-colors bg-gray-300 dark:bg-gray-600"
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                tagMode === 'real' ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${tagMode === 'real' ? 'text-orange-500 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
            真实关系
          </span>
        </div>
      </div>

      {/* Group Tags Section */}
      {tagMode === 'group' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Create Tag Section */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 h-fit transition-colors duration-200">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">添加新标签</h2>
            <form onSubmit={handleAddTag}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  标签名称
                </label>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="例如：#小学同学"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  标签颜色
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="h-9 w-full p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  标签图标
                </label>
                <IconSelector 
                  selected={newTagIcon} 
                  onSelect={setNewTagIcon} 
                  color={newTagColor}
                />
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
                      <div className="flex flex-col gap-3 w-full">
                        <div className="flex items-center gap-3">
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
                            <button onClick={() => handleUpdateTag(tag.id)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1">
                              <Save className="h-5 w-5" />
                            </button>
                            <button onClick={cancelEdit} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1">
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        <IconSelector 
                          selected={editIcon} 
                          onSelect={setEditIcon} 
                          color={editColor} 
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
                            {renderIcon(tag.icon, tag.color)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{tag.name}</span>
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
      )}

      {/* Relationship Types Section */}
      {tagMode === 'real' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Create Relationship Type Section */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 h-fit transition-colors duration-200">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">添加关系类型</h2>
            <form onSubmit={handleAddRelationshipType}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  关系类型名称
                </label>
                <input
                  type="text"
                  value={newRelType}
                  onChange={(e) => setNewRelType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="例如：朋友、同事、家人"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  关系颜色
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={newRelTypeColor}
                    onChange={(e) => setNewRelTypeColor(e.target.value)}
                    className="h-9 w-full p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  关系图标
                </label>
                <IconSelector 
                  selected={newRelTypeIcon} 
                  onSelect={setNewRelTypeIcon} 
                  color={newRelTypeColor}
                />
              </div>

              <button
                type="submit"
                disabled={!newRelType.trim()}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                <Plus className="mr-2 h-4 w-4" />
                添加
              </button>
            </form>
          </div>

          {/* Relationship Types List Section */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden transition-colors duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">现有关系类型 ({relationshipTypes.length})</h2>
            </div>
            
            {relTypesLoading ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">加载中...</div>
            ) : relationshipTypes.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">暂无关系类型</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {relationshipTypes.map((type) => (
                  <li key={type.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {editingRelTypeId === type.id ? (
                      <div className="flex flex-col gap-3 w-full">
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={editRelTypeName}
                            onChange={(e) => setEditRelTypeName(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                          />
                          <input
                            type="color"
                            value={editRelTypeColor}
                            onChange={(e) => setEditRelTypeColor(e.target.value)}
                            className="h-8 w-12 p-0 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer bg-white dark:bg-gray-700"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdateRelType(type.id)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1">
                              <Save className="h-5 w-5" />
                            </button>
                            <button onClick={cancelEditRelType} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1">
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        <IconSelector 
                          selected={editRelTypeIcon} 
                          onSelect={setEditRelTypeIcon} 
                          color={editRelTypeColor} 
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
                            {renderIcon(type.icon, type.color)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{type.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">({type.count} 条关系)</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditRelType(type)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-2"
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRelType(type.id, type.name)}
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
      )}
    </div>
  );
};

export default Tags;
