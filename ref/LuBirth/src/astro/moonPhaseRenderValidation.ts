import { AstroTime, Body, Illumination } from 'astronomy-engine';

export type RenderDay = { iso: string; fraction: number; angleDeg: number; brightSide: 'LEFT' | 'RIGHT' };
export type RenderMonthReport = {
  year: number;
  month: number; // 1-12
  days: RenderDay[];
  approxFull: RenderDay;
  approxNew: RenderDay;
};

export function runMoonPhaseRenderValidation(year: number, month1to12: number): RenderMonthReport {
  const rows: RenderDay[] = [];
  const daysInMonth = new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(Date.UTC(year, month1to12 - 1, d, 12, 0, 0));
    const info = Illumination(Body.Moon, new AstroTime(dt));
    const frac = Math.max(0, Math.min(1, info.phase_fraction));
    const angleDeg = info.phase_angle; // 0≈满月, 180≈新月
    const brightSide = Math.sin((angleDeg * Math.PI) / 180) >= 0 ? 'RIGHT' : 'LEFT';
    rows.push({ iso: dt.toISOString(), fraction: +frac.toFixed(6), angleDeg: +angleDeg.toFixed(3), brightSide });
  }
  let iFull = 0, iNew = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].fraction > rows[iFull].fraction) iFull = i;
    if (rows[i].fraction < rows[iNew].fraction) iNew = i;
  }
  const report: RenderMonthReport = {
    year,
    month: month1to12,
    days: rows,
    approxFull: rows[iFull],
    approxNew: rows[iNew]
  };
  console.log('[MoonPhaseRenderValidation:JSON]', JSON.stringify(report, null, 2));
  return report;
}

