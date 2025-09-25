import React, { useRef, useState, useEffect, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { LoadingSpinner } from './LoadingSpinner';
import type { Rect } from '../types';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  imagePreview: string | null;
  maskPreviewUrl: string | null;
  isGeneratingMask: boolean;
  onSelectionEnd: (selection: Rect) => void;
  isActive: boolean;
  onActivate: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageUpload, 
  imagePreview,
  maskPreviewUrl,
  isGeneratingMask,
  onSelectionEnd,
  isActive,
  onActivate
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
  }, [maskPreviewUrl, getCanvasAndContext, imagePreview]);

  // Draw the selection rectangle as the user drags
  useEffect(() => {
    if (isSelecting) {
      const { canvas, ctx } = getCanvasAndContext();
      if (!ctx || !canvas || !selectionRect) return;

      // Clear previous drawings (mask + rect)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Redraw mask if it exists
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
  }, [imagePreview, resizeCanvas]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

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
    
    // Convert canvas/client coordinates to image-native coordinates
    const { naturalWidth, naturalHeight } = imageRef.current;
    const { clientWidth, clientHeight } = imageRef.current;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const nativeRect: Rect = {
      x: selectionRect.x * scaleX,
      y: selectionRect.y * scaleY,
      width: selectionRect.width * scaleX,
      height: selectionRect.height * scaleY,
    };
    
    // Only trigger if selection is a meaningful size
    if (nativeRect.width > 5 && nativeRect.height > 5) {
      onSelectionEnd(nativeRect);
    }
    setStartPoint(null);
    setSelectionRect(null); // Clear visual rect after selection is handled
  };

  const containerClasses = `w-full relative min-h-[300px] sm:min-h-[400px] bg-gray-800/50 rounded-xl border-2 flex flex-col justify-center items-center p-4 text-center transition-all duration-300 ${isDragging ? 'border-solid border-green-400' : (isActive ? 'border-cyan-400' : 'border-dashed border-gray-600')}`;
  const activeWrapperClasses = `transition-opacity duration-300 ${isActive ? '' : 'cursor-pointer'}`;
  
  return (
    <div className={activeWrapperClasses} onClick={!isActive ? onActivate : undefined}>
      <h2 className="text-xl font-semibold mb-4 text-center text-gray-300">원본 이미지</h2>
      <div
        className={containerClasses}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
        {imagePreview ? (
          <div className="relative w-full flex items-center justify-center">
            <img 
              ref={imageRef} 
              src={imagePreview} 
              alt="Original preview" 
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
          </div>
        ) : (
          <div 
            className="w-full h-full flex flex-col justify-center items-center gap-4 text-gray-400 cursor-pointer hover:border-cyan-400 hover:bg-gray-800"
            onClick={handleClick}
          >
            <UploadIcon />
            <p className="font-semibold">클릭하여 업로드하거나 드래그 앤 드롭하세요</p>
            <p className="text-sm">PNG, JPG, WEBP 등</p>
          </div>
        )}
      </div>
    </div>
  );
};