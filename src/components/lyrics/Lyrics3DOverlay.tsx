import React from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { LRC_LYRICS } from '@/constants';
import { getScreenAnchoredPosition } from '@/scenes/simple/utils/positionUtils';

// 组件属性：
// - audioRef: 外部音频引用，用于驱动时间轴
// - distance: 距离相机的距离（米）
// - baseOffsetX/Y: 文本相对中心的偏移，方便在画面中上/下/左右布局

type Props = {
  audioRef: React.RefObject<HTMLAudioElement>;
  distance?: number; // 距相机距离
  baseOffsetX?: number;
  baseOffsetY?: number;
};

type Line = { time: number; text: string };

function parseLRCFirstN(lrc: string, n: number): Line[] {
  const lines = lrc.split(/\r?\n/);
  const out: Line[] = [];
  for (const line of lines) {
    const m = line.match(/^\[(\d{2}):([0-5]\d(?:\.\d{1,3})?)\]([\s\S]*)$/);
    if (!m) continue;
    const min = parseInt(m[1], 10) || 0;
    const sec = parseFloat(m[2]) || 0;
    const time = min * 60 + sec;
    const text = (m[3] || '').trim();
    if (!text) continue;
    out.push({ time, text });
    if (out.length >= n) break;
  }
  // 保证按时间排序
  return out.sort((a, b) => a.time - b.time);
}

// 解析整段 LRC（全部行，按时间排序）
function parseLRCAll(lrc: string): Line[] {
  const lines = (lrc || '').split(/\r?\n/);
  const outRaw: Line[] = [];
  for (const line of lines) {
    const m = line.match(/^\[(\d{2}):([0-5]\d(?:\.\d{1,3})?)\]([\s\S]*)$/);
    if (!m) continue;
    const min = parseInt(m[1], 10) || 0;
    const sec = parseFloat(m[2]) || 0;
    const time = min * 60 + sec;
    const text = (m[3] || '').trim();
    if (!text) continue;
    outRaw.push({ time, text });
  }
  // 排序
  const sorted = outRaw.sort((a, b) => a.time - b.time);
  // 去重/微偏移：相邻时间戳相等时，为后者加极小偏移，避免定位时命中两行
  const EPS = 0.01; // 10ms
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].time - sorted[i - 1].time) < 1e-6) {
      sorted[i].time = sorted[i - 1].time + EPS;
    }
  }
  return sorted;
}

