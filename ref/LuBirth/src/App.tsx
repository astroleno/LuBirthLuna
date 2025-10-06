import React from 'react';
import SimpleTest from './SimpleTest';
import LoadingOverlay from './components/LoadingOverlay';

export default function App() {
  React.useEffect(() => {
    try { 
      console.log('[App] mounted - using SimpleTest scene'); 
    } catch {}
  }, []);

  // 使用 SimpleTest 组件作为主场景
  return (
    <>
      {/* 载入 3s，淡出更柔和 */}
      <LoadingOverlay durationMs={4000} fadeMs={2000} />
      <SimpleTest />
    </>
  );
}
