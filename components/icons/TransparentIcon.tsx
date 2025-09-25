import React from 'react';

export const TransparentIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M3 3h18v18H3z" fill="white"></path>
    <path
      d="M15 3v6h6v6h-6v6h-6v-6H3V9h6V3z"
      fill="currentColor"
      fillOpacity="0.2"
    ></path>
    <path d="M3 3h18v18H3z"></path>
  </svg>
);