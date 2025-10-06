# 太阳位置算法分析

## 当前算法总结

### 1. 赤纬角计算
```typescript
const dayOfYear = Math.floor((dateUtc.getTime() - new Date(dateUtc.getFullYear(), 0, 0).getTime()) / MS_PER_DAY);
const declination = 23.45 * Math.sin((360 * (dayOfYear - 81) / 365) * Math.PI / 180);
```

**预期结果:**
- 春分 (day 81): 0°
- 夏至 (day 172): +23.45°  
- 秋分 (day 263): 0°
- 冬至 (day 355): -23.45°

### 2. 时角计算
```typescript
const utcHours = dateUtc.getUTCHours() + dateUtc.getUTCMinutes() / 60 + dateUtc.getUTCSeconds() / 3600;
const localSolarTime = utcHours + lon / 15; // 经度影响本地时间
const hourAngle = 15 * (localSolarTime - 12); // 时角，12点为0，东为负西为正
```

### 3. 太阳高度角计算
```typescript
const sinElevation = Math.sin(latRad) * Math.sin(declRad) + 
                    Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourRad);
const sunElevation = Math.asin(Math.max(-1, Math.min(1, sinElevation))) * 180 / Math.PI;
```

### 4. 太阳方位角计算
```typescript
const cosAzimuth = (Math.sin(declRad) - Math.sin(latRad) * Math.sin(sunElevation * Math.PI / 180)) /
                   (Math.cos(latRad) * Math.cos(sunElevation * Math.PI / 180));
let sunAzimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * 180 / Math.PI;
if (hourAngle > 0) { // 下午
  sunAzimuth = 360 - sunAzimuth;
}
```

## 发现的异常现象

### 1. 极端仰角问题
从日志看到：
- **赤道春分正午**: 仰角 90° (太阳在天顶) - **异常！**
- **赤道春分午夜**: 仰角 -90° (太阳在天底) - **异常！**

**物理常识**: 赤道春分正午太阳仰角应该是90°，但午夜不应该是-90°，应该约为0°到-23.45°之间。

### 2. 南北半球昼夜不一致
问题描述：同一经度的南北半球在同一时刻出现了不合理的昼夜差异。

**物理常识**: 
- 同一时刻，地球上的太阳方向是固定的
- 不同地点看到的只是角度不同，不应该出现一个白天一个黑夜的极端情况（除非在极圈附近的特殊时期）

### 3. 北极圈夏至异常
从日志看到北极圈夏至：
- **00:00**: 仰角 -0.55° (午夜太阳在地平线下) - **异常！**

**物理常识**: 北极圈夏至期间应该有"午夜太阳"现象，太阳24小时都在地平线上方。

## 可能的错误源

### 1. 方位角计算错误
当前使用的方位角公式可能不正确：
```typescript
const cosAzimuth = (Math.sin(declRad) - Math.sin(latRad) * Math.sin(sunElevation * Math.PI / 180)) /
                   (Math.cos(latRad) * Math.cos(sunElevation * Math.PI / 180));
```

这个公式看起来不是标准的天文学方位角公式。

### 2. 时角处理错误
时角的象限处理可能有误：
```typescript
if (hourAngle > 0) { // 下午
  sunAzimuth = 360 - sunAzimuth;
}
```

### 3. 坐标系混乱
可能在地平坐标系、赤道坐标系、黄道坐标系之间的转换有错误。

## 标准算法对比

### 标准太阳方位角公式应该是：
```
azimuth = atan2(sin(hourAngle), cos(hourAngle) * sin(lat) - tan(declination) * cos(lat))
```

### 而不是当前使用的反余弦公式。

## 建议的修正方向

1. **使用标准的球面天文学公式**
2. **简化计算，避免复杂的象限处理**
3. **添加物理约束检查**：
   - 同一时刻全球太阳位置一致性检查
   - 极圈夏至午夜太阳检查
   - 赤道春秋分日出日落检查

## 测试用例

应该验证的基本物理现象：
1. **赤道春分**: 06:00东方、12:00天顶、18:00西方、00:00北方地平线下
2. **北极夏至**: 太阳24小时绕天空转圈，始终在地平线上方
3. **南北半球**: 同一经度不应该出现极端昼夜差异
4. **季节变化**: 夏季太阳高，冬季太阳低

## 标准算法设计

### 正确的太阳位置计算步骤

基于精确的球面天文学，标准算法应该包含以下步骤：

#### 1. 儒略日计算
```typescript
function dateToJulianDay(date: Date): number {
  const a = Math.floor((14 - (date.getUTCMonth() + 1)) / 12);
  const y = date.getUTCFullYear() + 4800 - a;
  const m = (date.getUTCMonth() + 1) + 12 * a - 3;
  
  return date.getUTCDate() + Math.floor((153 * m + 2) / 5) + 365 * y + 
         Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045 +
         (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;
}
```

