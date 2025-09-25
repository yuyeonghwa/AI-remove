import React from 'react';
import { TransparentIcon } from './icons/TransparentIcon';
import { SolidColorIcon } from './icons/SolidColorIcon';
import { GradientIcon } from './icons/GradientIcon';

export type BackgroundMode = 'transparent' | 'solid' | 'gradient';

interface BackgroundOptionsProps {
  mode: BackgroundMode;
  onModeChange: (mode: BackgroundMode) => void;
  solidColor: string;
  onSolidColorChange: (color: string) => void;
  gradientStart: string;
  onGradientStartChange: (color: string) => void;
  gradientEnd: string;
  onGradientEndChange: (color: string) => void;
}

const options: { id: BackgroundMode; label: string; icon: React.ReactNode }[] = [
  { id: 'transparent', label: '투명', icon: <TransparentIcon /> },
  { id: 'solid', label: '단색', icon: <SolidColorIcon /> },
  { id: 'gradient', label: '그라데이션', icon: <GradientIcon /> },
];

export const BackgroundOptions: React.FC<BackgroundOptionsProps> = ({
  mode,
  onModeChange,
  solidColor,
  onSolidColorChange,
  gradientStart,
  onGradientStartChange,
  gradientEnd,
  onGradientEndChange,
}) => {
  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) => (
    <div className="flex items-center gap-2">
      <label htmlFor={label} className="text-sm text-gray-300">{label}</label>
      <input
        id={label}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-gray-600"
        title={`Select ${label.toLowerCase()} color`}
      />
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center gap-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
      <div className="flex justify-center items-center bg-gray-900/50 p-1 rounded-lg">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onModeChange(option.id)}
            className={`flex items-center justify-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${
              mode === option.id
                ? 'bg-cyan-500 text-white shadow'
                : 'text-gray-300 hover:bg-gray-600'
            }`}
            title={`${option.label} 배경`}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      
      {mode === 'solid' && (
        <div className="flex items-center gap-4 transition-opacity duration-300 opacity-100">
          <ColorPicker label="배경색" value={solidColor} onChange={onSolidColorChange} />
        </div>
      )}

      {mode === 'gradient' && (
        <div className="flex flex-col sm:flex-row items-center gap-4 transition-opacity duration-300 opacity-100">
            <ColorPicker label="시작색" value={gradientStart} onChange={onGradientStartChange} />
            <ColorPicker label="종료색" value={gradientEnd} onChange={onGradientEndChange} />
        </div>
      )}
    </div>
  );
};