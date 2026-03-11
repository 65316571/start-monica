import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Search, Plus, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, addMonths, subMonths, addYears, subYears, addWeeks, subWeeks, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfWeek, endOfWeek, getYear, getMonth, getDate, differenceInDays, getDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import EventForm from '../components/EventForm';

const LifeTimeline = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState('year'); // 'decade', 'year', 'month', 'week'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filteredEvents, setFilteredEvents] = useState([]);
  const timelineRef = useRef(null);
  
  // New State for Search, Filter, and Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('all');

  useEffect(() => {
    fetchEvents();
    fetchTags();
  }, []);

  useEffect(() => {
    // Filter events based on visible range (simplified for now to current year/month)
    filterEventsForView();
  }, [events, currentDate, zoomLevel, searchQuery, selectedTag]); // Re-filter when search or tag changes

  const fetchTags = async () => {
      const { data, error } = await api.tags.list();
      if (!error) setTags(data || []);
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await api.events.list();

    if (error) {
      console.error('Error fetching events:', error);
    } else {
      setEvents(data);
    }
    setLoading(false);
  };
  
  const handleEventCreated = (newEvent) => {
    fetchEvents();
    setIsModalOpen(false);
  };
  
  const handleAddEventClick = () => {
      navigate('/events', { state: { openAddModal: true } });
  };

  const filterEventsForView = () => {
    let start, end;
    if (zoomLevel === 'year') {
      start = startOfYear(currentDate);
      end = endOfYear(currentDate);
    } else if (zoomLevel === 'month') {
        // Show current month
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else if (zoomLevel === 'week') {
        // Show current week
        start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
        // Decade - show +/- 5 years
        start = new Date(currentDate.getFullYear() - 5, 0, 1);
        end = new Date(currentDate.getFullYear() + 5, 11, 31);
    }

    const visible = events.filter(e => {
        const d = new Date(e.event_date);
        const inDateRange = d >= start && d <= end;
        const matchesSearch = searchQuery === '' || 
            e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()));
            
        // Filter by Tag (Implicitly via participants)
        let matchesTag = true;
        if (selectedTag !== 'all') {
            // Check if any participant has this tag
            const hasParticipantWithTag = e.event_participants && e.event_participants.some(ep => {
                if (!ep.people || !ep.people.person_tags) return false;
                // person_tags is array of objects { tags: { id, name } }
                return ep.people.person_tags.some(pt => pt.tags && pt.tags.name === selectedTag);
            });
            matchesTag = hasParticipantWithTag;
        }

        return inDateRange && matchesSearch && matchesTag;
    });
    setFilteredEvents(visible);
  };

  // --- Rendering Helpers ---

  // Generate grid ticks (X-axis labels)
  const getGridTicks = () => {
    const ticks = [];
    if (zoomLevel === 'year') {
        // 12 Months
        for (let i = 0; i < 12; i++) {
            ticks.push({ 
                label: `${i + 1}月`, 
                left: (i / 12) * 100, 
                width: 100/12,
                color: i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800' 
            });
        }
    } else if (zoomLevel === 'month') {
        // Weeks in month (approx 4-5)
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        // Ensure we cover full weeks from Monday
        const weeks = Math.ceil((getDate(end) + getDay(start) - 1) / 7) || 4;
        
        for (let i = 0; i < weeks; i++) {
            ticks.push({ 
                label: `第${i + 1}周`, 
                left: (i / weeks) * 100,
                width: 100/weeks,
                color: i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
            });
        }
    } else if (zoomLevel === 'week') {
        // 7 Days
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        for (let i = 0; i < 7; i++) {
            ticks.push({ 
                label: days[i], 
                left: (i / 7) * 100,
                width: 100/7,
                color: i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
            });
        }
    } else {
        // Decade (Years)
        for (let i = 0; i < 10; i++) {
            ticks.push({ 
                label: `${currentDate.getFullYear() - 5 + i}`, 
                left: (i / 10) * 100,
                width: 100/10,
                color: i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
            });
        }
    }
    return ticks;
  };

  // Group events by time slot to handle overlaps
  const getGroupedEvents = () => {
      const groups = {};
      
      filteredEvents.forEach(event => {
          const date = new Date(event.event_date);
          let key;
          
          if (zoomLevel === 'year') {
              key = getMonth(date); // 0-11
          } else if (zoomLevel === 'month') {
              // Approximate week index relative to start of month
              const start = startOfMonth(currentDate);
              // Simple week calc: (Day of month + start day offset) / 7
              // Or better: difference in weeks?
              // Let's stick to simple day-based bucketing for visual consistency
              key = Math.floor((getDate(date) - 1) / 7); 
              // Clamp to last bucket if 31st day creates 5th bucket but we only render 4?
              // Usually max 5 weeks.
          } else if (zoomLevel === 'week') {
              key = getDay(date) === 0 ? 6 : getDay(date) - 1; // 0 (Mon) - 6 (Sun)
          } else {
              key = date.getFullYear() - (currentDate.getFullYear() - 5);
          }

          if (!groups[key]) groups[key] = [];
          groups[key].push(event);
      });
      return groups;
  };

  const navigateTime = (direction) => {
    if (zoomLevel === 'year') {
        setCurrentDate(prev => direction === 'next' ? addYears(prev, 1) : subYears(prev, 1));
    } else if (zoomLevel === 'month') {
        setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    } else if (zoomLevel === 'week') {
        setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
        setCurrentDate(prev => direction === 'next' ? addYears(prev, 5) : subYears(prev, 5));
    }
  };

  const ticks = getGridTicks();
  const groupedEvents = getGroupedEvents();

  const handleEventClick = (eventId) => {
      // Navigate to events list, potentially filtering or highlighting the specific event
      navigate('/events');
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors duration-200">
      {/* Top Navigation */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">人生浏览</h2>
            <div className="flex bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-300 dark:border-gray-600">
                <button 
                    onClick={() => setZoomLevel('decade')}
                    className={`px-3 py-1.5 text-sm font-medium ${zoomLevel === 'decade' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'} border-r border-gray-300 dark:border-gray-600 first:rounded-l-md transition-colors`}
                >
                    十年
                </button>
                <button 
                    onClick={() => setZoomLevel('year')}
                    className={`px-3 py-1.5 text-sm font-medium ${zoomLevel === 'year' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'} border-r border-gray-300 dark:border-gray-600 transition-colors`}
                >
                    年
                </button>
                <button 
                    onClick={() => setZoomLevel('month')}
                    className={`px-3 py-1.5 text-sm font-medium ${zoomLevel === 'month' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'} border-r border-gray-300 dark:border-gray-600 transition-colors`}
                >
                    月
                </button>
                <button 
                    onClick={() => setZoomLevel('week')}
                    className={`px-3 py-1.5 text-sm font-medium ${zoomLevel === 'week' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'} last:rounded-r-md transition-colors`}
                >
                    周
                </button>
            </div>
        </div>
        <div className="flex items-center space-x-2">
            <div className={`flex items-center transition-all duration-300 ${isSearchOpen ? 'w-48 bg-gray-100 dark:bg-gray-700 rounded-md px-2' : 'w-10'}`}>
                <button 
                    onClick={() => {
                        setIsSearchOpen(!isSearchOpen);
                        if (isSearchOpen) setSearchQuery(''); // Clear search on close
                    }}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex-shrink-0 transition-colors"
                >
                    {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                </button>
                {isSearchOpen && (
                    <input 
                        type="text" 
                        placeholder="搜索事件..." 
                        className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                )}
            </div>
            
            <div className="relative">
                <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`p-2 rounded-full transition-colors ${selectedTag !== 'all' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`} 
                    title="筛选标签"
                >
                    <Filter className="h-5 w-5" />
                </button>
                {isFilterOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                            按参与人标签筛选
                        </div>
                        <button
                            onClick={() => { setSelectedTag('all'); setIsFilterOpen(false); }}
                            className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedTag === 'all' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                            全部事件
                        </button>
                        {tags.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => { setSelectedTag(tag.name); setIsFilterOpen(false); }}
                                className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedTag === tag.name ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                            >
                                {tag.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button 
                onClick={handleAddEventClick}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm font-medium transition-colors"
            >
                <Plus className="h-4 w-4 mr-1" />
                新增事件
            </button>
        </div>
      </div>

      {/* Timeline Area */}
      <div className="flex-1 flex flex-col min-h-[300px] border-b border-gray-200 dark:border-gray-700 relative bg-slate-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Time Navigation Header */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 flex items-center space-x-4 transition-colors duration-200">
            <button onClick={() => navigateTime('prev')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <span className="text-lg font-bold text-gray-800 dark:text-white min-w-[120px] text-center">
                {zoomLevel === 'year' && format(currentDate, 'yyyy年')}
                {zoomLevel === 'month' && format(currentDate, 'yyyy年MM月', { locale: zhCN })}
                {zoomLevel === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MM-dd')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MM-dd')}`}
                {zoomLevel === 'decade' && `${currentDate.getFullYear() - 5} - ${currentDate.getFullYear() + 5}`}
            </span>
            <button onClick={() => navigateTime('next')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
        </div>

        {/* Fixed Grid Timeline */}
        <div 
            ref={timelineRef}
            className="flex-1 w-full relative mt-16 px-4 pb-4 overflow-hidden"
        >
            <div className="h-full w-full relative flex border-t border-gray-300 dark:border-gray-600">
                {/* Grid Columns */}
                {ticks.map((tick, index) => (
                    <div 
                        key={index} 
                        className={`absolute h-full border-r border-gray-200 dark:border-gray-700 border-dashed last:border-0 ${tick.color} transition-colors duration-200`}
                        style={{ left: `${tick.left}%`, width: `${tick.width}%` }}
                    >
                        <div className="absolute -top-6 w-full text-center text-xs font-bold text-gray-500 dark:text-gray-400">{tick.label}</div>
                        
                        {/* Event Stack */}
                        <div className="flex flex-col items-center pt-8 space-y-2 w-full px-1">
                            {groupedEvents[index] && groupedEvents[index].map((event, i) => (
                                <div 
                                    key={event.id}
                                    onClick={() => handleEventClick(event.id)}
                                    className="w-full text-center group relative cursor-pointer"
                                    title={`${format(new Date(event.event_date), 'yyyy-MM-dd')} ${event.name} - ${event.description || ''}`}
                                >
                                    <div className={`mx-auto w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 shadow-sm ${
                                        event.type === 'milestone' ? 'bg-red-500 w-4 h-4' : 'bg-blue-500'
                                    }`}></div>
                                    
                                    <div className="mt-1 text-xs text-gray-700 dark:text-gray-200 font-medium truncate w-full bg-white/60 dark:bg-gray-800/60 rounded px-1 backdrop-blur-[1px] hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm hover:z-50 hover:whitespace-normal hover:absolute hover:w-32 hover:left-1/2 hover:-translate-x-1/2 transition-all">
                                        {format(new Date(event.event_date), 'MM-dd')} {event.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Event List Area */}
      <div className="h-1/3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto p-6 transition-colors duration-200">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
            当前查看范围事件 ({filteredEvents.length})
        </h3>
        <div className="space-y-3">
            {filteredEvents.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">该时间段暂无记录</p>
            ) : (
                filteredEvents.map(event => (
                    <div key={event.id} className="flex items-start p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-transparent hover:border-gray-100 dark:hover:border-gray-600 transition-colors">
                        <div className="flex-shrink-0 w-16 text-sm text-gray-500 dark:text-gray-400 font-medium pt-1">
                            {format(new Date(event.event_date), 'MM-dd')}
                        </div>
                        <div className="flex-1 ml-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{event.name}</h4>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{event.type}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{event.description}</p>
                            {event.event_participants && event.event_participants.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {event.event_participants.map(ep => (
                                        <span key={ep.people.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                            {ep.people.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Add Event Modal */}
      {isModalOpen && (
         <EventForm 
           onClose={() => setIsModalOpen(false)} 
           onEventUpdated={handleEventCreated}
         />
      )}
    </div>
  );
};

export default LifeTimeline;