#### 2. 太阳黄经计算（考虑轨道偏心率）
```typescript
const JD = dateToJulianDay(dateUtc);
const T = (JD - 2451545.0) / 36525.0;

// 太阳平黄经
const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;

// 太阳平近点角
const M = (357.52911 + T * (35999.05029 - T * 0.0001537)) % 360;
const MRad = M * Math.PI / 180;

// 中心方程（轨道偏心率修正）
const C = (1.914602 - T * (0.004817 + T * 0.000014)) * Math.sin(MRad) +
          (0.019993 - T * 0.000101) * Math.sin(2 * MRad) +
          0.000289 * Math.sin(3 * MRad);

// 太阳真黄经
const L = (L0 + C) % 360;
```

#### 3. 黄道坐标转赤道坐标
```typescript
const LRad = L * Math.PI / 180;
const epsilon = 23.439291 - T * 0.0130042; // 黄赤交角
const epsilonRad = epsilon * Math.PI / 180;

// 太阳赤经
const alpha = Math.atan2(Math.cos(epsilonRad) * Math.sin(LRad), Math.cos(LRad));

// 太阳赤纬
const delta = Math.asin(Math.sin(epsilonRad) * Math.sin(LRad));
```

#### 4. 恒星时和时角
```typescript
// 格林威治平恒星时
const theta0 = (280.46061837 + 360.98564736629 * (JD - 2451545.0)) % 360;

// 当地恒星时
const theta = (theta0 + lon) % 360;

// 时角
const H = (theta * Math.PI / 180) - alpha;
```

#### 5. 地平坐标计算
```typescript
const latRad = lat * Math.PI / 180;

// 高度角（使用标准球面三角公式）
const sinAlt = Math.sin(latRad) * Math.sin(delta) + 
               Math.cos(latRad) * Math.cos(delta) * Math.cos(H);
const altitude = Math.asin(sinAlt);

// 方位角（使用atan2避免象限问题）
const azimuth = Math.atan2(
  Math.sin(H),
  Math.cos(H) * Math.sin(latRad) - Math.tan(delta) * Math.cos(latRad)
);

// 转换为0-360度范围
const azimuthDeg = ((azimuth * 180 / Math.PI) + 180) % 360;
const altitudeDeg = altitude * 180 / Math.PI;
```

### 关键改进

1. **消除循环依赖**：高度角和方位角分别从时角计算，无相互依赖
2. **精确天文参数**：使用儒略日、轨道偏心率修正、精确黄赤交角
3. **正确象限处理**：atan2函数自动处理所有象限
4. **统一坐标系**：明确的黄道→赤道→地平坐标转换链

### 物理一致性保证

这个算法能确保：
- **全球一致性**：同一时刻太阳位置对所有观测者物理一致
- **消除极端值**：不会出现-90°仰角等非物理结果
- **正确季节变化**：基于真实地球轨道和自转参数

## 当前算法状态（最新更新）

### 已修复的问题
1. **赤纬角公式**：修正为标准公式 `δ = 23.45° × sin(360° × (day-80)/365)`
2. **方位角循环依赖**：使用 `atan2(sin(H), cos(H)×sin(φ) - tan(δ)×cos(φ))` 直接计算
3. **时角计算**：简化为 `H = 15° × (solarTime - 12)`，包含均时差修正

### 当前测试结果
从最新日志（第225行）可以看到：
- **春分正午赤道**：仰角 88.15°（理论值应为90°）
- **春分午夜赤道**：仰角 -88.15°（理论值应为0°左右）

### 核心问题分析

**问题不在于算法公式，而在于坐标系概念错误**

当前算法使用的是**静态地平坐标系**，但实际应该考虑：

#### 1. 地球自转效应缺失
- 算法把地球当作静止球体
- 只计算太阳在"观测者头顶天空"的位置
- 忽略了观测者随地球自转的运动

#### 2. 坐标系转换问题
当前坐标系：
```
X轴：东西方向 (东为正)
Y轴：垂直方向 (上为正)  
Z轴：南北方向 (北为正)
```
这是**观测者本地坐标系**，但没有正确关联到**地球在空间中的真实姿态**。

#### 3. 缺少的物理模拟
应该包含的要素：
- **地球球体模型**：观测者在球面上的真实位置
- **地球自转**：观测者随地球转动的方向变化
- **惯性坐标系**：太阳在空间中的固定方向
- **坐标转换**：从惯性系到观测者系的正确转换

### 根本解决方案

需要从**天文算法**转向**3D几何模拟**：

1. **建立地球球体模型**
   - 观测者位置：`(lat, lon)` → 球面3D坐标
   - 观测者朝向：随地球自转的方向矩阵

2. **太阳方向计算**
   - 太阳在惯性坐标系中的方向（考虑地球公转）
   - 转换到地球坐标系（考虑地球自转）
   - 最终转换到观测者本地坐标系

3. **物理一致性验证**
   - 同一时刻全球太阳方向应该一致
   - 不同观测者看到的只是相对角度不同
   - 地球自转应该产生正确的昼夜循环

### 当前状态总结

算法在数学上基本正确，但在物理模拟上存在根本缺陷。需要重新设计坐标系统和地球几何模型，而不是继续修补天文公式。

## 结论

当前问题的根源是**没有正确模拟地球作为一个旋转球体**。算法把复杂的3D几何问题简化为2D天文计算，导致物理不一致。需要采用完整的3D地球模型和坐标转换链来重新实现。