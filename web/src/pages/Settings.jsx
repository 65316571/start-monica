import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Save, GripVertical, Edit2, Check, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const Settings = () => {
  const [showGraph, setShowGraph] = useState(true);
  const [colorByTag, setColorByTag] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('monica_theme') || 'light');
  const [saved, setSaved] = useState(false);
  const { imageSize, updateImageSize, menuItems: storedMenuItems, updateMenuItems } = useTheme();

  // Modal State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  // Default menu items for reference and initial order
  const defaultMenuItems = [
    { id: 'dashboard', name: '仪表盘' },
    { id: 'timeline', name: '人生浏览' },
    { id: 'statistics', name: '数据统计' },
    { id: 'events', name: '事件记录' },
    { id: 'people', name: '人物管理' },
    { id: 'tags', name: '标签管理' },
    { id: 'images', name: '图片管理' },
    { id: 'data', name: '数据管理' },
    { id: 'settings', name: '设置中心' },
  ];

  const [menuItems, setMenuItems] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editName, setEditName] = useState('');

  // Initial load
  useEffect(() => {
    if (storedMenuItems && storedMenuItems.length > 0) {
       setMenuItems(storedMenuItems);
    } else {
      setMenuItems(defaultMenuItems);
    }
  }, [storedMenuItems]);

  // Reset local menu items when modal opens
  useEffect(() => {
    if (isMenuModalOpen) {
        if (storedMenuItems && storedMenuItems.length > 0) {
            setMenuItems(JSON.parse(JSON.stringify(storedMenuItems)));
        } else {
            setMenuItems(JSON.parse(JSON.stringify(defaultMenuItems)));
        }
    }
  }, [isMenuModalOpen]);

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

  const handleImageSizeChange = (e) => {
    updateImageSize(e.target.value);
    saveFeedback();
  };

  const handleOnDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(menuItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setMenuItems(items);
  };

  const handleSaveMenuOrder = () => {
    updateMenuItems(menuItems);
    setIsMenuModalOpen(false);
    saveFeedback();
    // Refresh page after a short delay to ensure storage is updated
    setTimeout(() => {
        window.location.reload();
    }, 500);
  };

  const handleCancelMenuOrder = () => {
    setIsMenuModalOpen(false);
    // Reset happens via useEffect when modal opens again
  };

  const startEdit = (item) => {
    setEditingItemId(item.id);
    setEditName(item.name);
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditName('');
  };

  const saveEdit = (id) => {
    if (!editName.trim()) return;
    
    const newItems = menuItems.map(item => 
      item.id === id ? { ...item, name: editName.trim() } : item
    );
    
    setMenuItems(newItems);
    setEditingItemId(null);
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

          <div className="flex items-center justify-between py-4 border-t border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">图片列表展示大小</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                设置图片管理页面中图片的展示尺寸。
              </p>
            </div>
            <select
              value={imageSize}
              onChange={handleImageSizeChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:w-auto"
            >
              <option value="min">MIN (最小)</option>
              <option value="small">小</option>
              <option value="medium">中 (默认)</option>
              <option value="large">大</option>
              <option value="max">MAX (最大)</option>
            </select>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6 border-t border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">菜单顺序</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              调整侧边栏菜单的显示顺序。
            </p>
          </div>
          <button
            onClick={() => setIsMenuModalOpen(true)}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            调整顺序
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            点击右侧按钮打开弹窗进行调整。
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 border border-gray-200 dark:border-gray-700">
             <div className="space-y-2">
                {menuItems.map((item) => (
                    <div key={item.id} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <span className="w-6 text-center text-gray-400">•</span>
                        {item.name}
                    </div>
                ))}
             </div>
          </div>
        </div>
        
        {saved && (
          <div className="bg-green-50 dark:bg-green-900/20 px-6 py-3 border-t border-green-100 dark:border-green-800 flex items-center transition-colors duration-200">
            <Save className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
            <span className="text-sm text-green-700 dark:text-green-300">设置已保存</span>
          </div>
        )}
      </div>
      {/* Menu Order Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">调整菜单顺序</h3>
              <button onClick={handleCancelMenuOrder} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <DragDropContext onDragEnd={handleOnDragEnd}>
                <Droppable droppableId="menu-items-modal">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {menuItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{ ...provided.draggableProps.style }}
                              className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 border rounded-md ${
                                snapshot.isDragging 
                                  ? 'border-blue-500 shadow-lg z-50' 
                                  : 'border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex items-center flex-1">
                                <GripVertical className="h-5 w-5 text-gray-400 mr-3 cursor-grab" />
                                {editingItemId === item.id ? (
                                  <div className="flex items-center gap-2 flex-1 mr-4">
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit(item.id);
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                    />
                                    <button onClick={() => saveEdit(item.id)} className="p-1 text-green-600 hover:text-green-700">
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button onClick={cancelEdit} className="p-1 text-gray-500 hover:text-gray-600">
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                                )}
                              </div>
                              
                              {editingItemId !== item.id && (
                                <button 
                                  onClick={() => startEdit(item)}
                                  className="p-1.5 text-gray-400 hover:text-blue-500 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  title="重命名"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
              <button
                onClick={handleCancelMenuOrder}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                放弃
              </button>
              <button
                onClick={handleSaveMenuOrder}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
