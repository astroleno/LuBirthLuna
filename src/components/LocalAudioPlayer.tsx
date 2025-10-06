import React, { useEffect, useMemo, useRef, useState } from 'react';

export type LocalAudioTrack = {
  title: string;
  file: string;
  artist?: string;
  cover?: string;
};

type LocalAudioPlayerProps = {
  basePath?: string;
  tracks: LocalAudioTrack[];
  autoPlay?: boolean;
  playOnFirstInteraction?: boolean;
};

const LocalAudioPlayer: React.FC<LocalAudioPlayerProps> = ({
  basePath = '',
  tracks,
  autoPlay = false,
  playOnFirstInteraction = true,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  const current = tracks[index];
  const src = useMemo(() => {
    const u = (current?.file || '').replace(/^\/+/, '');
    return basePath ? `${basePath.replace(/\/+$/, '')}/${u}` : u;
  }, [current?.file, basePath]);

  const firstInteraction = useRef<{ armed: boolean; cleanup?: () => void }>({
    armed: false,
  });

  useEffect(() => {
    if (!playOnFirstInteraction) return;
    firstInteraction.current.armed = true;

    const handler = (ev: Event) => {
      if (!firstInteraction.current.armed) return;
      const root = rootRef.current;
      if (root && ev.target instanceof Element && root.contains(ev.target)) {
        return;
      }
      firstInteraction.current.armed = false;
      const el = audioRef.current;
      if (el && el.paused) {
        el.play().catch(() => {});
      }
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('keydown', handler as any, true);
      window.removeEventListener('touchstart', handler as any, true);
      window.removeEventListener('click', handler as any, true);
    };

    window.addEventListener('keydown', handler as any, { once: true, capture: true });
    window.addEventListener('touchstart', handler as any, { once: true, capture: true });
    window.addEventListener('click', handler as any, { once: true, capture: true });

    firstInteraction.current.cleanup = cleanup;
    return cleanup;
  }, [playOnFirstInteraction]);

  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);
  const onEnd = () => {
    setIsPlaying(false);
    if (index < tracks.length - 1) setIndex((i) => i + 1); else setIndex(0);
  };
  const onLoadedMetadata = () => {
    const el = audioRef.current; if (!el) return; setDuration(Number.isFinite(el.duration) ? el.duration : 0);
  };
  const onTimeUpdate = () => {
    const el = audioRef.current; if (!el) return; setProgress(el.currentTime || 0);
  };

  useEffect(() => {
    const el = audioRef.current; if (!el) return;
    try { el.currentTime = 0; } catch {}
    if (autoPlay || isPlaying) { el.play().catch(() => {}); } else { el.pause(); }
  }, [src]);

  const togglePlay = (ev?: React.MouseEvent | React.KeyboardEvent) => {
    if (ev) {
      // @ts-ignore
      ev.stopPropagation?.();
      // @ts-ignore
      ev.nativeEvent?.stopImmediatePropagation?.();
    }
    const el = audioRef.current; if (!el) return;
    if (firstInteraction.current.armed && firstInteraction.current.cleanup) {
      firstInteraction.current.cleanup();
      firstInteraction.current.armed = false;
    }
    if (el.paused) { el.play().catch(() => {}); } else { el.pause(); }
  };

  const handleSeek = (value: number) => {
    const el = audioRef.current; if (!el) return;
    try { el.currentTime = value; } catch {}
  };

  return (
    <div ref={rootRef} style={{ width: '100%', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <audio
        ref={audioRef}
        src={src}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnd}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        preload="metadata"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 400, justifyContent: 'center', height: 52 }}>
        <button
          aria-label={isPlaying ? '暂停' : '播放'}
          onClick={(e)=>togglePlay(e)}
          style={{
            background: 'transparent',
            color: '#fff',
            border: 'none',
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <g fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </g>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <g>
                <path d="M8 5v14l11-7z" fill="currentColor"/>
                <path d="M8 5v14l11-7z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" opacity="0.7"/>
              </g>
            </svg>
          )}
        </button>

        <input
          type="range"
          min={0}
          max={Math.floor(duration || 0)}
          step={1}
          value={Math.min(Math.floor(progress), Math.floor(duration || 0))}
          onChange={(e) => handleSeek(Number(e.target.value))}
          style={{ flex: '0 1 340px', maxWidth: '100%', opacity: 0.15, margin: 0, alignSelf: 'center' }}
        />
      </div>
    </div>
  );
};

export default LocalAudioPlayer;
