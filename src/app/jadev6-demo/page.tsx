"use client";

import React from 'react';
import JadeV6DemoPage from '@/pages/JadeV6DemoPage';

export default function Page() {
  try {
    return <JadeV6DemoPage />;
  } catch (e) {
    console.error('[jadev6-demo] render failed:', e);
    return <div style={{ color: '#fff', padding: 16 }}>加载失败</div>;
  }
}



