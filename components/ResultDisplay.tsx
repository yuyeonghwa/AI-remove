import React, { useRef, useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { DownloadIcon } from './icons/DownloadIcon';
import type { Rect } from '../types';


interface ResultDisplayProps {
  editedImage: string | null;
  isLoading: boolean;
  maskPreviewUrl: string | null;
  isGeneratingMask: boolean;
  onSelectionEnd: (selection: Rect) => void;
  isActive: boolean;
  onActivate: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
    editedImage, 
    isLoading,
    maskPreviewUrl,
    isGeneratingMask,
    onSelectionEnd,
    isActive,
    onActivate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);

  const getCanvasAndContext = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    return { canvas, ctx };
  }, []);

  const resizeCanvas = useCallback(() => {
    const { canvas } = getCanvasAndContext();
    const image = imageRef.current;
    if (canvas && image && image.complete) {
      if (canvas.width !== image.clientWidth || canvas.height !== image.clientHeight) {
        canvas.width = image.clientWidth;
        canvas.height = image.clientHeight;
      }
    }
  }, [getCanvasAndContext]);
  
  // Draw the mask received from parent
  useEffect(() => {
    const { canvas, ctx } = getCanvasAndContext();
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (maskPreviewUrl) {
      const maskImage = new Image();
      maskImage.onload = () => {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(maskImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      };
      maskImage.src = maskPreviewUrl;
    }
  }, [maskPreviewUrl, getCanvasAndContext, editedImage]);

  // Draw the selection rectangle as the user drags
  useEffect(() => {
    if (isSelecting) {
      const { canvas, ctx } = getCanvasAndContext();
      if (!ctx || !canvas || !selectionRect) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (maskPreviewUrl) {
        const maskImage = new Image();
        maskImage.onload = () => {
          ctx.globalAlpha = 0.5;
          ctx.drawImage(maskImage, 0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1.0;
        };
        maskImage.src = maskPreviewUrl;
      }

      ctx.strokeStyle = 'rgba(74, 222, 128, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
    }
  }, [selectionRect, isSelecting, getCanvasAndContext, maskPreviewUrl]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    
    const handleResize = () => resizeCanvas();

    image.addEventListener('load', handleResize);
    window.addEventListener('resize', handleResize);

    // If the image is already loaded (e.g. from cache), call resizeCanvas immediately
    if (image.complete) {
        handleResize();
    }

    return () => {
      image.removeEventListener('load', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, [editedImage, resizeCanvas]);

  const getPointerPos = (evt: React.MouseEvent | React.TouchEvent) => {
    const { canvas } = getCanvasAndContext();
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in evt ? evt.touches[0].clientX : evt.clientX;
    const clientY = 'touches' in evt ? evt.touches[0].clientY : evt.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleStartSelection = (e: React.MouseEvent | React.TouchEvent) => {
    if ('button' in e && e.button !== 0) return;
    e.preventDefault();
    setIsSelecting(true);
    setStartPoint(getPointerPos(e));
    setSelectionRect(null);
  };
  
  const handleSelecting = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isSelecting || !startPoint) return;
    
    const currentPos = getPointerPos(e);
    const x = Math.min(startPoint.x, currentPos.x);
    const y = Math.min(startPoint.y, currentPos.y);
    const width = Math.abs(startPoint.x - currentPos.x);
    const height = Math.abs(startPoint.y - currentPos.y);
    setSelectionRect({ x, y, width, height });
  };

  const handleEndSelection = () => {
    if (!isSelecting || !selectionRect || !imageRef.current) return;
    setIsSelecting(false);
    
    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imageRef.current;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const nativeRect: Rect = {
      x: selectionRect.x * scaleX,
      y: selectionRect.y * scaleY,
      width: selectionRect.width * scaleX,
      height: selectionRect.height * scaleY,
    };
    
    if (nativeRect.width > 5 && nativeRect.height > 5) {
      onSelectionEnd(nativeRect);
    }
    setStartPoint(null);
    setSelectionRect(null);
  };

  const containerClasses = `w-full relative min-h-[300px] sm:min-h-[400px] bg-gray-800/50 rounded-xl border-2 flex flex-col justify-center items-center p-4 transition-all duration-300 ${isActive ? 'border-cyan-400' : 'border-gray-700'}`;
  const activeWrapperClasses = `transition-opacity duration-300 ${editedImage ? (isActive ? '' : 'cursor-pointer') : ''}`;

  return (
    <div className={activeWrapperClasses} onClick={!isActive && editedImage ? onActivate : undefined}>
      <h2 className="text-xl font-semibold mb-4 text-center text-gray-300">편집된 이미지</h2>
      <div className={containerClasses}>
        {isLoading && (
          <div className="flex flex-col items-center gap-4 text-gray-400">
            <LoadingSpinner />
            <p className="font-semibold">AI가 생각 중입니다...</p>
          </div>
        )}
        {!isLoading && editedImage && (
          <div className="relative w-full flex items-center justify-center">
            <img 
              ref={imageRef} 
              src={editedImage} 
              alt="Edited result" 
              className="w-full h-auto max-w-full max-h-full object-contain rounded-lg"
              draggable={false}
            />
             <canvas
              ref={canvasRef}
              className={`absolute top-0 left-0 w-full h-full touch-none ${isActive ? 'cursor-crosshair' : 'cursor-pointer'}`}
              onMouseDown={isActive ? handleStartSelection : undefined}
              onMouseMove={isActive ? handleSelecting : undefined}
              onMouseUp={isActive ? handleEndSelection : undefined}
              onMouseLeave={isActive ? handleEndSelection : undefined}
              onTouchStart={isActive ? handleStartSelection : undefined}
              onTouchMove={isActive ? handleSelecting : undefined}
              onTouchEnd={isActive ? handleEndSelection : undefined}
            />
            {isGeneratingMask && (
              <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center rounded-lg">
                <LoadingSpinner />
                <p className="text-white mt-2">객체 감지 중...</p>
              </div>
            )}
            <a
              href={editedImage}
              download="edited-image.png"
              className="absolute bottom-4 right-4 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-full inline-flex items-center gap-2 transition-transform duration-200 hover:scale-105 shadow-lg"
            >
              <DownloadIcon />
              <span>다운로드</span>
            </a>
          </div>
        )}
        {!isLoading && !editedImage && (
          <div className="text-center text-gray-500">
            <p className="font-semibold text-lg">편집된 이미지가 여기에 표시됩니다</p>
            <p>시작하려면 이미지를 업로드하고 편집을 적용하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};