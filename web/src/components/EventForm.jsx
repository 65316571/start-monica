import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, Trash, Search } from 'lucide-react';

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
  const isEditMode = !!initialData;

  useEffect(() => {
    fetchPeople();
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

  const fetchPeople = async () => {
    const { data } = await supabase.from('people').select('id, name').order('name');
    if (data) setPeople(data);
  };

  const fetchParticipants = async (eventId) => {
    const { data } = await supabase
      .from('event_participants')
      .select('people(id, name)')
      .eq('event_id', eventId);
    
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
    const { data: personTags } = await supabase
      .from('person_tags')
      .select('person_id, tag_id')
      .in('person_id', personIds);

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
                const { data: existing } = await supabase
                    .from('relationships')
                    .select('id, strength')
                    .eq('person_a_id', personA)
                    .eq('person_b_id', personB)
                    .maybeSingle();

                if (existing) {
                     await supabase
                        .from('relationships')
                        .update({ strength: existing.strength + 1 })
                        .eq('id', existing.id);
                } else {
                    await supabase
                        .from('relationships')
                        .insert({
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
        const { error: updateError } = await supabase
          .from('events')
          .update(formData)
          .eq('id', initialData.id);
        
        if (updateError) throw updateError;
        eventId = initialData.id;
      } else {
        // Create Event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .insert([formData])
          .select()
          .single();

        if (eventError) throw eventError;
        eventId = eventData.id;
      }

      // Update Participants (Delete all and re-insert for simplicity)
      if (isEditMode) {
        await supabase.from('event_participants').delete().eq('event_id', eventId);
      }

      if (selectedPeople.length > 0) {
        const participantsData = selectedPeople.map(p => ({
          event_id: eventId,
          person_id: p.id
        }));
        
        const { error: partError } = await supabase
          .from('event_participants')
          .insert(participantsData);

        if (partError) throw partError;
        
        // Update Relationships (Only on create for now to avoid complexity of reducing strength on remove)
        if (!isEditMode) {
            await updateRelationships(selectedPeople.map(p => p.id));
        }
      }

      // Fetch final event data
      const { data: finalEvent } = await supabase
        .from('events')
        .select(`
            *,
            event_participants (
            people (
                id,
                name
            )
            )
        `)
        .eq('id', eventId)
        .single();

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? '编辑事件' : '添加新事件'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">事件名称 *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                <input
                  type="date"
                  name="event_date"
                  value={formData.event_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <input
                  type="text"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  placeholder="例如：聚餐、会议"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地点</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Participants Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">参与人</label>
            
            {/* Selected List */}
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedPeople.map(person => (
                <span key={person.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {person.name}
                  <button type="button" onClick={() => togglePerson(person)} className="ml-1 text-blue-400 hover:text-blue-600">
                    <X size={14} />
                  </button>
                </span>
              ))}
              {selectedPeople.length === 0 && <span className="text-gray-400 text-sm italic">未选择参与人</span>}
            </div>

            {/* Search and Add */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                    type="text"
                    placeholder="搜索并添加参与人..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                />
                {peopleSearch && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-40 rounded-md py-1 text-sm overflow-auto border border-gray-200">
                        {filteredPeople.length > 0 ? filteredPeople.map(person => (
                            <div 
                                key={person.id}
                                className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                onClick={() => {
                                    togglePerson(person);
                                    setPeopleSearch('');
                                }}
                            >
                                {person.name}
                            </div>
                        )) : (
                            <div className="px-4 py-2 text-gray-500">未找到匹配的人物</div>
                        )}
                    </div>
                )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
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

export default EventForm;
