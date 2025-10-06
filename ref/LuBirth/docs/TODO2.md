# TODO2 — Solar Orientation Fix (2025-09)

- [x] Core: Fix GMST/LST calculation in src/astro/ephemeris.ts (use 280.46061837 + 360.98564736629·D)
- [x] Verify key scenarios via logs (equinox/solstice, Arctic circle midnight sun, equator noon)
- [x] Refine azimuth formula to standard tan2(sin H, cos H·sin φ − tan δ · cos φ) and normalize to [0,360)
- [x] UI: Add a “time interpretation” option (by longitude zone vs. system timezone) and explicit log labels
- [ ] Legacy path consistency: unify sunWorld vs sunEQD usage or remove legacy path
- [x] Keep normalization/fallback and improve debug logs

---

## Algorithm Summary (after fixes)

- Input: localISO, latDeg, lonDeg, 	imeMode.
- Time: yLongitude → UTC = localISO − round(lon/15)h; ySystem → parse localISO as system local time.
- Ephemeris (preferred via astronomy-engine):
  - RA/DEC: Equator(Body.Sun, time, observer, ofDate=true, aberration=true).
  - Alt/Az: Horizon(time, observer, ra, dec, 'normal').
  - Azimuth convention: 0°=North, 90°=East, clockwise; Altitude: [-90°, 90°].
- Fallback (only if engine fails): corrected local implementation with standard GMST angle formula and azimuth via vector method.
- ENU/ECEF/world chain:
  - Alt/Az → ENU: x=sin(az)cos(el) (East), y=sin(el) (Up), z=cos(az)cos(el) (North).
  - ENU → ECEF with E/N/U basis at (lat, lon).
  - sunWorld = sunECEF (world-space sun direction), rendering uses light direction -sunWorld.
- Rendering composition:
  - Camera fixed; Earth tilt fixed to 0°, yaw 0°.
  - Only rotate Earth around world Y to center target longitude (lignLongitudeOnly), keeping composition stable.
- Logging/Debug:
  - Unified logger with on/off switch; structured tags (computeEphemeris/*, solarAltAzEngine/*, sunlight/*, lign/*).
  - One-click copy of aggregated JSON (window.__LuBirthLogs).

## Validation Snapshot (passed)

- Shanghai (31.2N, 121.5E): Spring 07:00 Alt~12.8°/Az~97.5°; Summer 12:00 Alt~82.2°/Az~187°; Autumn 18:00 Alt~-2.5°/Az~271.5°; Winter 12:00 Alt~35.4°/Az~182.2°.
- Arctic Circle (66N): Summer 00:00 Alt≈0° (midnight sun near horizon), 18:00 Alt~21.5°; noon highest (~47° expected).
- Equator (0N) Spring: 12:00 Alt~88.2° (near zenith); 06:00/18:00 near horizon East/West.

## Next Steps

- [ ] Optional: Show current Alt/Az (ephemeris) in UI info bar for quick cross-check.
- [ ] Optional: Add "Download logs" (JSON file) besides copy-to-clipboard.
- [ ] Legacy path: either align fields (sunWorld vs sunEQD) or remove legacy entry point.
