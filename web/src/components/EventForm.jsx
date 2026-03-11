import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { X, Plus, Trash, Search, Check } from 'lucide-react';

const EventForm = ({ onClose, onEventUpdated, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    event_date: new Date().toISOString().split('T')[0],
    type: '',
    location: '',
    description: '',
  });
  const [selectedPeople, setSelectedPeople] = useState([]); // Array of person objects {id, name}
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [peopleResults, setPeopleResults] = useState([]);
  const [tags, setTags] = useState([]);
  const [personTagsMap, setPersonTagsMap] = useState({});

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
      // Assuming initialData comes with participants or we fetch them
      if (initialData.event_participants) {
        setSelectedPeople(initialData.event_participants.map(ep => ep.people));
      } else {
        fetchParticipants(initialData.id);
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
        
        // Update Relationships (Only on create for now to avoid complexity of reducing strength on remove)
        if (!isEditMode) {
            await updateRelationships(selectedPeople.map(p => p.id));
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
