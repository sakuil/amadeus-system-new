import { useState, useEffect } from 'react';
import styles from './index.module.less';

interface LoginOverlayProps {
  onLogin: (username: string) => void;
  isModelReady: boolean;
}

const LoginOverlay = ({ onLogin, isModelReady }: LoginOverlayProps) => {
  const [username, setUsername] = useState(import.meta.env.VITE_APP_DEFAULT_USERNAME || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // 检查是否已登录
    const savedUsername = localStorage.getItem('amadeus_username');
    if (savedUsername && isModelReady) {
      onLogin(savedUsername);
    }
  }, [onLogin, isModelReady]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }

    if (password !== import.meta.env.VITE_APP_LOGIN_PASSWORD) {
      setError('密码错误');
      return;
    }

    // 保存用户名到本地存储
    localStorage.setItem('amadeus_username', username);
    onLogin(username);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.loginContainer}>
        <div className={styles.header}>
          <img src="/Amadeus.png" alt="Amadeus" className={styles.logo} />
        </div>
        
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
          
          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={!isModelReady}
          >
            {isModelReady ? '登录系统' : '系统初始化中...'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginOverlay; 