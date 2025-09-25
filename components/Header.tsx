import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="w-full text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
        스마트 배경 제거기
      </h1>
      <p className="mt-2 text-lg text-gray-400">
        손끝에서 이루어지는 AI 기반 이미지 편집.
      </p>
    </header>
  );
};