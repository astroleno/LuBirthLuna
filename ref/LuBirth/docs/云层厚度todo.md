# 云层厚度实施计划

## 项目概述

基于 `云层厚度技术方案评估报告.md` 和 `云层厚度gpt.md` 的分析，本计划将采用**混合式LOD三段式方案**集成到LuBirth项目中，实现从远景到近景的完整云层体积感。

## 技术方案

### 核心设计理念（GPT混合式LOD方案）
- **远景/中远景**：POM（视差遮挡映射）包球体 - 成本最低的厚度感
- **中景**：壳层体渲染（Shell Texturing）包薄球壳 - 16-24层体积感
- **近景/特写**：屏幕空间短程体积光线行进（Ray March）局部补丁 - 真正的体积云
- **融合策略**：远景POM + 中景壳层可并存，近景体积仅在镜头对齐后启用

### 技术架构（GPT三段式LOD - 并存策略）
```typescript
// 1. 远景POM：视差遮挡映射（始终启用）
const pomSteps = 8 + 16 * (1 - Math.abs(dot(normal, viewDir)));
const heightScale = 0.5 * layerSpacing;

// 2. 中景壳层：16-24层薄球壳（与POM并存）
const numLayers = cameraDistance < 8 ? 16 : 24;
const layerSpacing = 0.004 * earthRadius / numLayers; // ~25km总厚度
// 每层：radius + i * layerSpacing, transparent=true, depthWrite=false

// 3. 近景体积：屏幕空间光线行进（镜头对齐后启用）
const rayMarchSteps = 8 + 16; // 主步 + 阴影步
const volumeBounds = [earthRadius, earthRadius + 0.004 * earthRadius];
// 启用条件：相机距离 < 2H 且 镜头已对齐（cameraAligned = true）
const shouldUseVolume = cameraDistance < 2 * cloudThickness && cameraAligned;
```

## 实施计划

### 第一阶段：POM增强 + 壳层扩展（第1-2周）

#### 目标
- 实现POM（视差遮挡映射）远景优化
- 扩展壳层到16-24层
- 添加Triplanar采样支持
- 基础LOD系统

#### 任务清单
- [x] **1.1 POM实现（远景优化）**
  ```typescript
  // 在fragment shader中添加POM计算
  const pomSteps = 8 + 16 * (1 - Math.abs(dot(normal, viewDir)));
  const heightScale = 0.5 * layerSpacing;
  
  // 视差步进计算
  for (int i = 0; i < pomSteps; i++) {
    float height = texture2D(displacementMap, uv).r * heightScale;
    if (height >= currentDepth) {
      // 找到遮挡点，计算视差偏移
      vec2 parallaxOffset = viewDir.xy * height / viewDir.z;
      uv += parallaxOffset;
      break;
    }
    currentDepth -= stepSize;
  }
  ```

- [x] **1.2 壳层扩展（中景优化）**
  ```typescript
  export function CloudsWithLayers({ 
    radius,
    texture,
    position,
    numLayers = 16,       // 扩展到16层
    layerSpacing = 0.00025, // 25km总厚度 / 16层
    // ... 现有参数
  }: CloudsWithLayersProps) {
    const isCloseView = cameraDistance < 8;
    const actualLayers = isCloseView ? 16 : 24; // 近距离16层，远距离24层
    
    return (
      <>
        {Array.from({ length: actualLayers }).map((_, i) => (
          <Clouds 
            key={i}
            radius={radius + i * layerSpacing}
            texture={texture}
            position={position}
            // 使用Triplanar采样
            useTriplanar={true}
            // 优化参数
            strength={strength * (0.9 - i * 0.02)}
            displacementScale={displacementScale * (1 + i * 0.05)}
          />
        ))}
      </>
    );
  }
  ```

