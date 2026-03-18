import React, { createContext, useContext, useState, useEffect } from 'react';
import { hasWritePermission, hasReadPermission } from '../data/users';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 localStorage 恢复登录状态
    const storedUser = localStorage.getItem('monica_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem('monica_user');
      }
    }
    setLoading(false);
  }, []);

  // 登录
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('monica_user', JSON.stringify(userData));
  };

  // 登出
  const logout = () => {
    setUser(null);
    localStorage.removeItem('monica_user');
  };

  // 检查是否有写权限（增删改）
  const canWrite = () => {
    return user ? hasWritePermission(user.role) : false;
  };

  // 检查是否有读权限（查询）
  const canRead = () => {
    return user ? hasReadPermission(user.role) : false;
  };

  // 检查是否是 root 用户
  const isRoot = () => {
    return user?.role === 'root';
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    canWrite,
    canRead,
    isRoot,
    role: user?.role || null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定义 hook 使用权限上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
