import React, { useState, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { Button } from './components/Button';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Alert } from './components/Alert';
import { PromptHistory } from './components/PromptHistory';
import { ToolPanel } from './components/ToolPanel';
import { BackgroundOptions, BackgroundMode } from './components/BackgroundOptions';
import { editImageWithPrompt, generateMask, autoGenerateMask } from './services/geminiService';
import { fileToGenerativePart, dataUrlToFile } from './utils/fileUtils';
import { useHistoryState } from './hooks/useHistoryState';
import { MagicWandIcon } from './components/icons/MagicWandIcon';
import { StopCircleIcon } from './components/icons/StopCircleIcon';
import type { FileDetails, Rect } from './types';
import type { Part } from '@google/genai';

interface EditorState {
  editedImage: string | null;
  originalMask: string | null;
  editedMask: string | null;
  activeEditor: 'original' | 'edited';
}

const initialEditorState: EditorState = {
  editedImage: null,
  originalMask: null,
  editedMask: null,
  activeEditor: 'original',
};

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<FileDetails | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingMask, setIsGeneratingMask] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  
  const { 
    state: editorState, 
    setState: setEditorState, 
    resetState: resetEditorState, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useHistoryState<EditorState>(initialEditorState);
    
  const { editedImage, originalMask, editedMask, activeEditor } = editorState;

  // State for background options
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('transparent');
  const [solidColor, setSolidColor] = useState<string>('#FFFFFF');
  const [gradientStart, setGradientStart] = useState<string>('#4A90E2');
  const [gradientEnd, setGradientEnd] = useState<string>('#9013FE');

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleAutoMaskGeneration = useCallback(async (file: File) => {
    setIsGeneratingMask(true);
    setError(null);
    try {
        const imagePart = await fileToGenerativePart(file);
        const maskBase64 = await autoGenerateMask(imagePart);
        if (maskBase64) {
            const maskDataUrl = `data:image/png;base64,${maskBase64}`;
            setEditorState(prev => ({ ...prev, originalMask: maskDataUrl }));
        } else {
            setError("이미지에서 주요 객체를 자동으로 감지할 수 없습니다. 수동으로 영역을 선택해 주세요.");
        }
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : '자동 마스크 생성에 실패했습니다.');
    } finally {
        setIsGeneratingMask(false);
    }
  }, [setEditorState]);

  const handleImageUpload = useCallback(async (file: File) => {
    setOriginalImage({
      file,
      preview: URL.createObjectURL(file),
    });
    setError(null);
    setPrompt('');
    setBackgroundMode('transparent');
    resetEditorState(initialEditorState);

    // Automatically trigger mask generation
    await handleAutoMaskGeneration(file);
  }, [handleAutoMaskGeneration, resetEditorState]);

  const handleSelectionEnd = useCallback(async (selectionRect: Rect) => {
    let sourceFile: File | null = null;
    let sourcePreview: string | null = null;

    if (activeEditor === 'original' && originalImage) {
        sourceFile = originalImage.file;
        sourcePreview = originalImage.preview;
    } else if (activeEditor === 'edited' && editedImage) {
        sourceFile = await dataUrlToFile(editedImage, `source-${Date.now()}.png`);
        sourcePreview = editedImage;
    }

    if (!sourceFile || !sourcePreview) {
        setError('선택 영역을 만들 활성 이미지가 없습니다.');
        return;
    }

    setIsGeneratingMask(true);
    setError(null);

    try {
        // Create an image with the selection rectangle drawn on it
        const imageWithSelection = await new Promise<File>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                
                ctx.drawImage(img, 0, 0);
                ctx.strokeStyle = 'rgba(74, 222, 128, 0.9)'; // bright green
                ctx.lineWidth = Math.max(2, img.width / 200);
                ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
                
                const dataUrl = canvas.toDataURL('image/png');
                const file = await dataUrlToFile(dataUrl, 'image_with_selection.png');
                resolve(file);
            };
            img.src = sourcePreview!;
        });

        const imagePart = await fileToGenerativePart(imageWithSelection);
        const maskBase64 = await generateMask(imagePart);

        if (maskBase64) {
            const maskDataUrl = `data:image/png;base64,${maskBase64}`;
            if (activeEditor === 'original') {
                setEditorState(prev => ({...prev, originalMask: maskDataUrl}));
            } else {
                setEditorState(prev => ({...prev, editedMask: maskDataUrl}));
            }
        } else {
            setError("선택한 영역에서 객체를 자동으로 감지할 수 없습니다. 다른 선택 영역으로 다시 시도해 주세요.");
        }
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : '마스크 생성에 실패했습니다.');
    } finally {
        setIsGeneratingMask(false);
    }
  }, [activeEditor, originalImage, editedImage, setEditorState]);

  const handleProcessImage = useCallback(async () => {
    let sourceFile: File | null = null;
    let sourceMask: string | null = null;

    if (activeEditor === 'original' && originalImage) {
        sourceFile = originalImage.file;
        sourceMask = originalMask;
    } else if (activeEditor === 'edited' && editedImage) {
        sourceFile = await dataUrlToFile(editedImage, `source-${Date.now()}.png`);
        sourceMask = editedMask;
    }
    
    if (!sourceFile) {
      setError('처리할 이미지를 선택해 주세요.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    
    try {
      const imagePart = await fileToGenerativePart(sourceFile);
      
      const userPrompt = prompt.trim();
      let taskPrompt = '';

      switch (backgroundMode) {
        case 'solid':
          taskPrompt = `배경을 단색(${solidColor})으로 채워주세요.`;
          break;
        case 'gradient':
          taskPrompt = `배경을 위쪽(${gradientStart})에서 아래쪽(${gradientEnd})으로 이어지는 수직 그라데이션으로 채워주세요.`;
          break;
        default: // 'transparent'
          taskPrompt = '배경만 정밀하게 제거하여 투명하게 만드세요.';
          break;
      }

      if (userPrompt) {
        taskPrompt += ` 또한, 다음 지시사항을 배경에만 적용해 주세요: "${userPrompt}"`;
      }
      
      const finalPrompt = `주 피사체의 원본(모양, 크기, 비율 등)을 완벽하게 보존하면서 다음 작업을 수행하세요: ${taskPrompt}`;

      let maskPart: Part | undefined = undefined;
      if (sourceMask) {
        const maskFile = await dataUrlToFile(sourceMask, 'mask.png');
        maskPart = await fileToGenerativePart(maskFile);
      }
      
      if (prompt.trim() && !promptHistory.includes(userPrompt)) {
        setPromptHistory(prevHistory => [userPrompt, ...prevHistory].slice(0, 5));
      }

      const resultBase64 = await editImageWithPrompt(imagePart, finalPrompt, maskPart);
      
      if (controller.signal.aborted) {
        console.log("처리가 취소되었습니다. 결과는 무시됩니다.");
        return;
      }

      if (resultBase64) {
        setEditorState(prev => ({
          ...prev,
          editedImage: `data:image/png;base64,${resultBase64}`,
          activeEditor: 'edited',
          originalMask: null,
          editedMask: null,
        }));
      } else {
        setError('AI가 이미지를 처리할 수 없습니다. 다른 이미지나 프롬프트를 시도해 주세요.');
      }
    } catch (err) {
      if (controller.signal.aborted) {
        console.log("오류 발생 중 처리가 취소되었습니다.");
        return;
      }
      console.error(err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [originalImage, editedImage, activeEditor, originalMask, editedMask, prompt, promptHistory, backgroundMode, solidColor, gradientStart, gradientEnd, setEditorState]);
  
  const handleCancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setError("처리가 취소되었습니다.");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading && (originalImage || editedImage)) {
      event.preventDefault();
      handleProcessImage();
    }
  };
  
  const handleHistoryClick = (historicPrompt: string) => {
    setPrompt(historicPrompt);
  };
  
  const handleClearMask = () => {
    if (activeEditor === 'original') {
        setEditorState(prev => ({ ...prev, originalMask: null }));
    } else {
        setEditorState(prev => ({ ...prev, editedMask: null }));
    }
  };

  const handleActivateEditor = (editor: 'original' | 'edited') => {
    if (editor === 'edited' && !editedImage) return;
    if (editor !== activeEditor) {
      setEditorState(prev => ({ ...prev, activeEditor: editor }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <Header />
      <main className="w-full max-w-7xl mx-auto flex flex-col items-center gap-8 mt-8">
        
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <ImageUploader 
            onImageUpload={handleImageUpload} 
            imagePreview={originalImage?.preview ?? null}
            maskPreviewUrl={originalMask}
            isGeneratingMask={isGeneratingMask && activeEditor === 'original'}
            onSelectionEnd={handleSelectionEnd}
            isActive={activeEditor === 'original'}
            onActivate={() => handleActivateEditor('original')}
          />
          <ResultDisplay 
            editedImage={editedImage} 
            isLoading={isLoading}
            maskPreviewUrl={editedMask}
            isGeneratingMask={isGeneratingMask && activeEditor === 'edited'}
            onSelectionEnd={handleSelectionEnd}
            isActive={activeEditor === 'edited'}
            onActivate={() => handleActivateEditor('edited')}
          />
        </div>
        
        <div className="w-full max-w-3xl flex flex-col items-center gap-4 bg-gray-800 p-6 rounded-xl shadow-lg">
          {originalImage && (
             <ToolPanel
                onClearMask={handleClearMask}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
             />
          )}

          {originalImage && (
            <BackgroundOptions
              mode={backgroundMode}
              onModeChange={setBackgroundMode}
              solidColor={solidColor}
              onSolidColorChange={setSolidColor}
              gradientStart={gradientStart}
              onGradientStartChange={setGradientStart}
              gradientEnd={gradientEnd}
              onGradientEndChange={setGradientEnd}
            />
          )}

          <label htmlFor="prompt" className="text-lg font-semibold text-cyan-300 mt-2">
            편집 지시사항 (선택사항)
          </label>
          <div className="w-full">
            <input
              id="prompt"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
              placeholder={activeEditor === 'original' ? '예: 피사체에 그림자 추가' : '예: 색상 밝게'}
              autoComplete="off"
            />
          </div>
          
          {isLoading ? (
             <Button onClick={handleCancelProcessing} variant="cancel">
              <StopCircleIcon />
              <span>처리 취소</span>
            </Button>
          ) : (
            <Button onClick={handleProcessImage} disabled={!originalImage}>
              <MagicWandIcon />
              <span>마법 적용</span>
            </Button>
          )}

          <PromptHistory history={promptHistory} onPromptClick={handleHistoryClick} />
        </div>

        {error && 
          <div className="w-full max-w-7xl mt-4">
            <Alert message={error} onClose={() => setError(null)} />
          </div>
        }
      </main>
    </div>
  );
};

export default App;