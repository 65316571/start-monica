import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Settings, Database, Tag, Activity, BarChart2, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState([]);
  const { menuItems } = useTheme();

  const defaultNavItems = [
    { name: '仪表盘', path: '/', icon: LayoutDashboard, color: 'text-blue-500', id: 'dashboard' },
    { name: '人生浏览', path: '/timeline', icon: Activity, color: 'text-orange-500', id: 'timeline' },
    { name: '数据统计', path: '/statistics', icon: BarChart2, color: 'text-red-500', id: 'statistics' },
    { name: '事件记录', path: '/events', icon: Calendar, color: 'text-purple-500', id: 'events' },
    { name: '人物管理', path: '/people', icon: Users, color: 'text-green-500', id: 'people' },
    { name: '标签管理', path: '/tags', icon: Tag, color: 'text-indigo-500', id: 'tags' },
    { name: '图片管理', path: '/images', icon: ImageIcon, color: 'text-pink-500', id: 'images' },
    { name: '数据管理', path: '/data', icon: Database, color: 'text-cyan-500', id: 'data' },
    { name: '设置中心', path: '/settings', icon: Settings, color: 'text-gray-500', id: 'settings' },
  ];

  // Combine default items with stored custom names and order
  const displayNavItems = React.useMemo(() => {
    if (!menuItems || menuItems.length === 0) return defaultNavItems;
    
    // Map default items by ID for easy lookup of static properties (icon, path, color)
    const defaultItemsMap = defaultNavItems.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {});

    // Create sorted list based on stored menuItems order and names
    const sorted = menuItems.map(storedItem => {
        const defaultItem = defaultItemsMap[storedItem.id];
        if (!defaultItem) return null; // Skip if item no longer exists in defaults
        
        return {
            ...defaultItem,
            name: storedItem.name || defaultItem.name // Use stored name if available
        };
    }).filter(Boolean); // Remove nulls

    // Append any new default items that might be missing from storage (e.g. new features)
    const storedIds = new Set(menuItems.map(i => i.id));
    const missingItems = defaultNavItems.filter(i => !storedIds.has(i.id));
    
    return [...sorted, ...missingItems];
  }, [menuItems]);
  
  // Use displayNavItems for logic to ensure custom names are used in Tabs
  const navItems = displayNavItems; 

  // Initialize tabs from sessionStorage or current route
  useEffect(() => {
    const savedTabs = sessionStorage.getItem('monica_tabs');
    if (savedTabs) {
      try {
        setTabs(JSON.parse(savedTabs));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Update tabs on route change
  useEffect(() => {
    // Find name for current path
    const currentItem = navItems.find(item => item.path === location.pathname) || 
                        (location.pathname.startsWith('/people/') ? { name: '人物详情', path: location.pathname, icon: Users } : null) ||
                        (location.pathname.startsWith('/events/') ? { name: '事件详情', path: location.pathname, icon: Calendar } : null);

    if (currentItem) {
      setTabs(prevTabs => {
        // Avoid duplicates
        if (prevTabs.some(tab => tab.path === currentItem.path)) {
          return prevTabs;
        }
        // Limit to 8 tabs
        const newTabs = [...prevTabs, { name: currentItem.name, path: currentItem.path }].slice(-8);
        sessionStorage.setItem('monica_tabs', JSON.stringify(newTabs));
        return newTabs;
      });
    }
  }, [location.pathname]);

  const getTabInfo = (path) => {
    const item = navItems.find(i => i.path === path);
    if (item) return { icon: item.icon, color: item.color };
    if (path.startsWith('/people/')) return { icon: Users, color: 'text-green-500' };
    if (path.startsWith('/events/')) return { icon: Calendar, color: 'text-purple-500' };
    return { icon: LayoutDashboard, color: 'text-gray-400' };
  };

  const closeTab = (e, path) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newTabs = tabs.filter(tab => tab.path !== path);
    setTabs(newTabs);
    sessionStorage.setItem('monica_tabs', JSON.stringify(newTabs));

    // If closing active tab, navigate to the last remaining tab or home
    if (location.pathname === path) {
      if (newTabs.length > 0) {
        navigate(newTabs[newTabs.length - 1].path);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col transition-colors duration-200">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">⭐Start Monica</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {displayNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
        {/* Tabs Bar */}
        {tabs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 pt-2 flex items-center gap-2 overflow-x-auto scrollbar-hide shrink-0">
                {tabs.map(tab => {
                    const isActive = location.pathname === tab.path;
                    const { icon: TabIcon, color } = getTabInfo(tab.path);
                    return (
                        <div 
                            key={tab.path}
                            onClick={() => navigate(tab.path)}
                            className={cn(
                                "flex items-center px-4 py-2 text-sm font-medium rounded-t-md cursor-pointer border-t border-l border-r border-transparent min-w-max group select-none transition-all duration-200",
                                isActive 
                                    ? "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 border-b-white dark:border-b-gray-900 -mb-px relative z-10 shadow-sm" 
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                            )}
                        >
                            <TabIcon className={cn("h-4 w-4 mr-2", isActive ? color : "text-gray-400")} />
                            <span className={cn("mr-2", isActive ? "text-gray-900 dark:text-gray-100" : "")}>{tab.name}</span>
                            <button 
                                onClick={(e) => closeTab(e, tab.path)}
                                className="p-0.5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-700 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )
                })}
            </div>
        )}
        
        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
