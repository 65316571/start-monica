import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Save } from 'lucide-react';

const Settings = () => {
  const [showGraph, setShowGraph] = useState(true);
  const [colorByTag, setColorByTag] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('monica_theme') || 'light');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedShowGraph = localStorage.getItem('monica_show_graph');
    if (storedShowGraph !== null) {
      setShowGraph(storedShowGraph === 'true');
    }

    const storedColorByTag = localStorage.getItem('monica_color_by_tag');
    if (storedColorByTag !== null) {
      setColorByTag(storedColorByTag === 'true');
    }

    const storedTheme = localStorage.getItem('monica_theme');
    if (storedTheme) {
        setTheme(storedTheme);
        document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    }
  }, []);

  const handleToggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('monica_theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      saveFeedback();
  };

  const handleToggleGraph = () => {
    const newValue = !showGraph;
    setShowGraph(newValue);
    localStorage.setItem('monica_show_graph', newValue);
    saveFeedback();
  };

  const handleToggleColor = () => {
    const newValue = !colorByTag;
    setColorByTag(newValue);
    localStorage.setItem('monica_color_by_tag', newValue);
    saveFeedback();
  };

  const saveFeedback = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">设置中心</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          管理您的偏好设置和系统配置。
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg transition-colors duration-200">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">通用设置</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            个性化您的使用体验。
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between py-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">深色模式</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                切换界面为深色主题，适合夜间使用。
              </p>
            </div>
            <button
              onClick={handleToggleTheme}
              className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span className="sr-only">Use setting</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-4 border-t border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">人际关系网络</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                是否在仪表盘默认显示人际关系图谱。
              </p>
            </div>
            <button
              onClick={handleToggleGraph}
              className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                showGraph ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span className="sr-only">Use setting</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                  showGraph ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-4 border-t border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">彩色标签连线</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                是否使用不同颜色区分不同标签的关系连线。
              </p>
            </div>
            <button
              onClick={handleToggleColor}
              className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                colorByTag ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span className="sr-only">Use setting</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                  colorByTag ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
        
        {saved && (
          <div className="bg-green-50 dark:bg-green-900/20 px-6 py-3 border-t border-green-100 dark:border-green-800 flex items-center transition-colors duration-200">
            <Save className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
            <span className="text-sm text-green-700 dark:text-green-300">设置已保存</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
