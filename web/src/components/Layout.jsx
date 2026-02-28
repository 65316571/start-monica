import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Settings, Database, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { name: '仪表盘', path: '/', icon: LayoutDashboard },
    { name: '人物管理', path: '/people', icon: Users },
    { name: '事件记录', path: '/events', icon: Calendar },
    { name: '标签管理', path: '/tags', icon: Tag },
    { name: '数据管理', path: '/data', icon: Database },
    { name: '设置中心', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Start Monica</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
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
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
