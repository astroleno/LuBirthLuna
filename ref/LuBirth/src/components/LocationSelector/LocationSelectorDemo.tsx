import React, { useState } from 'react';
import { LocationSelector } from './LocationSelector';

export const LocationSelectorDemo: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const handleLocationChange = (location: any) => {
    setSelectedLocation(location);
    console.log('Selected location:', location);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>位置选择器演示</h2>
      <LocationSelector
        onLocationChange={handleLocationChange}
        initialLocation={{
          province: '北京',
          city: '北京市',
          district: '朝阳区'
        }}
      />
      
      {selectedLocation && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
          <h3>当前选择的位置：</h3>
          <p><strong>省份：</strong> {selectedLocation.province}</p>
          <p><strong>城市：</strong> {selectedLocation.city}</p>
          <p><strong>区县：</strong> {selectedLocation.district}</p>
          <p><strong>经度：</strong> {selectedLocation.lon?.toFixed(4)}°</p>
          <p><strong>纬度：</strong> {selectedLocation.lat?.toFixed(4)}°</p>
        </div>
      )}
    </div>
  );
};