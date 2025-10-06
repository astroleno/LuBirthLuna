import React from 'react';

interface LoadingOverlayProps {
  // 最长等待时长（兜底）。到点仍未就绪也会淡出，防止卡死。
  durationMs?: number;
  // 最小展示时长（防止太快闪一下）。
  minShowMs?: number;
  // 淡出时长
  fadeMs?: number;
  // 场景就绪事件名（由场景派发）。
  readyEventName?: string;
  // 预热帧数：收到就绪后先渲染几帧再淡出
  prewarmFrames?: number;
}

export default function LoadingOverlay(props: LoadingOverlayProps) {
  const {
    durationMs = 8000,
    minShowMs = 1200,
    fadeMs = 800,
    readyEventName = 'lubirth:assets-ready',
    prewarmFrames = 3
  } = props;

  const [visible, setVisible] = React.useState(true);
  const [fading, setFading] = React.useState(false);
  const mountedAtRef = React.useRef<number>(performance.now());
  const finishedRef = React.useRef<boolean>(false);

  // 触发淡出与卸载
  const startFadeOut = React.useCallback(() => {
    if (finishedRef.current) return;
    try {
      finishedRef.current = true;
      try {
        // 通知场景：Overlay 开始淡出（可用于解锁自转）
        window.dispatchEvent(new CustomEvent('lubirth:overlay-fade-start'));
      } catch {}
      setFading(true);
      const t = setTimeout(() => setVisible(false), fadeMs);
      return () => clearTimeout(t);
    } catch (e) {
      console.error('[LoadingOverlay] fade out failed:', e);
      setVisible(false);
    }
  }, [fadeMs]);

  // 监听“就绪事件”→ 等待最小展示时间 → 预热 N 帧 → 淡出
  React.useEffect(() => {
    try {
      let rafId: number | null = null;
      let prewarmCount = 0;

      const maybeFinish = () => {
        // 预热帧循环
        const pump = () => {
          prewarmCount++;
          if (prewarmCount >= prewarmFrames) {
            startFadeOut();
          } else {
            rafId = requestAnimationFrame(pump);
          }
        };
        rafId = requestAnimationFrame(pump);
      };

      const onReady = () => {
        // 等待最小展示时长
        const elapsed = performance.now() - mountedAtRef.current;
        const wait = Math.max(0, minShowMs - elapsed);
        setTimeout(maybeFinish, wait);
      };

      window.addEventListener(readyEventName, onReady as EventListener, { once: true });

      // 如果事件在组件挂载前已触发，则立即按已就绪处理
      try {
        const already = (window as any).__lubirthAssetsReady;
        if (already) onReady();
      } catch {}

      // 兜底：最长等待到点自动淡出
      const maxTimer = setTimeout(() => {
        console.warn('[LoadingOverlay] max wait reached, fading out without ready event');
        startFadeOut();
      }, durationMs);

      return () => {
        try {
          window.removeEventListener(readyEventName, onReady as EventListener);
          if (rafId) cancelAnimationFrame(rafId);
          clearTimeout(maxTimer);
        } catch {}
      };
    } catch (e) {
      console.error('[LoadingOverlay] setup ready listener failed:', e);
    }
  }, [durationMs, minShowMs, prewarmFrames, readyEventName, startFadeOut]);

  if (!visible) return null;

  const renderWord = (text: string) => {
    return (
      <span className="lubirth-loading-word" aria-label={text}>
        {Array.from(text).map((ch, idx) => (
          <span
            className="lubirth-loading-char"
            data-index={idx}
            key={`${text}-${idx}`}
          >
            {ch}
          </span>
        ))}
      </span>
    );
  };

  return (
    <div
      className={`lubirth-loading-overlay${fading ? ' fading' : ''}`}
      role="status"
      aria-live="polite"
      style={{ ['--fadeMs' as any]: `${fadeMs}ms`, transitionDuration: `${fadeMs}ms` }}
    >
      <div className="lubirth-loading-container">
        <div className="lubirth-loading-line line-1">{renderWord('LuBirth')}</div>
        <div className="lubirth-loading-line line-2">{renderWord('Moon Earth You')}</div>
      </div>
    </div>
  );
}


