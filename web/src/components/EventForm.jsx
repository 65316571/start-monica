import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { X, Plus, Trash, Search, Check, Image as ImageIcon, Upload, Link } from 'lucide-react';

const EventForm = ({ onClose, onEventUpdated, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    event_date: new Date().toISOString().split('T')[0],
    type: '',
    location: '',
    description: '',
  });
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [tags, setTags] = useState([]);
  const [personTagsMap, setPersonTagsMap] = useState({});
  
  // Image management states
  const [eventImages, setEventImages] = useState([]);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [availableImages, setAvailableImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageSelectorTagFilter, setImageSelectorTagFilter] = useState('');
  const [imageSelectorSearch, setImageSelectorSearch] = useState('');
  const [selectedImagesInModal, setSelectedImagesInModal] = useState([]);

  const isEditMode = !!initialData;

  useEffect(() => {
    fetchPeople();
    fetchTags();
    if (initialData) {
      setFormData({
        name: initialData.name,
        event_date: initialData.event_date ? initialData.event_date.split('T')[0] : new Date().toISOString().split('T')[0],
        type: initialData.type || '',
        location: initialData.location || '',
        description: initialData.description || '',
      });
      // 加载参与人
      if (initialData.event_participants) {
        setSelectedPeople(initialData.event_participants.map(ep => ep.people));
      } else {
        fetchParticipants(initialData.id);
      }
      // 加载事件图片
      if (initialData.images) {
        setEventImages(initialData.images);
      }
    }
  }, [initialData]);

  const fetchTags = async () => {
    const { data } = await api.tags.list();
    if (data) setTags(data);
    
    // Fetch person-tag relationships
    const { data: pt } = await api.personTags.list();
    if (pt) {
        const map = {};
        pt.forEach(item => {
            if (!map[item.person_id]) map[item.person_id] = new Set();
            map[item.person_id].add(item.tag_id);
        });
        setPersonTagsMap(map);
    }
  };

  const fetchPeople = async () => {
    const { data } = await api.people.list();
    if (data) setPeople(data);
  };

  const fetchParticipants = async (eventId) => {
    const { data } = await api.eventParticipants.list(eventId);
    
    if (data) {
      setSelectedPeople(data.map(item => item.people));
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePerson = (person) => {
    if (selectedPeople.find(p => p.id === person.id)) {
      setSelectedPeople(selectedPeople.filter(p => p.id !== person.id));
    } else {
      setSelectedPeople([...selectedPeople, person]);
    }
  };

  const updateRelationships = async (personIds) => {
    if (personIds.length < 2) return;

    // Fetch tags for all involved people to check for common tags
    const { data: personTags } = await api.personTags.list();

    // Map person_id -> Set of tag_ids
    const tagsMap = {};
    if (personTags) {
      personTags.forEach(pt => {
        if (!tagsMap[pt.person_id]) tagsMap[pt.person_id] = new Set();
        tagsMap[pt.person_id].add(pt.tag_id);
      });
    }

    for (let i = 0; i < personIds.length; i++) {
        for (let j = i + 1; j < personIds.length; j++) {
            const p1 = personIds[i];
            const p2 = personIds[j];
            const [personA, personB] = p1 < p2 ? [p1, p2] : [p2, p1];

            // Check for common tags
            const tagsA = tagsMap[personA] || new Set();
            const tagsB = tagsMap[personB] || new Set();
            const commonTags = [...tagsA].filter(tagId => tagsB.has(tagId));

            // Only update relationship if they have at least one common tag
            if (commonTags.length > 0) {
                const { data: existingList } = await api.relationships.list({
                    person_a_id: personA,
                    person_b_id: personB
                });
                const existing = existingList && existingList.length > 0 ? existingList[0] : null;

                if (existing) {
                     await api.relationships.update(existing.id, { strength: existing.strength + 1 });
                } else {
                    await api.relationships.create({
                        person_a_id: personA,
                        person_b_id: personB,
                        type: 'Based on Tags', // Or specific tag name if just one? Keep it generic for now.
                        strength: 1,
                        source: 'event+tag'
                    });
                }
            }
        }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) {
      setError('事件名称为必填项');
      setLoading(false);
      return;
    }

    try {
      let eventId;

      if (isEditMode) {
        // Update Event
        const { error: updateError } = await api.events.update(initialData.id, formData);
        
        if (updateError) throw updateError;
        eventId = initialData.id;
      } else {
        // Create Event
        const { data: eventData, error: eventError } = await api.events.create(formData);

        if (eventError) throw eventError;
        eventId = eventData.id;
      }

      // Update Participants (Delete all and re-insert for simplicity)
      if (isEditMode) {
        await api.eventParticipants.delete(eventId);
      }

      if (selectedPeople.length > 0) {
        const participantsData = selectedPeople.map(p => ({
          event_id: eventId,
          person_id: p.id
        }));
        
        const { error: partError } = await api.eventParticipants.create(participantsData);

        if (partError) throw partError;
      }
      
      // Update Relationships
      if (!isEditMode && selectedPeople.length > 0) {
        await updateRelationships(selectedPeople.map(p => p.id));
      }

      // 关联图片（新建模式：之前上传但未关联的图片现在需要关联）
      if (!isEditMode && eventImages.length > 0) {
        for (const image of eventImages) {
          if (!image.event_id) {
            await api.images.linkToEvent(image.id, eventId);
          }
        }
      }

      // Fetch final event data
      const { data: finalEvent } = await api.events.get(eventId);

      onEventUpdated(finalEvent);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPeople = people.filter(p => 
    !selectedPeople.find(sp => sp.id === p.id) && 
    p.name.toLowerCase().includes(peopleSearch.toLowerCase())
  );

  // Image management functions
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // 如果是编辑模式，直接关联到当前事件
      const eventId = isEditMode ? initialData.id : null;
      const { data, error } = await api.images.upload(file, eventId);
      
      if (error) throw error;
      
      if (data) {
        setEventImages([...eventImages, data]);
      }
    } catch (err) {
      setError('上传图片失败: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const loadAvailableImages = async () => {
    try {
      const params = { unlinked: 'true' };
      if (imageSelectorTagFilter) params.tag = imageSelectorTagFilter;
      if (imageSelectorSearch) params.search = imageSelectorSearch;
      
      const { data, error } = await api.images.list(params);
      if (error) throw error;
      setAvailableImages(data || []);
    } catch (err) {
      console.error('获取图片失败:', err);
    }
  };

  // 当筛选条件变化时重新加载图片
  useEffect(() => {
    if (showImageSelector) {
      loadAvailableImages();
    }
  }, [imageSelectorTagFilter, imageSelectorSearch, showImageSelector]);

  const openImageSelector = async () => {
    setShowImageSelector(true);
    setImageSelectorTagFilter('');
    setImageSelectorSearch('');
    setSelectedImagesInModal([]);
    await loadAvailableImages();
  };

  const closeImageSelector = () => {
    setShowImageSelector(false);
  };

  const saveSelectedImages = async () => {
    if (selectedImagesInModal.length === 0) {
      closeImageSelector();
      return;
    }

    if (!isEditMode) {
      // 新建模式：先添加到列表，保存时再关联
      setEventImages([...eventImages, ...selectedImagesInModal]);
      closeImageSelector();
      return;
    }

    // 编辑模式：批量关联到事件
    try {
      for (const image of selectedImagesInModal) {
        const { error } = await api.images.linkToEvent(image.id, initialData.id);
        if (error) throw error;
      }
      // 刷新事件图片列表
      const { data } = await api.images.list({ eventId: initialData.id });
      if (data) setEventImages(data);
      closeImageSelector();
    } catch (err) {
      setError('关联图片失败: ' + err.message);
    }
  };

  const toggleImageSelection = (image) => {
    const isSelected = selectedImagesInModal.some(img => img.id === image.id);
    if (isSelected) {
      setSelectedImagesInModal(selectedImagesInModal.filter(img => img.id !== image.id));
    } else {
      setSelectedImagesInModal([...selectedImagesInModal, image]);
    }
  };

  const removeImage = async (imageId) => {
    if (!isEditMode) {
      // 新建模式：仅从列表移除
      setEventImages(eventImages.filter(img => img.id !== imageId));
      return;
    }

    // 编辑模式：解除关联
    try {
      const { error } = await api.images.unlinkFromEvent(imageId);
      if (error) throw error;
      setEventImages(eventImages.filter(img => img.id !== imageId));
    } catch (err) {
      setError('移除图片失败: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditMode ? '编辑事件' : '添加新事件'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">事件名称 *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">日期</label>
                <input
                  type="date"
                  name="event_date"
                  value={formData.event_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
                <input
                  type="text"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  placeholder="例如：聚餐、会议"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">地点</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              参与人
            </label>
            <div className="flex flex-wrap gap-2 mb-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md min-h-[42px] bg-white dark:bg-gray-700 transition-colors">
              {selectedPeople.length === 0 && <span className="text-gray-400 dark:text-gray-500 text-sm">暂无参与人</span>}
              {selectedPeople.map(person => (
                <span key={person.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 transition-colors">
                  {person.name}
                  <button
                    type="button"
                    onClick={() => togglePerson(person)}
                    className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-400 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 hover:text-blue-500 dark:hover:text-blue-100 focus:outline-none transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            
            <div className="relative">
              <div className="flex gap-2 mb-2">
                <input
                    type="text"
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                    placeholder="搜索并添加参与人..."
                />
                <select
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="w-32 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                    <option value="all">所有标签</option>
                    {tags.map(tag => (
                        <option key={tag.id} value={tag.id}>{tag.name}</option>
                    ))}
                </select>
              </div>
              
              <div className="w-full bg-white dark:bg-gray-800 shadow-inner border border-gray-200 dark:border-gray-700 rounded-md max-h-40 overflow-y-auto transition-colors">
                  {(() => {
                    const searchResults = people.filter(p => {
                        const matchesName = p.name.toLowerCase().includes(peopleSearch.toLowerCase());
                        const matchesTag = tagFilter === 'all' || (personTagsMap[p.id] && personTagsMap[p.id].has(tagFilter));
                        return matchesName && matchesTag;
                    });

                    return searchResults.length === 0 ? (
                      <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">未找到人物</div>
                    ) : (
                      searchResults.map(person => {
                          const isSelected = selectedPeople.some(p => p.id === person.id);
                          return (
                            <div
                                key={person.id}
                                onClick={() => togglePerson(person)}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors ${
                                    isSelected 
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' 
                                        : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                <span className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                                    {person.name}
                                </span>
                                {isSelected && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 dark:text-blue-400">
                                        <Check className="h-4 w-4" />
                                    </span>
                                )}
                            </div>
                          );
                      })
                    );
                  })()}
              </div>
            </div>
          </div>

          {/* Image Management Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              相关照片
            </label>
            
            {/* Image Gallery */}
            {eventImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {eventImages.map((image) => (
                  <div key={image.id} className="relative group aspect-square">
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Image Actions */}
            <div className="flex gap-2">
              <label className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                <Upload className="h-4 w-4 mr-2" />
                {uploadingImage ? '上传中...' : '上传照片'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
              <button
                type="button"
                onClick={openImageSelector}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Link className="h-4 w-4 mr-2" />
                从图片库选择
              </button>
            </div>
          </div>

          {/* Image Selector Modal */}
          {showImageSelector && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    选择图片 {selectedImagesInModal.length > 0 && (
                      <span className="text-sm font-normal text-blue-600 dark:text-blue-400">
                        (已选 {selectedImagesInModal.length} 张)
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={closeImageSelector}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                {/* Filter Bar */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                  {/* Search by filename */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索照片名称..."
                      value={imageSelectorSearch}
                      onChange={(e) => setImageSelectorSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  
                  {/* Tag Filter */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setImageSelectorTagFilter('')}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        !imageSelectorTagFilter
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      全部
                    </button>
                    {tags.map(tag => (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => setImageSelectorTagFilter(tag.name)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                          imageSelectorTagFilter === tag.name
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }}></span>
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 overflow-y-auto max-h-[45vh]">
                  {availableImages.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      暂无符合条件的图片
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {availableImages.map((image) => {
                        const isSelected = selectedImagesInModal.some(img => img.id === image.id);
                        return (
                          <div
                            key={image.id}
                            onClick={() => toggleImageSelection(image)}
                            className={`cursor-pointer aspect-square relative group rounded-lg overflow-hidden transition-all ${
                              isSelected ? 'ring-2 ring-blue-500' : ''
                            }`}
                          >
                            <img
                              src={image.url}
                              alt={image.filename}
                              className="w-full h-full object-cover transition-all group-hover:opacity-90"
                            />
                            {/* Selection Checkmark */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                            {/* Image Tags Preview */}
                            {image.tags && image.tags.length > 0 && (
                              <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {image.tags.slice(0, 3).map(tag => (
                                  <span 
                                    key={tag.id}
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                    title={tag.name}
                                  />
                                ))}
                                {image.tags.length > 3 && (
                                  <span className="text-[8px] text-white bg-black/50 rounded px-1">
                                    +{image.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Bottom Action Bar */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    点击多张图片可多选
                  </span>
                  <button
                    onClick={saveSelectedImages}
                    disabled={selectedImagesInModal.length === 0}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedImagesInModal.length > 0
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    关联选中的 {selectedImagesInModal.length} 张图片
                  </button>
                </div>
              </div>
            </div>
          )}

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

export default EventForm;
