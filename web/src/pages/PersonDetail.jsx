import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Edit, Trash, Calendar, User, Tag } from 'lucide-react';
import PersonForm from '../components/PersonForm';

const PersonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [events, setEvents] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchPersonDetails();
  }, [id]);

  const fetchPersonDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Person Basic Info
      const { data: personData, error: personError } = await supabase
        .from('people')
        .select('*')
        .eq('id', id)
        .single();

      if (personError) throw personError;
      setPerson(personData);

      // 2. Fetch Associated Tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('person_tags')
        .select('tags(id, name)')
        .eq('person_id', id);

      if (tagsError) throw tagsError;
      setTags(tagsData.map(t => t.tags));

      // 3. Fetch Associated Events
      const { data: eventsData, error: eventsError } = await supabase
        .from('event_participants')
        .select('events(*)')
        .eq('person_id', id);
        // .order('created_at', { ascending: false, foreignTable: 'events' }); // Removed server-side sort to avoid issues

      if (eventsError) throw eventsError;
      
      // Client-side sort if needed, or adjust query
      const sortedEvents = eventsData
        .map(ep => ep.events)
        .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
        
      setEvents(sortedEvents);

    } catch (error) {
      console.error('Error fetching person details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonUpdated = (updatedPerson) => {
    setPerson(updatedPerson);
    setIsEditModalOpen(false);
    fetchPersonDetails(); // Re-fetch tags as well
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这个人物吗？相关的关系和事件记录也会受到影响。')) return;

    try {
      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      navigate('/people');
    } catch (error) {
      console.error('Error deleting person:', error);
      alert('删除失败');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!person) {
    return <div className="text-center py-12 text-gray-500">人物未找到</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link to="/people" className="inline-flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回列表
        </Link>
      </div>

      {/* Header Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-3xl">
              {person.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-5">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {person.name}
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {person.gender === 'Male' ? '男' : person.gender === 'Female' ? '女' : person.gender || '未知'}
                </span>
              </h1>
              <div className="mt-1 flex flex-wrap gap-2">
                 {tags.map(tag => (
                   <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                     <Tag className="h-3 w-3 mr-1" />
                     {tag.name}
                   </span>
                 ))}
                 {tags.length === 0 && <span className="text-sm text-gray-400 italic">无标签</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              编辑
            </button>
            <button 
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <Trash className="h-4 w-4 mr-2" />
              删除
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">身份</h3>
            <p className="text-gray-900">{person.identity || '未设置'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">认识时间</h3>
            <p className="text-gray-900">{person.meet_date || '未设置'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">现居城市</h3>
            <p className="text-gray-900">{person.province && person.city ? `${person.province} ${person.city}` : person.province || person.city || '未设置'}</p>
          </div>
           <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">所属行业</h3>
            <p className="text-gray-900">{person.industry || '未设置'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">联系方式</h3>
            <p className="text-gray-900">{person.contact_info || '无'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">备注</h3>
            <p className="text-gray-900 whitespace-pre-wrap">{person.notes || '无'}</p>
          </div>
        </div>
      </div>

      {/* Events History */}
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
        <Calendar className="h-5 w-5 mr-2" />
        参与的事件 ({events.length})
      </h2>
      
      {events.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
          暂无参与事件记录
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden divide-y divide-gray-200">
          {events.map(event => (
            <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{event.name}</h3>
                  <div className="mt-1 text-sm text-gray-500 flex items-center gap-4">
                    <span>{new Date(event.event_date).toLocaleDateString()}</span>
                    {event.type && <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{event.type}</span>}
                    {event.location && <span>@ {event.location}</span>}
                  </div>
                  {event.description && <p className="mt-2 text-gray-600 text-sm">{event.description}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <PersonForm 
          onClose={() => setIsEditModalOpen(false)}
          onPersonUpdated={handlePersonUpdated}
          initialData={person}
        />
      )}
    </div>
  );
};

export default PersonDetail;
