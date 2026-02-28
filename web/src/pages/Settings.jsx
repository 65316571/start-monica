import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Save } from 'lucide-react';

const Settings = () => {
  const [showGraph, setShowGraph] = useState(true);
  const [colorByTag, setColorByTag] = useState(true);
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
  }, []);

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">设置中心</h1>
          <p className="mt-1 text-sm text-gray-500">管理系统偏好与功能开关。</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">显示设置</h2>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between py-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">人际关系网络</h3>
              <p className="text-sm text-gray-500 mt-1">
                是否在仪表盘默认显示人际关系图谱。
              </p>
            </div>
            <button
              onClick={handleToggleGraph}
              className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                showGraph ? 'bg-blue-600' : 'bg-gray-200'
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

          <div className="flex items-center justify-between py-4 border-t border-gray-100">
            <div>
              <h3 className="text-sm font-medium text-gray-900">彩色标签连线</h3>
              <p className="text-sm text-gray-500 mt-1">
                是否使用不同颜色区分不同标签的关系连线。
              </p>
            </div>
            <button
              onClick={handleToggleColor}
              className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                colorByTag ? 'bg-blue-600' : 'bg-gray-200'
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
          <div className="bg-green-50 px-6 py-3 border-t border-green-100 flex items-center">
            <Save className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm text-green-700">设置已保存</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
