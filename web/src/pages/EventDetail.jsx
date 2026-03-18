import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, Edit, Trash, Calendar, MapPin, Users, FileText } from 'lucide-react';
import EventForm from '../components/EventForm';
import { useAuth } from '../contexts/AuthContext';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Event Basic Info
      const { data: eventData, error: eventError } = await api.events.get(id);

      if (eventError) throw eventError;
      setEvent(eventData);

      // 2. Set Participants from event data
      if (eventData?.event_participants) {
          setParticipants(eventData.event_participants.map(p => p.people));
      } else {
          setParticipants([]);
      }

    } catch (error) {
      console.error('Error fetching event details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventUpdated = (updatedEvent) => {
    setEvent(updatedEvent);
    setIsEditModalOpen(false);
    fetchEventDetails();
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这个事件吗？此操作不可恢复。')) return;

    try {
      const { error } = await api.events.delete(id);

      if (error) throw error;
      
      navigate('/events');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('删除失败');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500 dark:text-gray-400">加载中...</div>;
  }

  if (!event) {
    return <div className="text-center py-12 text-gray-500 dark:text-gray-400">事件未找到</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link to="/events" className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回列表
        </Link>
      </div>

      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-8 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-800 transition-colors duration-200">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-3xl transition-colors">
              <Calendar className="h-8 w-8" />
            </div>
            <div className="ml-5">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                {event.name}
                {event.type && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full transition-colors">
                    {event.type}
                  </span>
                )}
              </h1>
              <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400">
                 <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(event.event_date).toLocaleDateString()}
                 </div>
                 {event.location && (
                    <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {event.location}
                    </div>
                 )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {canWrite() && (
            <>
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              编辑
            </button>
            <button 
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <Trash className="h-4 w-4 mr-2" />
              删除
            </button>
            </>
            )}
          </div>
        </div>

        {/* Details Content */}
        <div className="px-6 py-6 bg-white dark:bg-gray-800 transition-colors duration-200">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                描述
            </h3>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                {event.description || '暂无描述'}
            </p>
          </div>
        </div>
      </div>

      {/* Participants Section */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center transition-colors">
        <Users className="h-5 w-5 mr-2" />
        参与人员 ({participants.length})
      </h2>
      
      {participants.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          暂无参与人员
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {participants.map(person => (
            <Link 
                key={person.id} 
                to={`/people/${person.id}`}
                className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex items-center border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
            >
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg mr-3 flex-shrink-0">
                {person.name.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <h3 className="text-md font-medium text-gray-900 dark:text-white truncate">{person.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {person.relationship || '未知关系'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && canWrite() && (
        <EventForm 
          onClose={() => setIsEditModalOpen(false)}
          onEventUpdated={handleEventUpdated}
          initialData={event}
        />
      )}
    </div>
  );
};

export default EventDetail;
