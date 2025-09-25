import React from 'react';

interface PromptHistoryProps {
  history: string[];
  onPromptClick: (prompt: string) => void;
}

export const PromptHistory: React.FC<PromptHistoryProps> = ({ history, onPromptClick }) => {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-4 border-t border-gray-700 pt-4">
      <h3 className="text-md font-semibold text-gray-400 mb-3 text-center">
        최근 프롬프트
      </h3>
      <div className="flex flex-wrap justify-center gap-2">
        {history.map((prompt, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onPromptClick(prompt)}
            className="px-3 py-1 bg-gray-600 hover:bg-teal-600 text-gray-300 hover:text-white rounded-full text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
            title={prompt} // Show full prompt on hover
          >
            {/* Truncate long prompts for display */}
            {prompt.length > 40 ? `${prompt.substring(0, 37)}...` : prompt}
          </button>
        ))}
      </div>
    </div>
  );
};