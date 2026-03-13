import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Upload, Trash2, Maximize2, Download, Image as ImageIcon, Search, Plus, X, Tag, Edit2, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

export default function Images() {
  const [images, setImages] = useState([]);
  const [tags, setTags] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const { imageSize } = useTheme();
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Batch actions
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modals
  const [editingImage, setEditingImage] = useState(null); // { id, filename }
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#3B82F6' });

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    loadImages();
    loadTags();
  }, [search, selectedTag]);

  const loadImages = async () => {
    const params = {};
    if (search) params.search = search;
    if (selectedTag) params.tag = selectedTag;

    const { data, error } = await api.images.list(params);
    if (error) {
      console.error('Failed to load images:', error);
      setError('加载图片列表失败');
    } else {
      setImages(data || []);
    }
  };

  const loadTags = async () => {
    const { data } = await api.images.getTags();
    if (data) setTags(data);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const { data, error } = await api.images.upload(file);
      if (error) throw new Error(error.message || '上传失败');
      
      setImages([data, ...images]);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || '上传失败，请检查 OSS 配置');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这张图片吗？此操作将同时删除云端文件。')) return;

    const { error } = await api.images.delete(id);
    if (error) {
      alert('删除失败');
    } else {
      setImages(images.filter(img => img.id !== id));
      if (selectedImages.has(id)) {
        const newSelected = new Set(selectedImages);
        newSelected.delete(id);
        setSelectedImages(newSelected);
      }
    }
  };

  const handleRename = async (id, newName) => {
    if (!newName.trim()) return;
    
    const { data, error } = await api.images.rename(id, newName);
    if (error) {
      alert('重命名失败');
    } else {
      setImages(images.map(img => img.id === id ? { ...img, filename: newName } : img));
      setEditingImage(null);
    }
  };

  const handleCreateTag = async () => {
    // Navigate to Tags page
  };

  const handleAddTagToImage = async (imageId, tagId) => {
    const { error } = await api.images.addTag(imageId, tagId);
    if (!error) {
      loadImages(); // Reload to show new tag
    }
  };

  const handleRemoveTagFromImage = async (imageId, tagId) => {
    const { error } = await api.images.removeTag(imageId, tagId);
    if (!error) {
      loadImages(); // Reload to update UI
    }
  };

  // Batch Operations
  const toggleSelection = (id) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedImages(newSelected);
  };

  const toggleAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(img => img.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedImages.size} 张图片吗？`)) return;

    const ids = Array.from(selectedImages);
    const { error } = await api.images.batchDelete(ids);
    
    if (error) {
      alert('批量删除失败');
    } else {
      setImages(images.filter(img => !selectedImages.has(img.id)));
      setSelectedImages(new Set());
      setIsSelectionMode(false);
    }
  };

  const handleBatchTag = async (tagId) => {
    const ids = Array.from(selectedImages);
    const { error } = await api.images.batchAddTag(ids, tagId);
    
    if (error) {
      alert('批量添加标签失败');
    } else {
      loadImages();
      setSelectedImages(new Set());
      setIsSelectionMode(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Simple toast notification could be added here
  };

  // Lightbox handlers
  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxImage(images[index]);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxIndex(0);
  };

  const nextImage = () => {
    const newIndex = (lightboxIndex + 1) % images.length;
    setLightboxIndex(newIndex);
    setLightboxImage(images[newIndex]);
  };

  const prevImage = () => {
    const newIndex = (lightboxIndex - 1 + images.length) % images.length;
    setLightboxIndex(newIndex);
    setLightboxImage(images[newIndex]);
  };

  // Context menu handlers
  const handleContextMenu = (e, image) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 计算菜单位置，确保不超出屏幕
    const menuWidth = 208; // w-52 = 13rem = 208px
    const menuHeight = 250;
    
    let x = e.clientX;
    let y = e.clientY;
    
    // 如果靠近右边缘，菜单向左展开
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    
    // 如果靠近底边缘，菜单向上展开
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    setContextMenu({
      x: x,
      y: y,
      imageId: image.id,
      currentTags: image.tags || []
    });
    
    return false;
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section matching DataManagement style */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">图片管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            集中管理您的所有图片素材，支持上传、检索与分类整理。
          </p>
        </div>
      </div>

      {/* Toolbar Section: Search, Actions, Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
           {/* Search Bar - Centered relative to available space or just flex-1 */}
           <div className="relative flex-1 max-w-xl w-full md:mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索图片..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="relative">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleUpload}
                accept="image/*"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors shadow-sm ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">上传图片</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSelectedTag('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              !selectedTag 
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            全部
          </button>
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.name)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                selectedTag === tag.name
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }}></span>
              {tag.name}
            </button>
          ))}
          <Link
            to="/tags"
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-50 text-gray-600 border border-dashed border-gray-300 hover:bg-gray-100 hover:border-gray-400 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            新建标签
          </Link>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {(selectedImages.size > 0 || isSelectionMode) && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300"
            >
              {selectedImages.size === images.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              全选
            </button>
            <span className="text-sm text-blue-600 dark:text-blue-400">
              已选择 {selectedImages.size} 项
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                批量标签
              </button>
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block p-2 z-10">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleBatchTag(tag.id)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }}></span>
                    {tag.name}
                  </button>
                ))}
                {tags.length === 0 && <div className="text-xs text-gray-500 text-center py-2">无可用标签</div>}
              </div>
            </div>
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              批量删除
            </button>
            <button
              onClick={() => { setIsSelectionMode(false); setSelectedImages(new Set()); }}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {images.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">暂无图片，点击右上角上传</p>
        </div>
      ) : (
        <>
          {/* Right-click hint */}
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>提示：右键点击图片可快速添加/移除标签</span>
          </div>
          <div className={`grid gap-6 ${
          imageSize === 'min' ? 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8' :
          imageSize === 'small' ? 'grid-cols-3 md:grid-cols-5 lg:grid-cols-6' :
          imageSize === 'medium' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' :
          imageSize === 'large' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
          'grid-cols-1' // max
        }`}>
          {images.map((image) => (
            <div 
              key={image.id} 
              className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden group relative border-2 transition-all ${
                selectedImages.has(image.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'
              }`}
            >
              {/* Selection Checkbox */}
              {(isSelectionMode || selectedImages.has(image.id)) && (
                <div 
                  className="absolute top-2 left-2 z-10 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggleSelection(image.id); }}
                >
                  {selectedImages.has(image.id) ? (
                    <div className="w-5 h-5 bg-blue-500 rounded border border-blue-600 flex items-center justify-center text-white">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-white/80 rounded border border-gray-400 hover:border-blue-500"></div>
                  )}
                </div>
              )}

              <div 
                className="aspect-square relative bg-gray-100 dark:bg-gray-900"
                onContextMenu={(e) => handleContextMenu(e, image)}
              >
                <img
                  src={image.url}
                  alt={image.filename}
                  className="w-full h-full object-cover cursor-pointer"
                  loading="lazy"
                  onClick={() => {
                    if (isSelectionMode) toggleSelection(image.id);
                    else openLightbox(images.indexOf(image));
                  }}
                />
                {!isSelectionMode && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => openLightbox(images.indexOf(image))}
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white"
                      title="图片放大"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                    <a
                      href={image.url}
                      download={image.filename}
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white"
                      title="下载图片"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => { setIsSelectionMode(true); toggleSelection(image.id); }}
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white"
                      title="批量选择"
                    >
                      <CheckSquare className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white"
                      title="删除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-3">
                {editingImage?.id === image.id ? (
                  <input
                    type="text"
                    autoFocus
                    className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    defaultValue={image.filename}
                    onBlur={(e) => handleRename(image.id, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(image.id, e.currentTarget.value)}
                  />
                ) : (
                  <div 
                    className="flex items-center justify-between group/title cursor-text"
                    onDoubleClick={() => setEditingImage({ id: image.id, filename: image.filename })}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1" title={image.filename}>
                      {image.filename}
                    </p>
                    <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover/title:opacity-100" />
                  </div>
                )}
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(image.size / 1024).toFixed(1)} KB • {format(new Date(image.created_at), 'yyyy-MM-dd')}
                </p>

                {/* Tags List - Display only */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {image.tags?.map(tag => (
                    <span 
                      key={tag.id}
                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group/tag"
                    >
                      <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: tag.color }}></span>
                      {tag.name}
                      <button
                        onClick={() => handleRemoveTagFromImage(image.id, tag.id)}
                        className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover/tag:opacity-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Create Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80">
            <h3 className="text-lg font-bold mb-4 dark:text-white">新建标签</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">名称</label>
                <input
                  type="text"
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">颜色</label>
                <input
                  type="color"
                  value={newTag.color}
                  onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                  className="w-full h-10 p-1 rounded border dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowTagModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateTag}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
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
          {images.length > 1 && (
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
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white hover:text-gray-300 transition-colors z-50"
            >
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Image info & counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-center">
            <p className="text-sm font-medium mb-1">{lightboxImage.filename}</p>
            {images.length > 1 && (
              <p className="text-xs text-gray-400">
                {lightboxIndex + 1} / {images.length}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-[100]"
            onClick={closeContextMenu}
          />
          <div 
            className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 z-[101] p-2 w-52"
            style={{ 
              top: Math.min(contextMenu.y, window.innerHeight - 250), 
              left: Math.min(contextMenu.x, window.innerWidth - 220)
            }}
          >
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">管理标签</span>
              <button 
                onClick={closeContextMenu}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {tags.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">暂无标签，先去创建吧</p>
              ) : (
                tags.map(tag => {
                  const isSelected = contextMenu.currentTags?.some(t => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (isSelected) {
                          handleRemoveTagFromImage(contextMenu.imageId, tag.id);
                        } else {
                          handleAddTagToImage(contextMenu.imageId, tag.id);
                        }
                        closeContextMenu();
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
                        isSelected 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 text-left truncate font-medium">{tag.name}</span>
                      {isSelected && <CheckSquare className="w-4 h-4 text-blue-500" />}
                    </button>
                  );
                })
              )}
            </div>
            <Link
              to="/tags"
              onClick={closeContextMenu}
              className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-1.5 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              新建标签
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
