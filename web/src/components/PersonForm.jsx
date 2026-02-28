import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, Check } from 'lucide-react';

const PersonForm = ({ onClose, onPersonUpdated, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    contact_info: '',
    notes: '',
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]); // Array of tag objects
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isEditMode = !!initialData;

  useEffect(() => {
    fetchTags();
    if (initialData) {
      setFormData({
        name: initialData.name,
        gender: initialData.gender,
        contact_info: initialData.contact_info || '',
        notes: initialData.notes || '',
      });
      // Fetch existing tags for this person if editing
      fetchPersonTags(initialData.id);
    }
  }, [initialData]);

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('*').order('name');
    if (data) setAvailableTags(data);
  };

  const fetchPersonTags = async (personId) => {
    const { data } = await supabase
      .from('person_tags')
      .select('tag_id, tags(id, name)')
      .eq('person_id', personId);
    
    if (data) {
      setSelectedTags(data.map(item => item.tags));
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleTag = (tag) => {
    if (selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) {
      setError('姓名为必填项');
      setLoading(false);
      return;
    }

    try {
      let personId;

      if (isEditMode) {
        // Update Person
        const { error: updateError } = await supabase
          .from('people')
          .update(formData)
          .eq('id', initialData.id);
        
        if (updateError) throw updateError;
        personId = initialData.id;
      } else {
        // Create Person
        const { data, error: insertError } = await supabase
          .from('people')
          .insert([formData])
          .select()
          .single();

        if (insertError) throw insertError;
        personId = data.id;
      }

      // Update Tags (Delete all and re-insert for simplicity)
      if (isEditMode) {
        await supabase.from('person_tags').delete().eq('person_id', personId);
      }

      if (selectedTags.length > 0) {
        const tagLinks = selectedTags.map(tag => ({
          person_id: personId,
          tag_id: tag.id
        }));
        const { error: tagError } = await supabase.from('person_tags').insert(tagLinks);
        if (tagError) throw tagError;
      }

      // Fetch the final person object to return
      const { data: finalPerson } = await supabase
        .from('people')
        .select('*')
        .eq('id', personId)
        .single();

      onPersonUpdated(finalPerson);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? '编辑人物' : '添加新人物'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓名 *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入姓名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              性别
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">选择性别</option>
              <option value="Male">男</option>
              <option value="Female">女</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              联系方式
            </label>
            <input
              type="text"
              name="contact_info"
              value={formData.contact_info}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="电话、邮箱等"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标签
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {availableTags.map(tag => {
                const isSelected = selectedTags.find(t => t.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      isSelected 
                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                        : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {tag.name}
                    {isSelected && <Check className="ml-1 h-3 w-3" />}
                  </button>
                );
              })}
              {availableTags.length === 0 && (
                <span className="text-sm text-gray-500 italic">暂无可用标签，请先去标签管理页面添加。</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="其他备注信息..."
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonForm;
