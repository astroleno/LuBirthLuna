#!/usr/bin/env node
/*
  Validate lunar phase dates for a given month and print JSON.
  Usage: node scripts/moon-phase-validate.cjs 2025 9
*/

const { AstroTime, Body, Illumination } = require('astronomy-engine');

function sampleMonth(year, month) {
  const rows = [];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(Date.UTC(year, month - 1, d, 12, 0, 0));
    const info = Illumination(Body.Moon, new AstroTime(dt));
    const frac = info.phase_fraction;  // 0=new, 1=full
    const angleDeg = info.phase_angle; // 0≈full, 180≈new
    const brightSide = Math.sin((angleDeg * Math.PI) / 180) >= 0 ? 'RIGHT' : 'LEFT';
    rows.push({ iso: dt.toISOString(), fraction: +frac.toFixed(6), angleDeg: +angleDeg.toFixed(3), brightSide });
  }
  // Find extrema
  let iFull = 0, iNew = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].fraction > rows[iFull].fraction) iFull = i;
    if (rows[i].fraction < rows[iNew].fraction) iNew = i;
  }
  return {
    year,
    month,
    days: rows,
    approxFull: rows[iFull],
    approxNew: rows[iNew]
  };
}

function main() {
  const [,, yStr, mStr] = process.argv;
  const year = parseInt(yStr || '2025', 10);
  const month = parseInt(mStr || '9', 10);
  const result = sampleMonth(year, month);
  console.log(JSON.stringify(result, null, 2));
}

main();

