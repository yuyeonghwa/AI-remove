import React from 'react';
import { XCircleIcon } from './icons/XCircleIcon';
import { SelectionIcon } from './icons/SelectionIcon';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';

interface ToolPanelProps {
  onClearMask: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({ 
  onClearMask,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {

  return (
    <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
      
      <div className="flex items-center gap-3 text-gray-300">
        <SelectionIcon />
        <span className="font-semibold text-sm sm:text-base">드래그하여 객체 선택</span>
      </div>

      <button
        onClick={onClearMask}
        className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
      >
        <XCircleIcon />
        선택 영역 지우기
      </button>

      <div className="hidden sm:block w-px h-6 bg-gray-500"></div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800"
          title="실행 취소 (Ctrl+Z)"
        >
          <UndoIcon />
          실행 취소
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800"
          title="다시 실행 (Ctrl+Y)"
        >
          <RedoIcon />
          다시 실행
        </button>
      </div>
    </div>
  );
};