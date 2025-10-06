import { computeEphemeris, toUTCFromLocal } from './ephemeris';

type TestResult = { name: string; ok: boolean; info?: any; issues?: string[] };

function near(v: number, target: number, tol: number) { return Math.abs(v - target) <= tol; }
function normAz(az: number) { let a = az % 360; if (a < 0) a += 360; return a; }

function altAzFromSunWorld(
  sunWorld: {x:number;y:number;z:number},
  latDeg: number,
  lonDeg: number
): { altDeg: number; azDeg: number } {
  // World(Y-up) -> ECEF(Z-up)
  const ecef = { x: sunWorld.x, y: sunWorld.z, z: sunWorld.y };
  const φ = latDeg * Math.PI/180;
  const λ = lonDeg * Math.PI/180;
  // ENU basis in ECEF
  const E = { x: -Math.sin(λ),            y:  Math.cos(λ),            z: 0 };
  const N = { x: -Math.sin(φ)*Math.cos(λ), y: -Math.sin(φ)*Math.sin(λ), z: Math.cos(φ) };
  const U = { x:  Math.cos(φ)*Math.cos(λ), y:  Math.cos(φ)*Math.sin(λ), z: Math.sin(φ) };
  // Projections
  const dot = (a:any,b:any)=>a.x*b.x + a.y*b.y + a.z*b.z;
  const e = dot(ecef, E), n = dot(ecef, N), u = dot(ecef, U);
  const alt = Math.asin(Math.max(-1, Math.min(1, u)));
  let az = Math.atan2(e, n); if (az < 0) az += 2*Math.PI;
  return { altDeg: alt*180/Math.PI, azDeg: az*180/Math.PI };
}

