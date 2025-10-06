import { computeEphemeris, toUTCFromLocal } from './ephemeris';

type CaseResult = { name: string; ok: boolean; info?: any; issues?: string[] };

const abs = Math.abs;
const wrap360 = (a:number)=>{ let x=a%360; if(x<0)x+=360; return x; };

function noonExpectedAltitude(latDeg:number, declinationDeg:number){
  // Idealized solar altitude at local noon: 90° - |lat - δ|
  return 90 - abs(latDeg - declinationDeg);
}

export function runFullLightingValidation(){
  const results: CaseResult[] = [];
  const push = (r: CaseResult)=>{ results.push(r); console[(r.ok?'log':'error')](`[FullTest] ${r.ok?'✅':'❌'} ${r.name}`, r.ok? r.info : r.issues); };

  try{
    // 1) Noon altitude across latitudes and seasons
    const seasons = [
      { name:'Equinox', date:'2024-03-21', decl: 0 },
      { name:'SummerSolstice', date:'2024-06-21', decl: +23.44 },
      { name:'WinterSolstice', date:'2024-12-21', decl: -23.44 },
    ];
    const lats = [-75,-60,-45,-30,-15,0,15,30,45,60,75];
    const tol = 3.0;
    for(const s of seasons){
      for(const lat of lats){
        const local = `${s.date}T12:00`;
        const lon = 0; // use lon=0 and local noon via toUTCFromLocal
        const utc = toUTCFromLocal(local, lon);
        const eph = computeEphemeris(utc, lat, lon);
        const expectAlt = noonExpectedAltitude(lat, s.decl);
        const ok = Math.abs(eph.altDeg - expectAlt) <= tol;
        push({ name:`NoonAlt ${s.name} lat=${lat}`, ok, info:{ alt:eph.altDeg.toFixed(1), exp:expectAlt.toFixed(1) }, issues: ok? undefined : [`|alt-exp|>${tol}°`] });
      }
    }

    // 2) Equator equinox azimuth sectors (skip noon)
    {
      const t1 = computeEphemeris(new Date('2024-03-21T06:00:00Z'), 0, 0);
      const t3 = computeEphemeris(new Date('2024-03-21T18:00:00Z'), 0, 0);
      const a1 = wrap360(t1.azDeg), a3 = wrap360(t3.azDeg);
      const ok = (a1>45 && a1<135) && (a3>225 && a3<315);
      push({ name:'EquinoxEquator Az East/West', ok, info:{ az06:a1.toFixed(1), az18:a3.toFixed(1) }, issues: ok? undefined : ['Expected E at 06Z and W at 18Z'] });
    }

    // 3) Arctic circle midnight sun & Antarctic polar night
    {
      const altsN = ['00:00','06:00','12:00','18:00'].map(h=>computeEphemeris(new Date(`2024-06-21T${h}:00Z`), 66.6, 0).altDeg);
      const okN = altsN.every(a=>a>-0.5);
      push({ name:'ArcticCircle MidnightSun', ok: okN, info:{ alts: altsN.map(a=>a.toFixed(1)) }, issues: okN? undefined : ['Expected all alt >= 0'] });
      const altsS = ['00:00','06:00','12:00','18:00'].map(h=>computeEphemeris(new Date(`2024-06-21T${h}:00Z`), -66.6, 0).altDeg);
      const okS = altsS.every(a=>a<0.5);
      push({ name:'AntarcticCircle PolarNight', ok: okS, info:{ alts: altsS.map(a=>a.toFixed(1)) }, issues: okS? undefined : ['Expected all alt <= 0'] });
    }

    // 4) Local midnight negative altitude using longitude phase
    {
      const night1 = computeEphemeris(toUTCFromLocal('2024-06-21T00:00', 0), -30, 0).altDeg; // local midnight at lon=0
      push({ name:'LocalMidnight lon=0 lat=-30', ok: night1<0, info:{ alt:night1.toFixed(1) }, issues: night1<0? undefined : ['Expected alt < 0'] });
      const night2 = computeEphemeris(toUTCFromLocal('2024-12-21T00:00', 0), +30, 0).altDeg;
      push({ name:'LocalMidnight lon=0 lat=+30', ok: night2<0, info:{ alt:night2.toFixed(1) }, issues: night2<0? undefined : ['Expected alt < 0'] });
    }

    // 5) Sanity grid: alt/az ranges
    {
      const gridLats = [-60,-30,0,30,60];
      const gridLons = [-90,0,90,180];
      const times = ['2024-03-21T00:00:00Z','2024-06-21T12:00:00Z','2024-12-21T18:00:00Z'];
      let okAll = true;
      const bad: any[] = [];
      for(const t of times){
        for(const la of gridLats){
          for(const lo of gridLons){
            const e = computeEphemeris(new Date(t), la, lo);
            const inAlt = e.altDeg>=-90.1 && e.altDeg<=90.1;
            const inAz = e.azDeg>=-0.1 && e.azDeg<=360.1;
            if(!inAlt || !inAz){ okAll=false; bad.push({t,lat:la,lon:lo, alt:e.altDeg, az:e.azDeg}); }
          }
        }
      }
      push({ name:'SanityGrid AltAzRanges', ok: okAll, info:{ count: times.length*gridLats.length*gridLons.length }, issues: okAll? undefined : bad.map(x=>JSON.stringify(x)) });
    }

    // 6) Vector->AltAz consistency grid（抽样验证；天顶附近仅比高度角）
    {
      const wrap360 = (a:number)=>{ let x=a%360; if(x<0)x+=360; return x; };
      const altAzFromSunWorld = (sunWorld:{x:number;y:number;z:number}, latDeg:number, lonDeg:number) => {
        const ecef = { x: sunWorld.x, y: sunWorld.z, z: sunWorld.y };
        const φ = latDeg*Math.PI/180, λ = lonDeg*Math.PI/180;
        const E = { x: -Math.sin(λ), y: Math.cos(λ), z: 0 };
        const N = { x: -Math.sin(φ)*Math.cos(λ), y: -Math.sin(φ)*Math.sin(λ), z: Math.cos(φ) };
        const U = { x: Math.cos(φ)*Math.cos(λ), y: Math.cos(φ)*Math.sin(λ), z: Math.sin(φ) };
        const dot=(a:any,b:any)=>a.x*b.x+a.y*b.y+a.z*b.z;
        const e = dot(ecef,E), n=dot(ecef,N), u=dot(ecef,U);
        const alt = Math.asin(Math.max(-1,Math.min(1,u)));
        let az = Math.atan2(e,n); if(az<0) az+=2*Math.PI;
        return { altDeg: alt*180/Math.PI, azDeg: az*180/Math.PI };
      };
      const points = [
        { t:'2024-03-21T06:00:00Z', lat:0, lon:0 },
        { t:'2024-03-21T18:00:00Z', lat:0, lon:0 },
        { t:'2024-06-21T12:00:00Z', lat:45, lon:0 },
        { t:'2024-12-21T12:00:00Z', lat:-45, lon:0 },
      ];
      let okAll = true; const detail:any[]=[];
      for(const p of points){
        const e = computeEphemeris(new Date(p.t), p.lat, p.lon);
        const v = altAzFromSunWorld(e.sunWorld, p.lat, p.lon);
        const altDiff = Math.abs(e.altDeg - v.altDeg);
        const azDiff = Math.min(
          Math.abs(wrap360(e.azDeg) - wrap360(v.azDeg)),
          Math.abs(wrap360(e.azDeg) - wrap360(v.azDeg + 360)),
          Math.abs(wrap360(e.azDeg) - wrap360(v.azDeg - 360))
        );
        const nearZenith = e.altDeg > 85;
        const ok = altDiff <= 1.0 && (nearZenith ? true : azDiff <= 2.0);
        if(!ok) okAll=false;
        detail.push({ t:p.t, lat:p.lat, lon:p.lon, alt_ephem:e.altDeg.toFixed(2), alt_vec:v.altDeg.toFixed(2), altDiff:altDiff.toFixed(2), az_ephem:wrap360(e.azDeg).toFixed(2), az_vec:wrap360(v.azDeg).toFixed(2), azDiff:azDiff.toFixed(2), nearZenith });
      }
      push({ name:'Vector->AltAz consistency', ok: okAll, info: detail, issues: okAll? undefined : ['Vector/angle mismatch beyond tolerance'] });
    }

  }catch(e){
    push({ name:'FullTest Runner', ok:false, issues:[String(e)] });
  }

  const passed = results.filter(r=>r.ok).length;
  const payload = { when: new Date().toISOString(), passed, total: results.length, results };
  console.log('[FullTest] Summary', `${passed}/${results.length} passed`);
  console.log('[FullTest:JSON]', JSON.stringify(payload, null, 2));
  return payload;
}