export default function Lyrics3DOverlay({ audioRef, distance = 8, baseOffsetX = 1.6, baseOffsetY = 0.8 }: Props) {
  const { camera, scene } = useThree();
  // URL 可调参数：字体大小、偏移、深度系数
  const url = React.useMemo(() => new URLSearchParams(location.search), []);
  const uiFontSize = React.useMemo(() => parseFloat(url.get('lyricsfs') || '') || NaN, [url]); // 字号覆盖: ?lyricsfs=0.56
  const uiOffsetX = React.useMemo(() => parseFloat(url.get('lyricsdx') || '') || NaN, [url]);  // 左右距离: ?lyricsdx=1.85
  const uiOffsetY = React.useMemo(() => parseFloat(url.get('lyricsdy') || '') || NaN, [url]);  // 上下行距: ?lyricsdy=0.92
  const uiDzScale = React.useMemo(() => parseFloat(url.get('lyricsdz') || '') || NaN, [url]);  // 前后层次强度: ?lyricsdz=1.8
  const effectiveOffsetX = isNaN(uiOffsetX) ? baseOffsetX : uiOffsetX; // 左右距离默认=baseOffsetX，可被 URL 覆盖
  const effectiveOffsetY = isNaN(uiOffsetY) ? baseOffsetY : uiOffsetY; // 行距默认=baseOffsetY，可被 URL 覆盖
  const data = React.useMemo(() => {
    try {
      const parsed = parseLRCAll(LRC_LYRICS || '');
      if (parsed.length > 0) return parsed;
    } catch {}
    // 兜底：提供简短占位文案，确保可见
    return [
      { time: 0, text: '但愿人长久' },
      { time: 2, text: '千里共婵娟' },
      { time: 4, text: '明月几时有' },
      { time: 6, text: '把酒问青天' },
      { time: 8, text: '不知天上宫阙' },
      { time: 10, text: '今夕是何年' }
    ];
  }, []);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  // 调试：挂载时打印一次
  React.useEffect(() => {
    try {
      console.log('[Lyrics3DOverlay] mounted, lines=', data.length);
    } catch {}
  }, [data.length]);

  // 简单动画相位（用于上下轻微浮动和缩放）
  const animRef = React.useRef(0);

  const localAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  // 监听音频播放/暂停，只有播放时才推进歌词（严格绑定传入的 audioRef，不再兜底 querySelector）
  React.useEffect(() => {
    const el = audioRef.current ?? (document.querySelector('audio') as HTMLAudioElement | null);
    if (!(el instanceof HTMLAudioElement)) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsPlaying(false);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('ended', onPause);
    setIsPlaying(!el.paused);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('ended', onPause);
    };
  }, [audioRef]);
  useFrame((_, delta) => {
    try {
      // 兜底：若外部未传入 audioRef，尝试获取页面上的 <audio>
      const ref = audioRef.current ?? localAudioRef.current ?? (document.querySelector('audio') as HTMLAudioElement | null);
      // 未就绪或未播放则不推进
      if (!ref || ref.paused || (ref.readyState < 2) || ref.seeking) return;
      const t = !isNaN(ref.currentTime) ? ref.currentTime : 0;
      // 二分查找：找到最后一个 time <= t 的索引
      let lo = 0, hi = data.length - 1, idx = 0;
      const EPS = 0.02; // 20ms 容差
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (t + EPS >= data[mid].time) { idx = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
      if (idx !== currentIndex) setCurrentIndex(idx);

      // 关闭呼吸动画：不再累积相位
      // animRef.current += delta;
    } catch {}
  });

  // 将歌词组放置在相机前方 distance，并参与遮挡关系（深度写入）
  const groupRef = React.useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    // 使用与月球一致的“屏幕锚定”方法，保证在客户端放大特写时也能稳定显示
    // 将歌词放在屏幕正中偏上位置，并且基于月球实际大小决定前/后偏移量
    let anchorDistance = 15; // 作为兜底
    let moonDistance = 15;
    let moonApproxRadius = 0.8; // 兜底估计
    try {
      const moon = scene.getObjectByName('moonMesh') as THREE.Object3D | undefined;
      if (moon) {
        // 通过相机到月球实际距离估算一个更靠后的距离
        const moonPos = new THREE.Vector3();
        moon.getWorldPosition(moonPos);
        const dist = camera.position.distanceTo(moonPos);
        moonDistance = dist;
        anchorDistance = dist; // 基线放在月球距离
        // 估算月球世界半径（用于决定前后偏移）
        const mesh = moon as any;
        const geo = mesh.geometry as THREE.BufferGeometry | undefined;
        const scale = new THREE.Vector3();
        moon.getWorldScale(scale);
        if (geo && geo.boundingSphere) {
          moonApproxRadius = geo.boundingSphere.radius * Math.max(scale.x, scale.y, scale.z);
        }
      }
    } catch {}
    const target = getScreenAnchoredPosition(0.5, 0.57, anchorDistance, camera as THREE.PerspectiveCamera); // 整体Y锚点=0.62 (0~1，越大越靠下)
    groupRef.current.position.copy(target);
    groupRef.current.quaternion.copy(camera.quaternion); // billboard：面向相机

    // 轻微上下浮动与缩放（不影响可读性）
    // 保持固定缩放，避免呼吸效果
    groupRef.current.scale.setScalar(1.0);

    // 调试：低频打印位置（每 ~1.5s）
    if (Math.floor(animRef.current * (1/1.5)) !== Math.floor((animRef.current - (1/60)) * (1/1.5))) {
      try {
        const p = groupRef.current.position;
        console.log('[Lyrics3DOverlay] pos', { x:+p.x.toFixed(2), y:+p.y.toFixed(2), z:+p.z.toFixed(2), dist: +camera.position.distanceTo(p).toFixed(2) });
      } catch {}
    }
  });

  const hasPrev = currentIndex > 0;
  const prev = hasPrev ? data[currentIndex - 1] : undefined;
  const cur = data[currentIndex];
  // 边界处理：最后一行时不渲染“下一行”，避免与当前行重复
  const next = currentIndex + 1 < data.length ? data[currentIndex + 1] : undefined;

  const forceFront = false; // 不再使用URL置前

  // 固有属性：
  // - 左右: 按绝对索引交替（偶=左，奇=右）
  // - 前后: 循环 [前, 后, 后]（索引 % 3 => 0=前, 1=后, 2=后）
  // 四象限独立X偏移（单位：米）——可分别调“前左/前右/后左/后右”的水平位置
  const FRONT_LEFT_X  = 3;  // 前+左 的左右距离 ← 改这里
  const FRONT_RIGHT_X = 3;  // 前+右 的左右距离 ← 改这里
  const BACK_LEFT_X   = 2.5;  // 后+左 的左右距离 ← 改这里
  const BACK_RIGHT_X  = 2.5;  // 后+右 的左右距离 ← 改这里
  const sideX = (idx: number) => { // 根据“前/后 + 左/右”返回X位置
    const isLeft = (idx % 2 === 0);              // 偶=左，奇=右（与行号一致）
    const isFront = (((idx % 3) + 3) % 3) === 0; // 0=前，1/2=后
    const dist = isFront
      ? (isLeft ? FRONT_LEFT_X : FRONT_RIGHT_X)
      : (isLeft ? BACK_LEFT_X  : BACK_RIGHT_X);
    return (isLeft ? -1 : 1) * dist;
  };
  // 判定“前/后”，返回缩放比例（近大远小）
  // 你可以直接调整 frontScale / backScale 两个数值
  const scaleFor = (idx: number) => { // 近大远小：改 frontScale/backScale
    const m = ((idx % 3) + 3) % 3; // 0=前, 1=后, 2=后
    const frontScale = 1.08;      // 前（近）放大 ← 调这里
    const backScale  = 0.88;      // 后（远）缩小 ← 调这里
    return m === 0 ? frontScale : backScale;
  };
  // 四象限独立对齐（left/right）——可分别调“前左/前右/后左/后右”的对齐方式
  const FRONT_LEFT_ANCHOR: 'left'|'right'  = 'left';  // 前+左 对齐 ← 改这里
  const FRONT_RIGHT_ANCHOR: 'left'|'right' = 'right'; // 前+右 对齐 ← 改这里
  const BACK_LEFT_ANCHOR: 'left'|'right'   = 'left';  // 后+左 对齐 ← 改这里
  const BACK_RIGHT_ANCHOR: 'left'|'right'  = 'right'; // 后+右 对齐 ← 改这里
  const anchorFor = (idx: number): 'left' | 'right' => { // 左右对齐策略（四象限独立控制）
    const isLeft = (idx % 2 === 0);
    const isFront = (((idx % 3) + 3) % 3) === 0;
    if (isFront) return isLeft ? FRONT_LEFT_ANCHOR : FRONT_RIGHT_ANCHOR;
    return isLeft ? BACK_LEFT_ANCHOR : BACK_RIGHT_ANCHOR;
  };
  // 前/后层次：基于绝对索引循环 前(-dz)、后(+dz)、后(+dz)
  // 前/后层次：可分别设置“前/后”的深度系数
  const FRONT_DZ_SCALE = 1.1; // 前（近）深度系数：越大越靠近相机 ← 改这里
  const BACK_DZ_SCALE  = 1.1; // 后（远）深度系数：越大越远离相机 ← 改这里
  const zShift = (idx: number) => {
    const m = ((idx % 3) + 3) % 3;
    // dz 与月球实际可见半径相关，保证足够“在前/在后”
  const baseR = (typeof (window as any).__MOON_RADIUS_WORLD === 'number' ? (window as any).__MOON_RADIUS_WORLD : 1.0);
  const scale = m === 0 ? FRONT_DZ_SCALE : BACK_DZ_SCALE; // 前用 FRONT_DZ_SCALE，后用 BACK_DZ_SCALE
  const dz = Math.max(0.6, baseR * scale + 0.2);
    return m === 0 ? -dz : +dz;
  };

  // 额外的前/后垂直补偿（近大远小造成的视觉补偿）
  const FRONT_EXTRA_Y = 0.09; // 前（近）额外上移量（米，正值=向上）← 改这里
  const BACK_EXTRA_Y  = -0.03; // 后（远）额外下移量（米，负值=向下）← 改这里
  const extraY = (idx: number) => (((idx % 3) + 3) % 3) === 0 ? FRONT_EXTRA_Y : BACK_EXTRA_Y;

  // 统一字号（当前行不放大），仅颜色强调当前行
  const fontSize = 0.5; // 基础字号 ← 改这里
  const tuneMaterial = (obj: any) => {
    try {
      const mat = obj?.material;
      if (mat) {
        mat.depthTest = true;
        mat.depthWrite = true;
        mat.transparent = false;
        mat.needsUpdate = true;
      }
    } catch {}
  };
  const colorFor = (idx: number) => (idx === currentIndex ? '#ffffff' : '#a8a8a8');

  return (
    <group ref={groupRef} renderOrder={forceFront ? 2000 : 200}>
      {currentIndex > 1 && data[currentIndex - 2] && (
        <Text
          position={[sideX(currentIndex - 2), effectiveOffsetY * 2 + extraY(currentIndex - 2), zShift(currentIndex - 2)]} // 上上行Y=+2*行距 + 补偿
          fontSize={fontSize * scaleFor(currentIndex - 2)}
          color={colorFor(currentIndex - 2)}
          anchorX={anchorFor(currentIndex - 2)}
          anchorY="middle"
          textAlign={anchorFor(currentIndex - 2)}
          maxWidth={8}
          onSync={tuneMaterial}
          outlineWidth={0.008}
          outlineColor="#000"
        >
          {data[currentIndex - 2].text}
        </Text>
      )}
      {hasPrev && prev && (
        <Text
          position={[sideX(currentIndex - 1), effectiveOffsetY + extraY(currentIndex - 1), zShift(currentIndex - 1)]} // 上一行Y偏移=+effectiveOffsetY + 前/后额外补偿
          fontSize={fontSize * scaleFor(currentIndex - 1)} // 上一行字号=基础字号*缩放
          color={colorFor(currentIndex - 1)}
          anchorX={anchorFor(currentIndex - 1)}
          anchorY="middle"
          textAlign={anchorFor(currentIndex - 1)}
          maxWidth={8}
          onSync={tuneMaterial}
          outlineWidth={0.008}
          outlineColor="#000"
        >
          {prev.text}
        </Text>
      )}
      {cur && (
        <Text
          position={[sideX(currentIndex), 0 + extraY(currentIndex), zShift(currentIndex)]} // 当前行Y=0 + 前/后额外补偿
          fontSize={fontSize * scaleFor(currentIndex)} // 当前行字号=基础字号*缩放
          color={colorFor(currentIndex)}
          outlineWidth={0.012}
          outlineColor="#000"
          anchorX={anchorFor(currentIndex)}
          anchorY="middle"
          textAlign={anchorFor(currentIndex)}
          maxWidth={8}
          onSync={tuneMaterial}
        >
          {cur.text}
        </Text>
      )}
      {next && (
        <Text
          position={[sideX(currentIndex + 1), -effectiveOffsetY + extraY(currentIndex + 1), zShift(currentIndex + 1)]} // 下一行Y偏移=-effectiveOffsetY + 前/后额外补偿
          fontSize={fontSize * scaleFor(currentIndex + 1)} // 下一行字号=基础字号*缩放
          color={colorFor(currentIndex + 1)}
          anchorX={anchorFor(currentIndex + 1)}
          anchorY="middle"
          textAlign={anchorFor(currentIndex + 1)}
          maxWidth={8}
          onSync={tuneMaterial}
          outlineWidth={0.008}
          outlineColor="#000"
        >
          {next.text}
        </Text>
      )}
      {data[currentIndex + 2] && (
        <Text
          position={[sideX(currentIndex + 2), -effectiveOffsetY * 2 + extraY(currentIndex + 2), zShift(currentIndex + 2)]} // 下下行Y=-2*行距 + 补偿
          fontSize={fontSize * scaleFor(currentIndex + 2)}
          color={colorFor(currentIndex + 2)}
          anchorX={anchorFor(currentIndex + 2)}
          anchorY="middle"
          textAlign={anchorFor(currentIndex + 2)}
          maxWidth={8}
          onSync={tuneMaterial}
          outlineWidth={0.008}
          outlineColor="#000"
        >
          {data[currentIndex + 2].text}
        </Text>
      )}
    </group>
  );
}


