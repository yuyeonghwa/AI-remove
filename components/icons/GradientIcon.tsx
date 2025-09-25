import React from 'react';

export const GradientIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: 'currentColor', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: 'currentColor', stopOpacity: 0.4 }} />
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="url(#grad1)" />
  </svg>
);