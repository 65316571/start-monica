import { useState, useEffect } from 'react';

type ImageSize = 'min' | 'small' | 'medium' | 'large' | 'max';

export function useTheme() {
  const [imageSize, setImageSize] = useState<ImageSize>(() => {
    const saved = localStorage.getItem('monica_image_size');
    return (saved as ImageSize) || 'medium';
  });

  const updateImageSize = (size: ImageSize) => {
    setImageSize(size);
    localStorage.setItem('monica_image_size', size);
  };

  const [menuItems, setMenuItems] = useState<any[]>(() => {
    const saved = localStorage.getItem('monica_menu_items');
    return saved ? JSON.parse(saved) : [
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
  });

  const updateMenuItems = (items: any[]) => {
    setMenuItems(items);
    localStorage.setItem('monica_menu_items', JSON.stringify(items));
  };

  return {
    imageSize,
    updateImageSize,
    menuItems,
    updateMenuItems,
  };
}
