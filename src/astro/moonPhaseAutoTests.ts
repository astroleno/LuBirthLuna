import { AstroTime, Body, Illumination } from 'astronomy-engine';

type TestResult = { name: string; ok: boolean; info?: any; issues?: string[] };

function findExtremaInMonth(year: number, monthIndex0: number) {
  const samples: { date: string; frac: number; angleDeg: number }[] = [];
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(Date.UTC(year, monthIndex0, d, 12, 0, 0)); // 每天中午采样，减少昼夜影响
    const info = Illumination(Body.Moon, new AstroTime(dt));
    samples.push({ date: dt.toISOString(), frac: info.phase_fraction, angleDeg: info.phase_angle });
  }
  let minI = 0, maxI = 0, minF = +Infinity, maxF = -Infinity;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].frac < minF) { minF = samples[i].frac; minI = i; }
    if (samples[i].frac > maxF) { maxF = samples[i].frac; maxI = i; }
  }
  // 寻找两个最接近 0.5 的候选（近似上弦、下弦）
  const byHalf = [...samples].map((s, idx) => ({ idx, diff: Math.abs(s.frac - 0.5) }))
    .sort((a, b) => a.diff - b.diff).slice(0, 4).map(x => x.idx).sort((a, b) => a - b);
  const quarters = byHalf.map(i => samples[i]);
  return { samples, newMoon: samples[minI], fullMoon: samples[maxI], quarters };
}

export function runMoonPhaseAutoTests() {
  const results: TestResult[] = [];
  const push = (r: TestResult) => { results.push(r); console[(r.ok?'log':'error')](`[MoonPhaseTest] ${r.ok?'✅':'❌'} ${r.name}`, r.ok? r.info : r.issues); };

  try {
    const months = [ { y: 2024, m: 2 }, { y: 2024, m: 5 } ]; // 2024-03 与 2024-06（0基索引）
    for (const mm of months) {
      const ext = findExtremaInMonth(mm.y, mm.m);
      const okNew = ext.newMoon.frac <= 0.05;
      const okFull = ext.fullMoon.frac >= 0.95;
      push({ name:`${mm.y}-${String(mm.m+1).padStart(2,'0')} NewMoon`, ok: okNew, info: ext.newMoon, issues: okNew? undefined : [ `min phase_fraction=${ext.newMoon.frac.toFixed(3)}` ] });
      push({ name:`${mm.y}-${String(mm.m+1).padStart(2,'0')} FullMoon`, ok: okFull, info: ext.fullMoon, issues: okFull? undefined : [ `max phase_fraction=${ext.fullMoon.frac.toFixed(3)}` ] });
      // 四分相：相位角应接近90°，给较宽容差
      const qOk = ext.quarters.some(q => Math.abs(q.angleDeg - 90) <= 15);
      push({ name:`${mm.y}-${String(mm.m+1).padStart(2,'0')} QuarterNear90deg`, ok: qOk, info: ext.quarters, issues: qOk? undefined : ['no quarter near 90° found'] });
    }
  } catch (e) {
    push({ name:'Runner', ok:false, issues:[ String(e) ] });
  }

  const passed = results.filter(r=>r.ok).length;
  const payload = { when: new Date().toISOString(), passed, total: results.length, results };
  console.log('[MoonPhaseTest:JSON]', JSON.stringify(payload, null, 2));
  return payload;
}

