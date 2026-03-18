import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { X, Plus, Check } from 'lucide-react';
import { chinaCities } from '../data/china_cities';

const PersonForm = ({ onClose, onPersonUpdated, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    contact_info: '',
    notes: '',
    identity: '',
    meet_date: '',
    province: '',
    city: '',
    industry: '',
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]); // Array of tag objects
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cities, setCities] = useState([]); // Available cities based on selected province
  const isEditMode = !!initialData;

  const identities = ['家人', '同学', '同事', '网友', '朋友', '其他'];

  useEffect(() => {
    fetchTags();
    if (initialData) {
      setFormData({
        name: initialData.name,
        gender: initialData.gender,
        contact_info: initialData.contact_info || '',
        notes: initialData.notes || '',
        identity: initialData.identity || '',
        meet_date: initialData.meet_date || '',
        province: initialData.province || '',
        city: initialData.city || '',
        industry: initialData.industry || '',
      });
      
      // Set initial cities if province is present
      if (initialData.province) {
        const provinceData = chinaCities.find(p => p.province === initialData.province);
        if (provinceData) {
          setCities(provinceData.cities);
        }
      }

      // Fetch existing tags for this person if editing
      fetchPersonTags(initialData.id);
    }
  }, [initialData]);

  const fetchTags = async () => {
    // 获取人物分类标签(person类型)
    const { data } = await api.tags.list('person');
    if (data) setAvailableTags(data);
  };

  const fetchPersonTags = async (personId) => {
    const { data } = await api.personTags.list(personId);
    
    if (data) {
      setSelectedTags(data.map(item => item.tags));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Handle province change cascade
    if (name === 'province') {
      const provinceData = chinaCities.find(p => p.province === value);
      setCities(provinceData ? provinceData.cities : []);
      setFormData(prev => ({ ...prev, province: value, city: '' })); // Reset city
    }
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
      
      // Clean up empty strings to null for optional fields if needed, 
      // but Supabase usually handles empty strings fine as text.
      // Date field needs to be null if empty string to avoid invalid input syntax for type date
      const submitData = { ...formData };
      if (!submitData.meet_date) submitData.meet_date = null;

      if (isEditMode) {
        // Update Person
        const { error: updateError } = await api.people.update(initialData.id, submitData);
        
        if (updateError) throw updateError;
        personId = initialData.id;
      } else {
        // Create Person
        const { data, error: insertError } = await api.people.create(submitData);

        if (insertError) throw insertError;
        personId = data.id;
      }

      // Update Tags (Delete all and re-insert for simplicity)
      // Note: This logic for tags is kept as requested (separate from identity)
      if (isEditMode) {
        await api.personTags.delete(personId);
      }

      if (selectedTags.length > 0) {
        const tagLinks = selectedTags.map(tag => ({
          person_id: personId,
          tag_id: tag.id
        }));
        const { error: tagError } = await api.personTags.create(tagLinks);
        if (tagError) throw tagError;
      }

      // Fetch the final person object to return
      const { data: finalPerson } = await api.people.get(personId);

      onPersonUpdated(finalPerson);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto transition-colors duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditMode ? '编辑人物' : '添加新人物'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              姓名 *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
              placeholder="输入姓名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              性别
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
            >
              <option value="">选择性别</option>
              <option value="Male">男</option>
              <option value="Female">女</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                身份
              </label>
              <select
                name="identity"
                value={formData.identity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              >
                <option value="">选择身份</option>
                {identities.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                认识时间
              </label>
              <input
                type="date"
                name="meet_date"
                value={formData.meet_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                现居城市
              </label>
              <div className="flex gap-2">
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className="w-1/2 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  <option value="">省份</option>
                  {chinaCities.map(p => (
                    <option key={p.province} value={p.province}>{p.province}</option>
                  ))}
                </select>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={!formData.province}
                  className="w-1/2 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  <option value="">城市</option>
                  {cities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                所属行业
              </label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                placeholder="例如：IT、金融"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              联系方式
            </label>
            <input
              type="text"
              name="contact_info"
              value={formData.contact_info}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              placeholder="电话、微信号等"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors border ${
                      isSelected 
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tag.name}
                    {isSelected && <Check className="ml-1 h-3 w-3" />}
                  </button>
                );
              })}
              {availableTags.length === 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400 italic">暂无可用标签，请先去标签管理页面添加。</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              备注
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
              placeholder="其他备注信息..."
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors"
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
