import { useState, useCallback } from 'react';

export const useHistoryState = <T>(initialState: T) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const state = history[currentIndex];
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const setState = useCallback((newState: T | ((prevState: T) => T)) => {
    const nextState = typeof newState === 'function' 
      ? (newState as (prevState: T) => T)(state) 
      : newState;

    // 상태가 현재와 동일하면 기록에 추가하지 않음
    if (JSON.stringify(nextState) === JSON.stringify(state)) {
      return;
    }
    
    // 현재 인덱스 이후의 내역을 잘라내고 새 상태를 추가
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(nextState);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }, [history, currentIndex, state]);
  
  const resetState = useCallback((newState: T) => {
    setHistory([newState]);
    setCurrentIndex(0);
  }, []);

  const undo = useCallback(() => {
    if (canUndo) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [canUndo, currentIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [canRedo, currentIndex]);


  return { state, setState, resetState, undo, redo, canUndo, canRedo };
};