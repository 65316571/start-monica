// 用户数据表 - 内存存储，无需数据库
// 权限: 'root' - 增删改查所有权限, 'user' - 仅查询权限

export const users = [
  {
    id: 1,
    username: 'hao',
    password: '65316571',
    role: 'root',
    displayName: 'hao'
  },
  {
    id: 3,
    username: 'user',
    password: 'user123',
    role: 'user',
    displayName: '普通用户'
  }
];

// 验证用户登录
export const authenticateUser = (username, password) => {
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (user) {
    // 返回用户信息（不包含密码）
    const { password, ...userInfo } = user;
    return userInfo;
  }
  return null;
};

// 检查是否有写权限（增删改）
export const hasWritePermission = (role) => {
  return role === 'root';
};

// 检查是否有读权限（所有用户都有）
export const hasReadPermission = (role) => {
  return true; // 所有用户都有查询权限
};