- [x] **1.3 Triplanar采样支持**
  ```typescript
  // 在fragment shader中添加Triplanar采样
  vec3 triplanarUV = worldPos * 0.1; // 缩放因子
  vec3 blend = abs(normal);
  blend = normalize(max(blend, 0.00001));
  float b = blend.x + blend.y + blend.z;
  blend /= vec3(b, b, b);
  
  vec4 texX = texture2D(map, triplanarUV.yz);
  vec4 texY = texture2D(map, triplanarUV.xz);
  vec4 texZ = texture2D(map, triplanarUV.xy);
  
  vec4 finalColor = texX * blend.x + texY * blend.y + texZ * blend.z;
  ```

- [x] **1.4 两套并存LOD系统（基于地球占屏比例）**
  ```typescript
  const getLODConfig = (earthSize: number, viewAngle: number, isAlignedAndZoomed: boolean) => {
    // 中远景方案：始终启用（提供基础视差+厚度感）
    const midFarConfig = {
      usePOM: true,
      pomSteps: Math.min(24, 8 + 16 * (1 - Math.abs(viewAngle))),
      numLayers: Math.min(8, Math.floor(earthSize * 8)), // 1-8层
      useVolume: false,
      renderMode: 'pom-shell'
    };
    
    // 近景特写方案：仅在earthSize >= 1.0时启用（叠加到中远景上）
    const nearCloseConfig = earthSize >= 1.0 ? {
      usePOM: false, // 不重复POM
      pomSteps: 0,
      numLayers: Math.min(24, 8 + Math.floor((earthSize - 1.0) * 16)), // 8-24层
      useVolume: earthSize > 1.5 && isAlignedAndZoomed,
      renderMode: 'shell-volume'
    } : null;
    
    return { 
      midFar: midFarConfig,
      nearClose: nearCloseConfig,
      // 并存策略：中远景始终存在，近景特写叠加
      renderMode: 'layered' // 'mid-far', 'near-close', 'layered'
    };
  };
  ```

#### 验收标准
- [x] POM远景效果明显提升（视差和厚度感）
- [x] 16-24层壳层正常工作
- [x] Triplanar采样解决两极拉伸问题
- [x] LOD系统根据距离自动切换
- [x] 帧率保持在45+ FPS

### 第二阶段：体积光线行进（第3周）

#### 目标
- 实现屏幕空间体积光线行进
- 局部体积补丁渲染
- 云影系统集成

