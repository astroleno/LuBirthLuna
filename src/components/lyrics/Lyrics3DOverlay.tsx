import React from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { LRC_LYRICS } from '@/constants';

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
    const m = line.match(/^\[(\d{2}):(\d{2}\.\d{2})]([\s\S]*)$/);
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

export default function Lyrics3DOverlay({ audioRef, distance = 8, baseOffsetX = 1.6, baseOffsetY = 0.8 }: Props) {
  const { camera } = useThree();
  const data = React.useMemo(() => parseLRCFirstN(LRC_LYRICS, 6), []);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  useFrame(() => {
    try {
      // 兜底：若外部未传入 audioRef，尝试获取页面上的 <audio>
      if (!audioRef.current) {
        const el = document.querySelector('audio') as HTMLAudioElement | null;
        if (el) audioRef.current = el;
      }
      const t = (audioRef.current && !isNaN(audioRef.current.currentTime))
        ? audioRef.current.currentTime
        : 0;
      // 找到最后一个开始时间 <= t 的行
      let idx = 0;
      for (let i = 0; i < data.length; i++) {
        if (t + 0.0001 >= data[i].time) idx = i; else break;
      }
      if (idx !== currentIndex) setCurrentIndex(idx);
    } catch {}
  });

  // 将歌词组放置在相机前方 distance
  const groupRef = React.useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); // 相机前方向
    const target = camera.position.clone().add(forward.multiplyScalar(distance));
    groupRef.current.position.copy(target);
    groupRef.current.quaternion.copy(camera.quaternion); // billboard：面向相机
  });

  const prev = data[Math.max(0, currentIndex - 1)];
  const cur = data[currentIndex];

  return (
    <group ref={groupRef} renderOrder={200}>
      {/* 上一行（淡出） */}
      {prev && (
        <Text
          position={[-baseOffsetX, baseOffsetY, 0.1]}
          fontSize={0.3}
          color="#999"
          anchorX="center"
          anchorY="middle"
        >
          {prev.text}
        </Text>
      )}
      {/* 当前行（高亮，左右交替） */}
      {cur && (
        <Text
          position={[(currentIndex % 2 === 0 ? -1 : 1) * baseOffsetX, 0, currentIndex % 2 === 0 ? -0.05 : 0.05]}
          fontSize={0.42}
          color="#ffffff"
          outlineWidth={0.008}
          outlineColor="#000"
          anchorX="center"
          anchorY="middle"
        >
          {cur.text}
        </Text>
      )}
    </group>
  );
}


