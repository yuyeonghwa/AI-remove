import { GoogleGenAI, Modality, Part } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = 'gemini-2.5-flash-image-preview';


export async function autoGenerateMask(
    imagePart: Part
): Promise<string | null> {
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    imagePart,
                    { text: "이미지에서 눈에 띄는 모든 주요 피사체를 식별하고 해당 피사체들에 대한 정밀한 단일 이진 마스크(검은색 배경에 흰색)를 생성하세요. 모든 피사체는 완전히 흰색이어야 하고 나머지는 모두 완전히 검은색이어야 합니다. 마스크 이미지만 출력하세요." }
                ],
            },
            config: {
                systemInstruction: "당신은 정밀한 이미지 분할 모델입니다. 당신의 임무는 이미지의 모든 주요 피사체를 식별하여 하나의 흑백 마스크를 만드는 것입니다. 식별된 모든 피사체는 완벽하게 흰색이어야 하고, 다른 모든 영역은 검은색이어야 합니다. 당신의 출력물은 마스크 이미지여야만 합니다.",
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        return null;

    } catch (error) {
        console.error("Error calling Gemini API for auto mask generation:", error);
        throw new Error("AI 모델에서 자동 마스크를 생성하는 데 실패했습니다.");
    }
}

export async function generateMask(
    imageWithSelectionPart: Part
): Promise<string | null> {
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    imageWithSelectionPart,
                    { text: "그려진 사각형 안의 주요 객체에 대한 정밀한 이진 마스크(검은색 바탕에 흰색)를 생성하세요. 객체는 완전히 흰색이어야 하고, 나머지는 모두 완전히 검은색이어야 합니다. 출력 마스크에 사각형을 포함하지 마세요. 마스크 이미지만 출력하세요." }
                ],
            },
            config: {
                systemInstruction: "당신은 정밀한 이미지 분할 모델입니다. 당신의 임무는 사용자의 선택 영역으로부터 흑백 마스크를 만드는 것입니다. 지정된 영역 안의 주요 피사체는 완벽하게 흰색이어야 하고, 다른 모든 영역은 검은색이어야 합니다. 당신의 출력물은 마스크 이미지여야만 합니다.",
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        return null;

    } catch (error) {
        console.error("Error calling Gemini API for mask generation:", error);
        throw new Error("AI 모델에서 선택 기반 마스크를 생성하는 데 실패했습니다.");
    }
}


export async function editImageWithPrompt(
  imagePart: Part,
  prompt: string,
  maskPart?: Part
): Promise<string | null> {
  if (!prompt.trim()) {
    throw new Error("프롬프트를 제공해야 합니다.");
  }
  
  try {
    const parts: Part[] = [imagePart];
    if (maskPart) {
      parts.push(maskPart);
    }
    parts.push({ text: prompt });


    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts,
      },
      config: {
        systemInstruction: "당신은 정밀한 AI 사진 편집 전문가입니다. 당신의 유일한 임무는 사용자의 지시에 따라 이미지의 배경을 수정하는 것입니다.\n\n**절대 규칙:**\n1.  **주 피사체 절대 보존:** 당신의 최우선이자 가장 중요한 임무는 주 피사체의 원본을 100% 완벽하게 보존하는 것입니다. 피사체의 모양, 크기, 비율, 색상, 질감, 그림자, 조명 등 어떠한 시각적 요소도 **절대** 변경해서는 안 됩니다. **피사체를 재창조하는 대신, 마스크된 영역의 원본 픽셀을 그대로 최종 결과물에 복사해야 합니다. 이 영역은 픽셀 단위로 원본과 동일해야 합니다.**\n2.  **출력 형식:** 출력 이미지의 해상도와 크기는 항상 원본 이미지와 정확히 일치해야 합니다.\n\n**작업 지침:**\n1.  **마스크 처리:**\n    -   마스크가 **제공된 경우**: 마스크의 흰색 영역은 **'보존해야 할 주 피사체'**입니다. 당신의 모든 편집 작업은 마스크의 검은색 영역(배경)에만 적용되어야 합니다.\n    -   마스크가 **제공되지 않은 경우**: 먼저 이미지에서 가장 눈에 띄는 주 피사체를 **스스로 식별**하세요. 그런 다음, 식별된 피사체를 제외한 나머지 배경 영역에만 사용자의 지시를 적용하세요.\n2.  **지시 이행:**\n    - 사용자가 배경 제거, 단색 채우기, 그라데이션 적용을 요청하면, 피사체의 모든 세부 사항(예: 머리카락, 미세한 가장자리)을 그대로 유지하면서 배경만 지정된 대로 정밀하게 수정하세요.\n    - 사용자가 배경에 대한 추가적인 편집(예: 그림자 추가)을 요청하는 경우, 해당 변경이 주 피사체의 핵심 외형에 영향을 주지 않는 선에서만 신중하게 적용하세요.\n\n**핵심 요약: 당신은 배경 편집 전문가이며, 피사체는 절대 건드리지 않습니다.**",
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    return null;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("AI 모델과 통신하는 데 실패했습니다. API 키와 네트워크 연결을 확인해 주세요.");
  }
}