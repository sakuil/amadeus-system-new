import { useState, useEffect } from 'react';
import styles from './index.module.less';

interface LoginOverlayProps {
  onLogin: (username: string) => void;
  isModelReady: boolean;
}

const LoginOverlay = ({ onLogin, isModelReady }: LoginOverlayProps) => {
  const [username, setUsername] = useState(import.meta.env.VITE_APP_DEFAULT_USERNAME || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 检测是否为移动端设备
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // 初始检测
    checkMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);
    
    // 清理事件监听
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // 检查是否已登录
    const savedUsername = localStorage.getItem('amadeus_username');
    if (savedUsername && isModelReady) {
      onLogin(savedUsername);
    }
  }, [onLogin, isModelReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!username) {
      setError('请输入用户名');
      setIsLoading(false);
      return;
    }

    // 保存用户名到本地存储
    localStorage.setItem('amadeus_username', username);
    setIsLoading(false);
    onLogin(username);
  };

  return (
    <div className={styles.overlay}>
      {/* 背景网格 */}
      <div className={styles.backgroundGrid}></div>

      {/* 数字雨效果 */}
      <div className={styles.digitalRain}></div>

      {/* 登录容器 */}
      <div className={styles.loginContainer}>
        {/* 顶部装饰线 */}
        <div className={styles.topLine}></div>

        {/* 角落装饰 */}
        <div className={`${styles.cornerDecoration} ${styles.topLeft}`}></div>
        <div className={`${styles.cornerDecoration} ${styles.topRight}`}></div>
        <div className={`${styles.cornerDecoration} ${styles.bottomLeft}`}></div>
        <div className={`${styles.cornerDecoration} ${styles.bottomRight}`}></div>

        {/* 标志 */}
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <div className={styles.logoBackground}>
              <span className={styles.logoText}>
                {isMobile ? "AMADEUS" : "AMADEUS"}
              </span>
              <div className={styles.scanLine}></div>
            </div>
          </div>
          <div>
            <p className={styles.systemVersion}>ALPHA</p>
            <p className={styles.secureTerminal}>
              {isMobile ? "LOGIN" : "LOGIN TERMINAL"}
            </p>
          </div>
        </div>
        
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          {/* 用户名输入框 */}
          <div className={styles.inputGroup}>
            <div className={styles.inputGlow}></div>
            <div className={styles.inputWrapper}>
              <span className={styles.inputLabel}>USER_ID:</span>
              <input
                type="text"
                placeholder={isMobile ? "用户名" : "输入用户名"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.input}
                autoComplete="username"
              />
              <div className={styles.statusIndicator}>
                <span className={styles.indicator}></span>
                <span className={`${styles.indicator} ${styles.pulse}`}></span>
              </div>
            </div>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className={styles.error}>
              <span className={styles.errorIndicator}></span>
              {error}
            </div>
          )}
          
          {/* 登录按钮 */}
          <div className={styles.buttonContainer}>
            <div className={styles.buttonGlow}></div>
            <button 
              type="submit" 
              disabled={!isModelReady || isLoading}
              className={styles.loginButton}
            >
              {isLoading ? (
                <span className={styles.loadingSpinner}></span>
              ) : (
                <span className={styles.buttonIndicator}></span>
              )}
              {isModelReady 
                ? (isLoading 
                  ? "验证中..." 
                  : (isMobile ? "登录" : "SYSTEM LOGIN")) 
                : (isMobile ? "初始化中..." : "SYSTEM INITIALIZING...")}
            </button>
          </div>

          {/* 底部装饰 */}
          <div className={styles.footer}>
            SECURE CONNECTION
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginOverlay; 