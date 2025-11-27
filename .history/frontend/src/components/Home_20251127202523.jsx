import React from 'react';
import LiveDetectionInterface from './LiveDetectionInterface'; // 1. Phải có dòng import này

// ... (các phần khác)

export default function Home() {
  return (
    <div className="home-container">
      
      {/* Page Heading ở đây */}

      {/* 2. Component LiveDetectionInterface phải được gọi ở đây */}
      <LiveDetectionInterface /> 
      
    </div>
  );
}