#### 任务清单
- [ ] **2.1 体积光线行进实现**
  ```typescript
  // 屏幕空间体积渲染
  export function VolumeCloudRenderer({ 
    camera,
    earthRadius,
    cloudTexture,
    lightDirection,
    volumeBounds
  }: VolumeCloudRendererProps) {
    const volumeMaterial = useMemo(() => new THREE.ShaderMaterial({
      uniforms: {
        earthCenter: { value: new THREE.Vector3(0, 0, 0) },
        earthRadius: { value: earthRadius },
        cloudRadius: { value: earthRadius + 0.004 * earthRadius },
        cloudTexture: { value: cloudTexture },
        lightDirection: { value: lightDirection },
        cameraPosition: { value: camera.position },
        rayMarchSteps: { value: 12 },
        shadowSteps: { value: 6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 earthCenter;
        uniform float earthRadius;
        uniform float cloudRadius;
        uniform sampler2D cloudTexture;
        uniform vec3 lightDirection;
        uniform vec3 cameraPosition;
        uniform int rayMarchSteps;
        uniform int shadowSteps;
        varying vec3 vWorldPosition;
        
        // 体积光线行进核心函数
        vec4 rayMarchVolume(vec3 rayStart, vec3 rayDir, float maxDistance) {
          vec3 currentPos = rayStart;
          float stepSize = maxDistance / float(rayMarchSteps);
          vec4 accumulatedColor = vec4(0.0);
          
          for (int i = 0; i < 24; i++) {
            if (i >= rayMarchSteps) break;
            
            float distanceToCenter = length(currentPos - earthCenter);
            if (distanceToCenter < earthRadius || distanceToCenter > cloudRadius) {
              currentPos += rayDir * stepSize;
              continue;
            }
            
            // 采样云密度
            vec3 localPos = currentPos - earthCenter;
            vec2 uv = vec2(atan(localPos.z, localPos.x) / (2.0 * 3.14159) + 0.5,
                          asin(localPos.y / length(localPos)) / 3.14159 + 0.5);
            float density = texture2D(cloudTexture, uv).r;
            
            if (density > 0.01) {
              // 计算光照
              float lightIntensity = calculateLighting(currentPos, lightDirection);
              vec3 cloudColor = vec3(0.8, 0.9, 1.0) * lightIntensity;
              
              // 累积颜色
              float alpha = density * stepSize;
              accumulatedColor.rgb += cloudColor * alpha * (1.0 - accumulatedColor.a);
              accumulatedColor.a += alpha * (1.0 - accumulatedColor.a);
              
              if (accumulatedColor.a > 0.99) break;
            }
            
            currentPos += rayDir * stepSize;
          }
          
          return accumulatedColor;
        }
        
        void main() {
          vec3 rayDir = normalize(vWorldPosition - cameraPosition);
          vec3 rayStart = cameraPosition;
          
          // 计算与地球的交点
          float t1, t2;
          if (!intersectSphere(rayStart, rayDir, earthCenter, cloudRadius, t1, t2)) {
            discard;
          }
          
          vec4 volumeColor = rayMarchVolume(rayStart, rayDir, t2 - t1);
          gl_FragColor = volumeColor;
        }
      `,
      transparent: true,
      depthWrite: false
    }), [camera, earthRadius, cloudTexture, lightDirection]);
    
    return (
      <mesh>
        <planeGeometry args={[2, 2]} />
        <primitive object={volumeMaterial} />
      </mesh>
    );
  }
  ```

- [ ] **2.2 利用现有UI对齐按钮控制体积渲染**
  ```typescript
  // 利用现有的"对齐放大"按钮状态控制体积渲染
  const [isAlignedAndZoomed, setIsAlignedAndZoomed] = useState(false);
  
  // 监听对齐放大按钮的点击
  const handleAlignZoom = () => {
    try {
      // 原有的对齐放大逻辑
      const seam = composition.seamOffsetDeg ?? 0;
      const L0 = lonDeg || 0;
      let L = L0; while (L > 180) L -= 360; while (L < -180) L += 360;
      const lightDir = new THREE.Vector3(-sunWorld.x, -sunWorld.y, -sunWorld.z).normalize();
      let lonDusk = THREE.MathUtils.radToDeg(Math.atan2(-lightDir.x, lightDir.z));
      while (lonDusk > 180) lonDusk -= 360; while (lonDusk < -180) lonDusk += 360;
      let yaw = (L + seam) - lonDusk; while (yaw > 180) yaw -= 360; while (yaw < -180) yaw += 360;

      const targetLat = composition.latitudeAlignTargetDeg ?? 28;
      const obsLat = latDeg;
      let pitch = -(targetLat - obsLat);
      if (pitch > 85) pitch = 85;
      if (pitch < -85) pitch = -85;

      setComposition(prev => ({
        ...prev,
        cameraAzimuthDeg: yaw,
        cameraElevationDeg: pitch,
        earthSize: 1.68,        // 地球占屏168%（很大）
        lookAtDistanceRatio: 1.08  // 相机看向地球上方
      }));
      
      // 设置对齐状态，启用体积渲染
      setIsAlignedAndZoomed(true);
      setRealTimeUpdate(false);
      setAutoUpdate(false);
      
      console.log('[AlignZoom] 对齐完成，启用体积渲染', { yaw, pitch, earthSize: 1.68 });
    } catch (e) {
      console.error('[AlignZoom] failed:', e);
    }
  };
  
  // 基于地球占屏比例判断是否启用体积渲染
  const shouldUseVolume = composition.earthSize > 1.5 && isAlignedAndZoomed;
  const volumeCoverage = clamp(200, 0.3 * cameraAltitude, 800); // km
  
  if (shouldUseVolume) {
    return (
      <VolumeCloudRenderer 
        camera={camera}
        earthRadius={earthRadius}
        cloudTexture={cloudTexture}
        lightDirection={lightDirection}
        volumeBounds={[earthRadius, earthRadius + cloudThickness]}
        coverageRadius={volumeCoverage}
        // 对齐后启用高质量渲染
        highQuality={true}
        rayMarchSteps={16}
        shadowSteps={8}
      />
    );
  }
  ```

- [ ] **2.3 云影系统**
  ```typescript
  // 云层对地表的阴影投射
  const calculateCloudShadow = (worldPos: THREE.Vector3, lightDir: THREE.Vector3) => {
    const shadowRay = lightDir.clone().negate();
    const shadowStart = worldPos.clone().add(shadowRay.clone().multiplyScalar(0.1));
    
    // 沿光线方向采样云密度
    let shadowFactor = 1.0;
    for (let i = 0; i < 8; i++) {
      const samplePos = shadowStart.clone().add(shadowRay.clone().multiplyScalar(i * 0.1));
      const density = sampleCloudDensity(samplePos);
      shadowFactor *= (1.0 - density * 0.1);
    }
    
    return shadowFactor;
  };
  ```

#### 验收标准
- [ ] 体积光线行进正常工作
- [ ] 局部体积补丁渲染正确
- [ ] 云影系统集成完成
- [ ] 近距离体积感显著提升
- [ ] 性能影响可控（< 5ms/frame）

### 第三阶段：性能优化与系统集成（第4周）

#### 目标
- 性能优化和LOD完善
- 系统集成和测试
- 参数调优和文档

#### 任务清单
- [ ] **3.1 性能优化**
  ```typescript
  // 几何体优化
  const optimizedGeometry = useMemo(() => {
    return new THREE.SphereGeometry(radius, 64, 32); // 64段而非128段
  }, [radius]);
  
  // 实例化渲染优化
  const instancedMesh = useMemo(() => {
    const geometry = new THREE.SphereGeometry(1, 64, 32);
    const material = new THREE.ShaderMaterial({...});
    return new THREE.InstancedMesh(geometry, material, numLayers);
  }, [numLayers]);
  
  // 自动降级机制
  const getPerformanceLevel = () => {
    const fps = perfMonitor.getStats().fps;
    if (fps < 30) return 'low';
    if (fps < 45) return 'medium';
    return 'high';
  };
  ```

- [ ] **3.2 完整LOD系统**
  ```typescript
  // 基于距离、视角、性能的LOD
  const getAdvancedLOD = (cameraDistance: number, viewAngle: number, performance: string) => {
    const baseConfig = {
      usePOM: cameraDistance > 15,
      numLayers: Math.min(24, Math.max(1, Math.floor(24 * (1 - cameraDistance / 30)))),
      useVolume: cameraDistance < 2 && performance !== 'low',
      pomSteps: Math.min(24, 8 + 16 * (1 - Math.abs(viewAngle))),
      rayMarchSteps: performance === 'high' ? 16 : 8
    };
    
    // 性能降级
    if (performance === 'low') {
      baseConfig.numLayers = Math.min(8, baseConfig.numLayers);
      baseConfig.pomSteps = Math.min(12, baseConfig.pomSteps);
      baseConfig.useVolume = false;
    }
    
    return baseConfig;
  };
  ```

- [ ] **3.3 两套并存系统集成（基于地球占屏比例）**
  ```typescript
  // 与现有系统集成 - 两套并存策略，基于地球占屏比例
  export function IntegratedCloudSystem({ 
    composition,
    earthInfo,
    lightDirection,
    lightColor,
    lightIntensity,
    camera,
    isAlignedAndZoomed // 从UI对齐按钮传入的状态
  }: IntegratedCloudSystemProps) {
    const lodConfig = getLODConfig(
      composition.earthSize, // 使用地球占屏比例
      viewAngle, 
      isAlignedAndZoomed // 使用UI对齐按钮状态
    );
    
    return (
      <>
        {/* 中远景方案：始终启用 */}
        {/* POM远景渲染 - 提供基础视差 */}
        <POMCloudRenderer 
          radius={earthInfo.size * 1.0006}
          texture={earthClouds}
          lightDir={lightDirection}
          pomSteps={lodConfig.midFar.pomSteps}
          blendMode="additive"
          opacity={0.4} // 中远景POM透明度
        />
        
        {/* 中远景壳层渲染 - 1-8层 */}
        <CloudsWithLayers 
          radius={earthInfo.size * 1.0006}
          texture={earthClouds}
          numLayers={lodConfig.midFar.numLayers}
          useTriplanar={true}
          lightDir={lightDirection}
          lightColor={lightColor}
          strength={composition.cloudStrength}
          blendMode="alpha"
          opacity={0.6} // 中远景壳层透明度
        />
        
        {/* 近景特写方案：仅在earthSize >= 1.0时启用 */}
        {lodConfig.nearClose && (
          <>
            {/* 近景壳层渲染 - 8-24层，叠加到中远景上 */}
            <CloudsWithLayers 
              radius={earthInfo.size * 1.0006}
              texture={earthClouds}
              numLayers={lodConfig.nearClose.numLayers}
              useTriplanar={true}
              lightDir={lightDirection}
              lightColor={lightColor}
              strength={composition.cloudStrength * 0.8} // 降低强度避免过度叠加
              blendMode="alpha"
              opacity={0.5} // 近景壳层透明度
            />
            
            {/* 体积渲染 - 仅在earthSize>1.5且对齐后启用 */}
            {lodConfig.nearClose.useVolume && (
              <VolumeCloudRenderer 
                camera={camera}
                earthRadius={earthInfo.size}
                cloudTexture={earthClouds}
                lightDirection={lightDirection}
                rayMarchSteps={16}
                highQuality={true}
                blendMode="multiply"
                opacity={0.3} // 体积渲染透明度
              />
            )}
          </>
        )}
      </>
    );
  }
  ```

- [ ] **3.4 参数调优和文档**
  - 添加UI控制面板
  - 实时参数调整
  - 性能监控面板
  - 技术文档更新

#### 验收标准
- [ ] 性能优化完成（60+ FPS稳定）
- [ ] 完整LOD系统工作正常
- [ ] 系统集成无冲突
- [ ] 参数调优界面完善
- [ ] 技术文档更新完成

## 技术细节

### 参数配置（GPT并存方案）
```typescript
// 添加到 SimpleComposition.ts
export interface SimpleComposition {
  // 云层厚度参数（GPT并存方案）
  cloudUsePOM?: boolean;           // 启用POM（默认true，始终启用）
  cloudPOMSteps?: number;          // POM步数（默认8-24）
  cloudPOMOpacity?: number;        // POM透明度（默认0.3）
  cloudNumLayers?: number;         // 壳层层数（默认16-24）
  cloudLayerSpacing?: number;      // 层间距（默认0.00025）
  cloudShellOpacity?: number;      // 壳层透明度（默认0.7）
  cloudUseVolume?: boolean;        // 启用体积渲染（默认true）
  cloudVolumeAlignedOnly?: boolean; // 仅UI对齐按钮后启用体积（默认true）
  cloudRayMarchSteps?: number;     // 光线行进步数（默认8-16）
  cloudUseTriplanar?: boolean;     // 启用Triplanar采样（默认true）
  cloudVolumeCoverage?: number;    // 体积覆盖半径（默认400-800km）
  cloudShadowSteps?: number;       // 阴影步数（默认4-8）
  // UI对齐按钮控制参数
  cloudVolumeOnAlignZoom?: boolean; // 对齐放大后启用体积渲染（默认true）
}
```

### 性能优化策略（GPT并存方案）
1. **POM优化**：根据视角动态调整步数，斜视更多步，与壳层并存
2. **壳层优化**：使用实例化渲染，64段几何体，与POM混合
3. **体积优化**：仅在近距离且镜头对齐后启用，局部覆盖
4. **并存LOD系统**：POM+壳层并存，体积按需启用
5. **Triplanar采样**：解决两极拉伸，提升质量
6. **UI对齐按钮控制**：利用现有"对齐放大"按钮控制体积渲染启用

### 风险控制（GPT并存方案）
1. **性能风险**：POM+壳层并存可能增加渲染负担，需要优化混合模式
2. **集成风险**：并存渲染需要精确的透明度控制和混合顺序
3. **视觉风险**：POM和壳层混合可能产生不自然效果，需要精细调优
4. **复杂度风险**：UI对齐按钮集成和并存渲染增加系统复杂度
5. **内存风险**：并存渲染可能增加GPU内存使用

## 验收标准

### 性能指标（GPT并存方案）
- [ ] 远景POM：帧率 ≥ 60fps，步数8-24自适应
- [ ] 中景壳层：帧率 ≥ 45fps，基于earthSize动态调整层数
- [ ] POM+壳层并存：帧率 ≥ 40fps，混合渲染正常
- [ ] 近景体积：帧率 ≥ 30fps，仅在earthSize>1.5且对齐后启用
- [ ] 内存使用增长 ≤ 30%（并存渲染增加）
- [ ] 加载时间增加 ≤ 20%

### 视觉效果（GPT并存方案）
- [ ] 远景：POM视差和厚度感明显
- [ ] 中景：POM+壳层混合效果自然
- [ ] 近景：体积光线行进真实感强
- [ ] 过渡：LOD切换平滑无跳跃
- [ ] 质量：Triplanar采样解决两极拉伸
- [ ] 对齐：UI对齐按钮控制准确，体积渲染适时启用

### 技术指标（GPT并存方案）
- [ ] 并存LOD系统完整工作
- [ ] POM、壳层、体积渲染无缝集成
- [ ] UI对齐按钮集成系统正常
- [ ] 参数可调节，性能可控制
- [ ] 与现有系统完全兼容

## 时间线（GPT并存方案）

| 阶段 | 时间 | 主要任务 | 里程碑 |
|------|------|----------|--------|
| 第1-2周 | POM+壳层并存 | POM实现、16-24层壳层、并存混合 | 远景中景并存完成 |
| 第3周 | 体积+UI对齐 | 体积光线行进、UI对齐按钮集成、云影 | 近景体积感完成 |
| 第4周 | 系统集成 | 性能优化、并存LOD完善、集成测试 | 生产就绪 |

## 风险评估（GPT并存方案）

### 高风险
- **性能风险**：POM+壳层并存可能增加渲染负担，需要精细优化
- **复杂度风险**：并存渲染+UI对齐按钮集成技术门槛高，开发周期长

### 中风险
- **集成风险**：并存渲染需要精确的透明度控制和混合顺序
- **视觉风险**：POM和壳层混合可能产生不自然效果

### 低风险
- **资源消耗**：使用现有贴图，无额外资源需求
- **回退方案**：可选择性启用各阶段功能，UI对齐按钮控制可关闭

## 成功指标（GPT并存方案）

### 功能完整性
- [ ] POM远景渲染正常工作
- [ ] 16-24层壳层中景渲染正常
- [ ] POM+壳层并存混合效果自然
- [ ] 体积光线行进近景渲染正常
- [ ] UI对齐按钮集成系统准确
- [ ] 并存LOD自动切换正常
- [ ] Triplanar采样解决两极问题

### 性能指标
- [ ] 远景POM：帧率 ≥ 60fps
- [ ] 中景壳层：帧率 ≥ 45fps
- [ ] POM+壳层并存：帧率 ≥ 40fps
- [ ] 近景体积：帧率 ≥ 30fps
- [ ] 内存使用增长 ≤ 30%
- [ ] 加载时间增加 ≤ 20%

### 代码质量
- [ ] TypeScript类型完整
- [ ] 组件化架构清晰
- [ ] 错误处理完善
- [ ] 注释文档完整

## 使用说明

### 第一阶段已完成功能

#### 1. 多层云层系统
- **组件**：`CloudsWithLayers` 替代原有的 `Clouds` 组件
- **层数**：默认3层，可通过 `cloudNumLayers` 参数调整
- **层间距**：默认0.002，可通过 `cloudLayerSpacing` 参数调整

#### 2. 参数配置
```typescript
// 在 SimpleComposition 中配置
cloudNumLayers: 3,            // 云层层数（1-5层）
cloudLayerSpacing: 0.002,     // 层间距（0.001-0.005）
```

#### 3. 性能监控
- **控制台命令**：
  - `cloudLayersDebug.getPerformance()` - 获取当前性能统计
  - `cloudLayersDebug.benchmark()` - 运行10秒性能基准测试
  - `cloudLayersDebug.testLayers(n)` - 测试指定层数

#### 4. 视觉效果
- **厚度感**：外层强度递增，增强云层厚度感
- **层次感**：外层置换强度更大，UV滚动速度更快
- **透明度**：通过强度递减实现自然的透明度过渡

### 测试方法

1. **启动项目**：`npm run dev`
2. **打开控制台**：F12 开发者工具
3. **运行性能测试**：`cloudLayersDebug.benchmark()`
4. **观察效果**：云层应该有明显的厚度感和层次感

### 性能指标

- **目标帧率**：≥45 FPS
- **内存使用**：增长 < 20%
- **加载时间**：增加 < 10%

## 结论

云层厚度融合方案在技术上是可行的，但需要谨慎实施。建议采用渐进式方法，先实现简化的多层系统，再逐步添加动态patch功能。关键是要在视觉效果和性能之间找到平衡点，确保不会影响项目的整体稳定性。

**推荐优先级**：中等
**实施难度**：中等
**预期效果**：显著提升云层真实感

### 第一阶段完成状态：✅ 已完成 + 🔧 两套并存系统
- [x] 3层云系统实现
- [x] 性能监控工具
- [x] 控制台调试命令
- [x] 参数调优
- [x] 与现有系统集成
- [x] **近距离观察优化**（解决拉近看效果问题）
  - 相机距离 < 8 时自动启用近距离优化
  - 层间距减少到 30%（0.00015）
  - 置换强度差异最小化（5% 而非 40%）
  - UV滚动保持同步，避免层间错位
  - 强度递减减少到 2%，避免过度叠加
- [x] **POM视差遮挡映射**（远景优化）
  - 实现POMCloudRenderer组件
  - 支持动态步数调整（8-24步）
  - 与壳层并存渲染
- [x] **Triplanar采样**（解决两极拉伸）
  - 在Clouds组件中添加Triplanar支持
  - 支持传统UV和Triplanar两种采样模式
  - 可配置缩放因子和混合权重
- [x] **两套并存LOD系统**
  - 中远景方案：POM + 1-8层壳层（始终启用）
  - 近景特写方案：8-24层壳层（earthSize >= 1.0时启用）
  - 基于earthSize的智能LOD切换
  - UI对齐按钮控制体积渲染启用
- [x] **集成系统**
  - IntegratedCloudSystem组件统一管理
  - 支持多种混合模式（additive/alpha/multiply）
  - 与现有SimpleTest系统完全集成
