
import React from 'react';

interface AlertProps {
  message: string;
  onClose: () => void;
}

export const Alert: React.FC<AlertProps> = ({ message, onClose }) => {
  return (
    <div className="w-full max-w-2xl bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative flex justify-between items-center" role="alert">
      <span className="block sm:inline">{message}</span>
      <button onClick={onClose} className="text-red-200 hover:text-white">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
