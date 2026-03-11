import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { Calendar, Users, TrendingUp, Award, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subYears, addYears, subMonths, addMonths, subWeeks, addWeeks, getMonth, isSameMonth, getWeek, getDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [people, setPeople] = useState([]);
  const [timeRange, setTimeRange] = useState('year'); // 'year', 'month', 'week'
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch all events with participants
    const { data: eventsData, error: eventsError } = await api.events.list();

    // Fetch all people to check 'created_at' for new connections
    const { data: peopleData, error: peopleError } = await api.people.list();

    if (eventsData) setEvents(eventsData);
    if (peopleData) setPeople(peopleData);
    setLoading(false);
  };

  const navigateTime = (direction) => {
    if (timeRange === 'year') {
        setCurrentDate(prev => direction === 'next' ? addYears(prev, 1) : subYears(prev, 1));
    } else if (timeRange === 'month') {
        setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    } else {
        setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    }
  };

  const stats = useMemo(() => {
    if (loading) return null;

    let start, end;
    if (timeRange === 'year') {
        start = startOfYear(currentDate);
        end = endOfYear(currentDate);
    } else if (timeRange === 'month') {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
    } else {
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
    }

    // Filter events in range
    const filteredEvents = events.filter(e => {
        const d = new Date(e.event_date);
        return d >= start && d <= end;
    });

    // 1. Event Count
    const eventCount = filteredEvents.length;

    // 2. New Connections (People created in this range)
    // Note: This relies on 'created_at' being accurate for "meeting time"
    const newPeople = people.filter(p => {
        const d = new Date(p.created_at);
        return d >= start && d <= end;
    });
    const newPeopleCount = newPeople.length;

    // 3. High Frequency Interactions
    const interactionCounts = {};
    filteredEvents.forEach(e => {
        if (e.event_participants) {
            e.event_participants.forEach(ep => {
                if (ep.people) {
                    const name = ep.people.name;
                    interactionCounts[name] = (interactionCounts[name] || 0) + 1;
                }
            });
        }
    });
    
    // Sort and take top 3
    const sortedInteractions = Object.entries(interactionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => `${name}(${count})`);

    // 4. Most Active Period (Month/Week/Day)
    let activePeriodLabel = '最活跃月份';
    let activePeriodValue = '-';

    if (timeRange === 'year') {
        activePeriodLabel = '最活跃月份';
        const counts = Array(12).fill(0);
        filteredEvents.forEach(e => counts[getMonth(new Date(e.event_date))]++);
        const maxIndex = counts.indexOf(Math.max(...counts));
        activePeriodValue = maxIndex >= 0 && counts[maxIndex] > 0 ? `${maxIndex + 1}月` : '-';
    } else if (timeRange === 'month') {
        activePeriodLabel = '最活跃周';
        const counts = {};
        filteredEvents.forEach(e => {
            const w = getWeek(new Date(e.event_date), { weekStartsOn: 1 });
            counts[w] = (counts[w] || 0) + 1;
        });
        const maxWeek = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, null);
        activePeriodValue = maxWeek ? `第 ${maxWeek} 周` : '-';
    } else if (timeRange === 'week') {
        activePeriodLabel = '最活跃天';
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const counts = Array(7).fill(0);
        filteredEvents.forEach(e => counts[getDay(new Date(e.event_date))]++);
        const maxIndex = counts.indexOf(Math.max(...counts));
        activePeriodValue = maxIndex >= 0 && counts[maxIndex] > 0 ? days[maxIndex] : '-';
    }

    return {
        eventCount,
        newPeopleCount,
        topInteractions: sortedInteractions.length > 0 ? sortedInteractions.join(', ') : '无',
        activePeriodLabel,
        activePeriodValue
    };
  }, [events, people, currentDate, timeRange, loading]);

  const getTitle = () => {
      if (timeRange === 'year') return `年度统计 (${format(currentDate, 'yyyy')})`;
      if (timeRange === 'month') return `月度统计 (${format(currentDate, 'yyyy年M月')})`;
      return `周度统计 (${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MM-dd')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MM-dd')})`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <BarChart2 className="mr-3 h-8 w-8 text-blue-600 dark:text-blue-400" />
                数据统计
            </h1>
            
            <div className="flex bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-300 dark:border-gray-600">
                <button 
                    onClick={() => setTimeRange('year')}
                    className={`px-4 py-2 text-sm font-medium ${timeRange === 'year' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'} border-r border-gray-300 dark:border-gray-600 first:rounded-l-md transition-colors`}
                >
                    年度
                </button>
                <button 
                    onClick={() => setTimeRange('month')}
                    className={`px-4 py-2 text-sm font-medium ${timeRange === 'month' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'} border-r border-gray-300 dark:border-gray-600 transition-colors`}
                >
                    月度
                </button>
                <button 
                    onClick={() => setTimeRange('week')}
                    className={`px-4 py-2 text-sm font-medium ${timeRange === 'week' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'} last:rounded-r-md transition-colors`}
                >
                    周度
                </button>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-w-2xl mx-auto transition-colors duration-200">
            {/* Header / Navigation */}
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center transition-colors duration-200">
                <button onClick={() => navigateTime('prev')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{getTitle()}</h2>
                <button onClick={() => navigateTime('next')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors">
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">加载数据中...</div>
            ) : (
                <div className="p-6">
                    <div className="grid gap-6">
                        <div className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 transition-colors">
                            <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full mr-4">
                                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">事件数</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.eventCount}</p>
                            </div>
                        </div>

                        <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800 transition-colors">
                            <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full mr-4">
                                <Users className="h-6 w-6 text-green-600 dark:text-green-300" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">新认识朋友</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.newPeopleCount} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">人</span></p>
                            </div>
                        </div>

                        <div className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800 transition-colors">
                            <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full mr-4">
                                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">高频互动</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white truncate" title={stats?.topInteractions}>
                                    {stats?.topInteractions}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800 transition-colors">
                            <div className="p-3 bg-amber-100 dark:bg-amber-800 rounded-full mr-4">
                                <Award className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stats?.activePeriodLabel}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.activePeriodValue}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Statistics;
