import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Filter, Activity, Calendar as CalendarIcon, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, addYears, subYears, addWeeks, subWeeks, startOfYear, endOfYear, startOfWeek, endOfWeek, getYear, getMonth, getDate, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const LifeTimeline = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState('year'); // 'decade', 'year', 'month', 'week'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filteredEvents, setFilteredEvents] = useState([]);
  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Filter events based on visible range (simplified for now to current year/month)
    filterEventsForView();
  }, [events, currentDate, zoomLevel]);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
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
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
    } else {
      setEvents(data);
    }
    setLoading(false);
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
        return d >= start && d <= end;
    });
    setFilteredEvents(visible);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - timelineRef.current.offsetLeft);
    setScrollLeft(timelineRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - timelineRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll-fast
    // Instead of scrolling div, we might want to adjust currentDate
    // For now, let's implement simple date shifting based on drag
    // This part is tricky with React state, might need throttle
  };

  // Simplified navigation for MVP
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

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow overflow-hidden">
      {/* Top Navigation */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-800">人生浏览</h2>
            <div className="flex bg-white rounded-md shadow-sm border border-gray-300">
                <button 
                    onClick={() => setZoomLevel('decade')}
                    className={`px-3 py-1.5 text-sm font-medium ${zoomLevel === 'decade' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'} border-r border-gray-300 first:rounded-l-md`}
                >
                    十年
                </button>
                <button 
                    onClick={() => setZoomLevel('year')}
                    className={`px-3 py-1.5 text-sm font-medium ${zoomLevel === 'year' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'} border-r border-gray-300`}
                >
                    年
                </button>
                <button 
                    onClick={() => setZoomLevel('month')}
                    className={`px-3 py-1.5 text-sm font-medium ${zoomLevel === 'month' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'} border-r border-gray-300`}
                >
                    月
                </button>
                <button 
                    onClick={() => setZoomLevel('week')}
                    className={`px-3 py-1.5 text-sm font-medium ${zoomLevel === 'week' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'} last:rounded-r-md`}
                >
                    周
                </button>
            </div>
        </div>
        <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full">
                <Search className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full">
                <Filter className="h-5 w-5" />
            </button>
            <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
                <Plus className="h-4 w-4 mr-1" />
                新增事件
            </button>
        </div>
      </div>

      {/* Timeline Area */}
      <div className="flex-1 flex flex-col min-h-[300px] border-b border-gray-200 relative bg-slate-50">
        {/* Time Navigation Header */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-200 flex items-center space-x-4">
            <button onClick={() => navigateTime('prev')} className="p-1 hover:bg-gray-100 rounded-full">
                <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <span className="text-lg font-bold text-gray-800 min-w-[120px] text-center">
                {zoomLevel === 'year' && format(currentDate, 'yyyy年')}
                {zoomLevel === 'month' && format(currentDate, 'yyyy年MM月', { locale: zhCN })}
                {zoomLevel === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MM-dd')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MM-dd')}`}
                {zoomLevel === 'decade' && `${currentDate.getFullYear() - 5} - ${currentDate.getFullYear() + 5}`}
            </span>
            <button onClick={() => navigateTime('next')} className="p-1 hover:bg-gray-100 rounded-full">
                <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
        </div>

        {/* The Timeline Visualization (Placeholder for D3/Canvas) */}
        <div 
            ref={timelineRef}
            className="flex-1 w-full overflow-x-auto overflow-y-hidden relative custom-scrollbar mt-16"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
        >
            <div className="h-full min-w-full flex items-center relative px-10" style={{ width: '200%' }}>
                {/* Horizontal Line */}
                <div className="absolute w-full h-0.5 bg-gray-300 top-1/2 transform -translate-y-1/2"></div>
                
                {/* Ticks & Events - Simplistic rendering for MVP */}
                {/* We would render ticks dynamically based on zoom level */}
                <div className="relative w-full h-full">
                    {/* Render Events as dots */}
                    {filteredEvents.map((event, index) => {
                        // Calculate position percentage
                        let percent = 0;
                        const date = new Date(event.event_date);
                        
                        if (zoomLevel === 'year') {
                            const start = startOfYear(currentDate);
                            const totalDays = 365; // approx
                            const daysDiff = differenceInDays(date, start);
                            percent = (daysDiff / totalDays) * 100;
                        } else if (zoomLevel === 'month') {
                            const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                            percent = ((date.getDate() - 1) / daysInMonth) * 100;
                        } else if (zoomLevel === 'week') {
                            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
                            const daysDiff = differenceInDays(date, start);
                            // 7 days in a week
                            percent = (daysDiff / 7) * 100;
                        } else {
                            // Decade
                            const startYear = currentDate.getFullYear() - 5;
                            const totalYears = 10;
                            const yearDiff = date.getFullYear() - startYear + (date.getMonth() / 12);
                            percent = (yearDiff / totalYears) * 100;
                        }

                        // Constrain for demo 200% width container
                        // In real app, we need virtual scrolling or canvas
                        const styleLeft = `${Math.max(0, Math.min(100, percent))}%`;

                        return (
                            <div 
                                key={event.id}
                                className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                                style={{ left: styleLeft }}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                                    event.type === 'milestone' ? 'bg-red-500 w-5 h-5' : 'bg-blue-500'
                                } group-hover:scale-125 transition-transform`}></div>
                                
                                {/* Full Label always visible */}
                                <div className="mt-4 text-xs text-gray-700 font-medium whitespace-nowrap bg-white/50 px-1 rounded backdrop-blur-[1px]">
                                    {format(date, 'MM-dd')} {event.name}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>

      {/* Event List Area */}
      <div className="h-1/3 border-t border-gray-200 bg-white overflow-y-auto p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-gray-500" />
            当前查看范围事件 ({filteredEvents.length})
        </h3>
        <div className="space-y-3">
            {filteredEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">该时间段暂无记录</p>
            ) : (
                filteredEvents.map(event => (
                    <div key={event.id} className="flex items-start p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors">
                        <div className="flex-shrink-0 w-16 text-sm text-gray-500 font-medium pt-1">
                            {format(new Date(event.event_date), 'MM-dd')}
                        </div>
                        <div className="flex-1 ml-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-gray-900">{event.name}</h4>
                                <span className="text-xs text-gray-400">{event.type}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{event.description}</p>
                            {event.event_participants && event.event_participants.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {event.event_participants.map(ep => (
                                        <span key={ep.people.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
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
    </div>
  );
};

export default LifeTimeline;
