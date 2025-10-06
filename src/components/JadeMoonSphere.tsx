import * as THREE from 'three';
import React from 'react';
import { useThree, useFrame } from '@react-three/fiber';

export type JadeMoonSphereProps = {
  radius?: number;                 // 内层半径
  outerOffset?: number;            // 外层壳半径增量（相对）
  position?: [number, number, number];
  // 屏幕锚定（0-1），存在时优先生效
  screenX?: number;
  screenY?: number;
  distance?: number;               // 相机前方距离
  segments?: number;               // 球体分段
  rotationSpeed?: number;          // 自转角速度（弧度/秒）
  unlitInner?: boolean;            // 内层是否不受光照（仅自发光/贴图显示）

  // 内层材质
  innerColor?: string;
  innerRoughness?: number;
  innerMetalness?: number;
  emissive?: string;
  emissiveIntensity?: number;

  // 外层材质（半透明玉壳）
  outerColor?: string;
  outerRoughness?: number;
  outerTransmission?: number;
  outerIor?: number;
  outerThickness?: number;
  outerClearcoat?: number;
  outerClearcoatRoughness?: number;
};

// 以最小依赖实现的“双层球体（月球内层 + 半透明外壳）”
export default function JadeMoonSphere({
  radius = 0.68,
  outerOffset = 0.002,
  position = [0, 0, 0],
  screenX,
  screenY,
  distance = 14,
  segments = 256,
  rotationSpeed = 0,
  unlitInner = true,

  innerColor = '#ffffff',
  innerRoughness = 1.0,
  innerMetalness = 0.0,
  emissive = '#000000',
  emissiveIntensity = 0.0,

  outerColor = '#ffffff',
  outerRoughness = 0.35,
  outerTransmission = 1.0,
  outerIor = 1.5,
  outerThickness = 0.18,
  outerClearcoat = 0.0,
  outerClearcoatRoughness = 1.0,
}: JadeMoonSphereProps) {
  const { camera, viewport } = useThree();
  const groupRef = React.useRef<THREE.Group>(null);

  // 贴图加载（可用则使用，否则退化为纯色）
  const [moonColorMap, setMoonColorMap] = React.useState<THREE.Texture | null>(null);
  const [moonNormalMap, setMoonNormalMap] = React.useState<THREE.Texture | null>(null);

  React.useEffect(() => {
    try {
      const loader = new THREE.TextureLoader();
      loader.load('/textures/2k_moon.jpg', tex => { try { tex.colorSpace = THREE.SRGBColorSpace; setMoonColorMap(tex); } catch {} });
      loader.load('/textures/2k_moon_normal.jpg', tex => { try { setMoonNormalMap(tex); } catch {} });
    } catch (e) {
      console.error('[JadeMoonSphere] texture load failed:', e);
    }
  }, []);

  // 屏幕锚定：将物体放到相机前方 distance 的位置，并按照 screenX/Y 对齐
  useFrame(() => {
    try {
      if (!groupRef.current) return;
      // 自转（可选）
      if (rotationSpeed) {
        groupRef.current.rotation.y += rotationSpeed;
      }
      if (screenX == null || screenY == null) {
        groupRef.current.position.set(position[0], position[1], position[2]);
        return;
      }
      // 将 NDC → 世界：构造 NDC 点 (x,y,0.5) 沿相机前向放置到指定 distance
      const ndc = new THREE.Vector3((screenX - 0.5) * 2, (0.5 - screenY) * 2, 0.5);
      const world = ndc.unproject(camera);
      const dir = world.sub(camera.position).normalize();
      const target = camera.position.clone().add(dir.multiplyScalar(distance));
      groupRef.current.position.copy(target);
      groupRef.current.lookAt(camera.position);
    } catch {}
  });

  const outerRadius = radius * (1 + Math.max(0, outerOffset));

  return (
    <group ref={groupRef} renderOrder={1000}>
      {/* 内层：月球 */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[radius, segments, segments]} />
        {unlitInner ? (
          <meshBasicMaterial
            color={innerColor}
            map={moonColorMap ?? undefined}
            depthTest={false}
            depthWrite={false}
          />
        ) : (
          <meshStandardMaterial
            color={innerColor}
            roughness={innerRoughness}
            metalness={innerMetalness}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            map={moonColorMap ?? undefined}
            normalMap={moonNormalMap ?? undefined}
            depthTest={false}
            depthWrite={false}
          />
        )}
      </mesh>

      {/* 外层：半透明壳 */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[outerRadius, segments, segments]} />
        <meshPhysicalMaterial
          color={outerColor}
          roughness={outerRoughness}
          transmission={outerTransmission}
          ior={outerIor}
          thickness={outerThickness}
          clearcoat={outerClearcoat}
          clearcoatRoughness={outerClearcoatRoughness}
          transparent
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}


