import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { Plus, Edit, Calendar, MapPin, Users, Search, ArrowUp, ArrowDown } from 'lucide-react';
import EventForm from '../components/EventForm';

const Events = () => {
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('events_searchTerm') || '');
  const [selectedYear, setSelectedYear] = useState(() => sessionStorage.getItem('events_selectedYear') || 'all');
  const [selectedMonth, setSelectedMonth] = useState(() => sessionStorage.getItem('events_selectedMonth') || 'all');
  const [years, setYears] = useState([]);
  const [sortOrder, setSortOrder] = useState(() => sessionStorage.getItem('events_sortOrder') || 'desc');
  
  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState([]);

  useEffect(() => {
    sessionStorage.setItem('events_searchTerm', searchTerm);
    sessionStorage.setItem('events_selectedYear', selectedYear);
    sessionStorage.setItem('events_selectedMonth', selectedMonth);
    sessionStorage.setItem('events_sortOrder', sortOrder);
  }, [searchTerm, selectedYear, selectedMonth, sortOrder]);

  useEffect(() => {
    fetchEvents();
    // Check for navigation state to open modal
    if (location.state?.openAddModal) {
        openAddModal();
        // Optional: clear state to prevent reopening on refresh? 
        // React Router state persists on refresh usually, but handling it once is fine.
        window.history.replaceState({}, document.title);
    }
  }, [sortOrder]);

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await api.events.list();

    if (error) {
      console.error('Error fetching events:', error);
    } else {
      setEvents(data);
      // Extract years for filter
      const uniqueYears = [...new Set(data.map(e => new Date(e.event_date).getFullYear()))];
      setYears(uniqueYears.sort((a, b) => b - a));
    }
    setLoading(false);
  };

  const handleEventUpdated = (updatedEvent) => {
    if (editingEvent) {
        setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    } else {
        setEvents([updatedEvent, ...events]);
    }
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  // Lightbox handlers
  const openLightbox = (images, index) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxImage(images[index]);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxImages([]);
    setLightboxIndex(0);
  };

  const nextImage = () => {
    const newIndex = (lightboxIndex + 1) % lightboxImages.length;
    setLightboxIndex(newIndex);
    setLightboxImage(lightboxImages[newIndex]);
  };

  const prevImage = () => {
    const newIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    setLightboxIndex(newIndex);
    setLightboxImage(lightboxImages[newIndex]);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const eventDate = new Date(event.event_date);
    const matchesYear = selectedYear === 'all' || eventDate.getFullYear().toString() === selectedYear;
    const matchesMonth = selectedMonth === 'all' || (eventDate.getMonth() + 1).toString() === selectedMonth;

    return matchesSearch && matchesYear && matchesMonth;
  });

  // Group events by Year-Month
  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const date = new Date(event.event_date);
    const yearMonth = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    if (!groups[yearMonth]) {
        groups[yearMonth] = [];
    }
    groups[yearMonth].push(event);
    return groups;
  }, {});

  const sortedGroups = Object.keys(groupedEvents).sort((a, b) => {
    // Custom sort for "YYYY年M月" format
    const [yA, mA] = a.match(/\d+/g).map(Number);
    const [yB, mB] = b.match(/\d+/g).map(Number);
    if (sortOrder === 'desc') {
        return yB - yA || mB - mA;
    } else {
        return yA - yB || mA - mB;
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">事件记录</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">记录您的互动与共同经历。</p>
        </div>
        <div className="flex gap-2">
            <button
                onClick={toggleSort}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
                {sortOrder === 'desc' ? (
                    <>
                        <ArrowDown className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                        日期倒序
                    </>
                ) : (
                    <>
                        <ArrowUp className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                        日期正序
                    </>
                )}
            </button>
            <button 
            onClick={openAddModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
            <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            添加事件
            </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 items-center transition-colors duration-200">
        <div className="flex-1 w-full sm:w-auto relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
            placeholder="搜索事件..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
            <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="block w-1/2 sm:w-32 pl-3 pr-8 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-gray-600 cursor-pointer transition-colors"
            >
                <option value="all">所有年份</option>
                {years.map(year => (
                    <option key={year} value={year}>{year}年</option>
                ))}
            </select>
            
            <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block w-1/2 sm:w-32 pl-3 pr-8 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-gray-600 cursor-pointer transition-colors"
            >
                <option value="all">所有月份</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{month}月</option>
                ))}
            </select>
        </div>
      </div>

      {/* Events List Grouped */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <p className="text-gray-500 dark:text-gray-400">暂无事件记录</p>
        </div>
      ) : (
        <div className="space-y-8">
            {sortedGroups.map(group => (
                <div key={group}>
                    <div className="flex items-center mb-4">
                        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                        <span className="px-4 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-full py-1 border border-gray-200 dark:border-gray-700 transition-colors">{group}</span>
                        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                    <div className="space-y-4">
                    {groupedEvents[group].map((event) => (
                        <div key={event.id} className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow relative group">
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                            onClick={() => openEditModal(event)}
                            className="p-1 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                            title="编辑"
                            >
                            <Edit className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <div className="flex flex-col md:flex-row justify-between md:items-start">
                            <div className="flex-1">
                            <div className="flex items-center">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{event.name}</h3>
                                {event.type && (
                                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                    {event.type}
                                </span>
                                )}
                            </div>
                            
                            <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                                <div className="flex items-center">
                                <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                {new Date(event.event_date).toLocaleDateString()}
                                </div>
                                {event.location && (
                                <div className="flex items-center">
                                    <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    {event.location}
                                </div>
                                )}
                            </div>

                            {event.description && (
                                <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm">{event.description}</p>
                            )}

                            {/* Images Preview */}
                            {event.images && event.images.length > 0 && (
                              <div className="mt-4 flex gap-2 overflow-x-auto">
                                {event.images.slice(0, 4).map((image, index) => (
                                  <img
                                    key={image.id}
                                    src={image.url}
                                    alt={image.filename}
                                    onClick={() => openLightbox(event.images, index)}
                                    className="h-16 w-16 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                  />
                                ))}
                                {event.images.length > 4 && (
                                  <div 
                                    onClick={() => openLightbox(event.images, 4)}
                                    className="h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                  >
                                    +{event.images.length - 4}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Participants */}
                            <div className="mt-4 flex items-center flex-wrap gap-2">
                                <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                {event.event_participants && event.event_participants.length > 0 ? (
                                event.event_participants.map((ep) => (
                                    <span key={ep.people.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                    {ep.people.name}
                                    </span>
                                ))
                                ) : (
                                <span className="text-sm text-gray-400 dark:text-gray-500 italic">无参与人</span>
                                )}
                            </div>
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Add/Edit Event Modal */}
      {isModalOpen && (
         <EventForm 
           onClose={() => setIsModalOpen(false)} 
           onEventUpdated={handleEventUpdated}
           initialData={editingEvent}
         />
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors z-50"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white hover:text-gray-300 transition-colors z-50"
            >
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <img
            src={lightboxImage.url}
            alt={lightboxImage.filename}
            className="max-w-[85vw] max-h-[80vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white hover:text-gray-300 transition-colors z-50"
            >
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Image counter */}
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Events;
