import React from 'react';
import LiveDetectionInterface from './LiveDetectionInterface'; // <-- IMPORT COMPONENT MỚI

// Component giả định PageHeading (nên tạo file riêng sau)
const PageHeading = ({ title, children }) => (
  <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '1rem' }}>
    <h1 style={{ color: '#333', fontSize: '2.5rem', marginBottom: '0.5rem' }}>{title}</h1>
    <p style={{ color: '#666', fontSize: '1.1rem' }}>{children}</p>
  </div>
);


export default function Home() {
  return (
    <div className="home-container">
      
      <PageHeading>
      </PageHeading>

      {/* Guests can use detection, but only saving is restricted */}
      <LiveDetectionInterface /> 
      
    </div>
  );
}