export function runAutoTests(): { passed: number; total: number; results: TestResult[] } {
  const results: TestResult[] = [];
  const push = (r: TestResult) => { results.push(r); console[(r.ok?'log':'error')](`[AutoTest] ${r.ok?'✅':'❌'} ${r.name}`, r.ok? r.info : r.issues); };

  // 1) 春分南北对称性（同一时刻、同一经度，仰角绝对值相近）
  try {
    const t = new Date('2024-03-21T12:00:00Z');
    const a = computeEphemeris(t, 30, 0).altDeg;
    const b = computeEphemeris(t, -30, 0).altDeg;
    const ok = near(Math.abs(a), Math.abs(b), 2.0);
    push({ name:'Equinox N/S symmetry (abs altitude)', ok, info: { altN:a.toFixed(1), altS:b.toFixed(1) }, issues: ok? undefined : ['Expected |altN| ≈ |altS| at equinox'] });
  } catch (e) {
    push({ name:'Equinox N/S symmetry (abs altitude)', ok:false, issues:[String(e)] });
  }

  // 2) 北极圈夏至极昼（UTC 每6小时，lat=66.6N, lon=0）
  try {
    const times = ['00:00','06:00','12:00','18:00'];
    const alts = times.map(h => computeEphemeris(new Date(`2024-06-21T${h}:00Z`), 66.6, 0).altDeg);
    const ok = alts.every(a => a > -0.5); // 允许折射误差
    push({ name:'Arctic circle midnight sun', ok, info:{ alts: alts.map(a=>a.toFixed(1)) }, issues: ok? undefined : ['Expected all alt >= 0 near solstice'] });
  } catch (e) {
    push({ name:'Arctic circle midnight sun', ok:false, issues:[String(e)] });
  }

  // 3) 直射点日内东西向运动（赤道，固定经度0，春分；跳过正午近天顶的方位角）
  try {
    const t1 = computeEphemeris(new Date('2024-03-21T06:00:00Z'), 0, 0); // ~东
    const t3 = computeEphemeris(new Date('2024-03-21T18:00:00Z'), 0, 0); // ~西
    const az1 = normAz(t1.azDeg), az3 = normAz(t3.azDeg);
    const ok = (az1 > 45 && az1 < 135) && (az3 > 225 && az3 < 315);
    push({ name:'Subsolar east-to-west motion (equinox, equator)', ok, info:{ az1:az1.toFixed(1), az3:az3.toFixed(1) }, issues: ok? undefined : ['Azimuths not in expected E/W sectors'] });
  } catch (e) {
    push({ name:'Subsolar east-to-west motion (equinox, equator)', ok:false, issues:[String(e)] });
  }

  // 4) 夜球“背光”验证：选择本地午夜（UTC与经度相位对齐）
  try {
    // 选择经度=90°E，在 12:00Z 对应当地午夜
    const night = computeEphemeris(new Date('2024-06-21T12:00:00Z'), -30, 90).altDeg;
    const ok = night < 0;
    push({ name:'Night hemisphere negative altitude', ok, info:{ alt:night.toFixed(1) }, issues: ok? undefined : ['Expected altitude < 0 at night'] });
  } catch (e) {
    push({ name:'Night hemisphere negative altitude', ok:false, issues:[String(e)] });
  }

  // 5) 赤道春分正午接近天顶（高度应>85°；方位角不作强校验）
  try {
    const alt = computeEphemeris(new Date('2024-03-21T12:00:00Z'), 0, 0).altDeg;
    const ok = alt > 85;
    push({ name:'Equinox noon near-zenith (equator)', ok, info:{ alt:alt.toFixed(1) }, issues: ok? undefined : ['Expected altitude > 85° at equator noon on equinox'] });
  } catch (e) {
    push({ name:'Equinox noon near-zenith (equator)', ok:false, issues:[String(e)] });
  }

  // 6) 向量→角度一致性（多点抽样；天顶附近仅校验高度角）
  try {
    const samples = [
      { t: '2024-03-21T06:00:00Z', lat: 0, lon: 0 },
      { t: '2024-03-21T18:00:00Z', lat: 0, lon: 0 },
      { t: '2024-06-21T12:00:00Z', lat: 31.2, lon: 121.5 },
      { t: '2024-12-21T12:00:00Z', lat: -31.2, lon: -70 },
    ];
    let allOk = true; const detail: any[] = [];
    for (const s of samples) {
      const eph = computeEphemeris(new Date(s.t), s.lat, s.lon);
      const v = altAzFromSunWorld(eph.sunWorld, s.lat, s.lon);
      const altDiff = Math.abs(eph.altDeg - v.altDeg);
      const azDiff = Math.min(
        Math.abs(normAz(eph.azDeg) - normAz(v.azDeg)),
        Math.abs(normAz(eph.azDeg) - normAz(v.azDeg + 360)),
        Math.abs(normAz(eph.azDeg) - normAz(v.azDeg - 360))
      );
      const nearZenith = eph.altDeg > 85;
      const ok = altDiff <= 1.0 && (nearZenith ? true : azDiff <= 2.0);
      if (!ok) allOk = false;
      detail.push({ t:s.t, lat:s.lat, lon:s.lon, alt_ephem: eph.altDeg.toFixed(2), alt_vec: v.altDeg.toFixed(2), altDiff: altDiff.toFixed(2), az_ephem: normAz(eph.azDeg).toFixed(2), az_vec: normAz(v.azDeg).toFixed(2), azDiff: azDiff.toFixed(2), nearZenith });
    }
    push({ name:'Vector->AltAz consistency', ok: allOk, info: detail, issues: allOk? undefined : ['Vector/angle mismatch beyond tolerance'] });
  } catch (e) {
    push({ name:'Vector->AltAz consistency', ok:false, issues:[String(e)] });
  }

  const passed = results.filter(r=>r.ok).length;
  console.log(`[AutoTest] Summary ${passed}/${results.length} passed`);
  return { passed, total: results.length, results };
}

// 便捷入口：允许以经度推时区的本地字符串输入
export function runAutoTestsLocal(localISO: string, lat: number, lon: number) {
  const utc = toUTCFromLocal(localISO, lon);
  const eph = computeEphemeris(utc, lat, lon);
  console.log('[AutoTest/local] sample', { localISO, lat, lon, utc: utc.toISOString(), alt: eph.altDeg.toFixed(1), az: normAz(eph.azDeg).toFixed(1), sun: eph.sunWorld });
}
