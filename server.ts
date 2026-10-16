import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WRAPPING_FEE = 7000;

const app = express();
app.use(express.json({ limit: '20mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Analyze Occasion & Optional Mood Photo (with Multimodal Relevance Validation)
app.post('/api/gemini/analyze-occasion', async (req, res) => {
  try {
    const { occasion, budget, imageBase64, imageMimeType, recipientNote } = req.body;
    const ai = getGeminiClient();

    const promptText = `당신은 하이엔드 부티크 플로리스트 'Darte Flores (다르테 플로레스)'의 수석 디렉터입니다.
사용자 요청 정보:
- 기념일/상황: ${occasion}
- 목표 예산: ${Number(budget).toLocaleString()}원 (기본 포장·스타일링비 7,000원 포함 기준)
${recipientNote ? `- 추가 메모/받는 분 특징: ${recipientNote}` : ''}
${
  imageBase64
    ? `- 사용자가 분위기 참고 사진을 업로드했습니다.
  [중요: 이미지 적합성 검증]
  만약 업로드된 사진이 인물, 의상, 드레스, 공간 인테리어, 포스터, 풍경, 꽃, 색감 무드 등 꽃다발 분위기 파악에 참고할 수 있는 사진이라면 isImageRelevant를 true로 설정하세요.
  반면, 코드 스크린샷, 영수증, 텍스트 문서, 표/다이어그램, 완전한 단색 화면 등 꽃다발 분위기 추천과 전혀 무관한 사진이라면:
  1) isImageRelevant를 false로 설정하세요.
  2) imageValidationMessage에 "업로드하신 사진에서 분위기 요소를 찾기 어려워, 선택하신 기념일('${occasion}')을 기준으로 어울리는 꽃을 추천해 드렸어요."라고 설정하세요.
  3) 이 경우 사진의 색상을 무시하고 오직 기념일('${occasion}')과 예산에 가장 잘 어울리는 무드와 컬러 팔레트, 메인 꽃을 추천하세요.`
    : '- 사진이 업로드되지 않았으므로 기념일과 메모를 기반으로 분석하세요 (isImageRelevant: true).'
}

[한국 일반 플라워샵 현실 소매 단가 기준]
- 메인 꽃(Mass): 작약/수국/라넌큘러스(6,000~8,000원), 장미/거베라/튤립(3,500~5,000원)
- 서브/필러 꽃: 프리지아/리시안셔스/소국(2,500~4,000원), 안개꽃/스타티스(3,000~4,500원)
- 그린 소재: 유칼립투스/더스티밀러(2,000~3,000원)

다음 조건에 맞춰 JSON으로 응답하세요:
1. isImageRelevant: 사진이 꽃다발 무드 분석에 적합한지 여부 (boolean)
2. imageValidationMessage: 부적합할 때 안내 문구 (적합하면 빈 문자열 "")
3. extractedMood: 이 기념일과 사진(적합할 경우)에서 느껴지는 감성적인 분위기 키워드 문장
4. colorPalette: 어울리는 핵심 컬러 팔레트 Hex 코드 정확히 4개
5. recommendedMainFlowers: 기념일과 꽃말(Flower Meaning)이 가장 잘 어울리는 메인 꽃 후보 4종.
   - shapeType은 반드시 다음 중 하나만 사용: "peony" | "rose" | "tulip" | "freesia" | "daisy" | "babysbreath" | "eucalyptus"
   - estimatedPricePerStem은 위 한국 플라워샵 소매 단가 기준(3,500~8,000원 사이 정수)으로 현실감 있게 책정하세요.
   - alternatives에는 꽃집에 해당 메인 꽃 재고가 없을 때 색감과 화형이 유사한 대체 메인 꽃 이름 2~3종(예: ["하노이 라넌큘러스", "왕방울 가든 로즈"])을 포함하세요.`;

    const parts: any[] = [];
    if (imageBase64 && imageMimeType) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: cleanBase64,
        },
      });
    }
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            occasion: { type: Type.STRING },
            isImageRelevant: { type: Type.BOOLEAN },
            imageValidationMessage: { type: Type.STRING },
            extractedMood: { type: Type.STRING },
            colorPalette: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedMainFlowers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  nameKo: { type: Type.STRING },
                  nameEn: { type: Type.STRING },
                  flowerMeaning: { type: Type.STRING },
                  estimatedPricePerStem: { type: Type.INTEGER },
                  defaultColor: { type: Type.STRING },
                  shapeType: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  alternatives: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: [
                  'id',
                  'nameKo',
                  'nameEn',
                  'flowerMeaning',
                  'estimatedPricePerStem',
                  'defaultColor',
                  'shapeType',
                  'reason',
                  'alternatives',
                ],
              },
            },
          },
          required: [
            'occasion',
            'isImageRelevant',
            'imageValidationMessage',
            'extractedMood',
            'colorPalette',
            'recommendedMainFlowers',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error('[API /analyze-occasion Error]:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to analyze occasion' });
  }
});

// 2. Generate 3 Distinct 3D Bouquet Style Variations with Realistic Korean Retail Pricing
app.post('/api/gemini/generate-styles', async (req, res) => {
  try {
    const { occasion, budget, extractedMood, colorPalette, mainFlower } = req.body;
    const ai = getGeminiClient();
    const flowerBudgetTarget = Math.max(20000, Number(budget) - WRAPPING_FEE);

    const promptText = `당신은 'Darte Flores (다르테 플로레스)'의 수석 플로리스트입니다.
사용자가 선택한 메인 꽃을 중심으로 3가지 서로 다른 매력의 3D 꽃다발 스타일을 설계해 주세요.

[입력 정보]
- 기념일: ${occasion}
- 총 목표 예산: ${Number(budget).toLocaleString()}원 (기본 포장·스타일링비 ${WRAPPING_FEE.toLocaleString()}원 포함이므로 순수 꽃 원가 합계는 약 ${flowerBudgetTarget.toLocaleString()}원 내외로 맞출 것)
- 분석된 무드: ${extractedMood}
- 추천 팔레트: ${(colorPalette || []).join(', ')}
- 선택된 메인 꽃: ${mainFlower.nameKo} (${mainFlower.nameEn}) / 꽃말: "${mainFlower.flowerMeaning}" / 단가: ${mainFlower.estimatedPricePerStem}원 / 색상: ${mainFlower.defaultColor} / 형태: ${mainFlower.shapeType}

[한국 일반 플라워샵 소매 단가 기준]
- 메인 꽃(MAIN): 작약/수국(6,000~8,000원), 장미/거베라/튤립(3,500~5,000원)
- 서브 꽃(SUB): 프리지아/리시안셔스/소국/튤립(2,500~4,500원)
- 필러 꽃(FILLER): 안개꽃/스타티스/옥시페탈룸/왁스플라워(2,500~4,000원)
- 그린 소재(GREENERY): 유칼립투스/더스티밀러/루스커스(2,000~3,000원)
- 기본 포장·스타일링비: 7,000원 정액 (estimatedTotalCost = 모든 슬롯의 stemCount * pricePerStem 합계 + 7000)

[필수 설계 규칙]
1. 정확히 3가지 스타일을 배열로 반환하세요:
   - Style A: 로맨틱 파스텔 톤 (부드럽고 사랑스러운 무드)
   - Style B: 세련된 모던 비비드 톤 (감각적인 대비와 화사한 존재감)
   - Style C: 싱그러운 내추럴 가든 톤 (프렌치 가든 스타일의 자연스러운 조화)
2. 각 스타일의 components 배열은 정확히 4개의 슬롯으로 구성하세요 (플로리스트 황금 비율 매스 40~50% : 서브/필러 30~40% : 그린 10~20%):
   - slot-main (role: "MAIN"): 사용자가 선택한 메인 꽃 (${mainFlower.nameKo}), 권장 3~6송이
   - slot-sub (role: "SUB"): 메인 꽃 주변 중간 링을 채우는 서브 꽃, 권장 4~6송이
   - slot-filler (role: "FILLER"): 메인과 서브 사이 빈 공간 위로 입체감을 주는 필러 꽃, 권장 3~5송이
   - slot-greenery (role: "GREENERY"): 외곽 아웃라인을 감싸는 그린 소재, 권장 3~5줄기
3. MAIN을 포함한 모든 컴포넌트에는 반드시 고유한 한국어 꽃말(flowerMeaning)과 꽃집 재고 부재 시 플로리스트가 대체할 수 있는 유사 꽃 2~3종(alternatives 배열)을 포함하세요.
4. 각 스타일의 swapCandidates 배열에는 사용자가 3D 뷰어에서 바꿔 끼워볼 수 있는 추천 교체 후보 꽃 6종(각각 권장 stemCount, 현실적인 pricePerStem, 고유 꽃말, 색상 Hex, shapeType, alternatives 포함)을 제공하세요.
5. shapeType은 반드시 "peony" | "rose" | "tulip" | "freesia" | "daisy" | "babysbreath" | "eucalyptus" 중 하나여야 합니다.`;

    const slotSchema = {
      type: Type.OBJECT,
      properties: {
        slotId: { type: Type.STRING },
        role: { type: Type.STRING },
        nameKo: { type: Type.STRING },
        nameEn: { type: Type.STRING },
        flowerMeaning: { type: Type.STRING },
        stemCount: { type: Type.INTEGER },
        pricePerStem: { type: Type.INTEGER },
        colorHex: { type: Type.STRING },
        shapeType: { type: Type.STRING },
        alternatives: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        'slotId',
        'role',
        'nameKo',
        'nameEn',
        'flowerMeaning',
        'stemCount',
        'pricePerStem',
        'colorHex',
        'shapeType',
        'alternatives',
      ],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              styleId: { type: Type.STRING },
              styleName: { type: Type.STRING },
              description: { type: Type.STRING },
              wrappingColor: { type: Type.STRING },
              ribbonColor: { type: Type.STRING },
              estimatedTotalCost: { type: Type.INTEGER },
              components: {
                type: Type.ARRAY,
                items: slotSchema,
              },
              swapCandidates: {
                type: Type.ARRAY,
                items: slotSchema,
              },
            },
            required: [
              'styleId',
              'styleName',
              'description',
              'wrappingColor',
              'ribbonColor',
              'estimatedTotalCost',
              'components',
              'swapCandidates',
            ],
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty style response from Gemini');
    }
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error('[API /generate-styles Error]:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to generate bouquet styles' });
  }
});

// 3. Generate Photorealistic Bouquet Preview Image from 3D Recipe
app.post('/api/gemini/render-photorealistic', async (req, res) => {
  try {
    const { occasion, styleName, components, wrappingColor, ribbonColor, snapshotBase64 } = req.body;
    const ai = getGeminiClient();

    const flowerDetails = (components || [])
      .map(
        (c: any) =>
          `${c.role}: ${c.nameEn} (${c.nameKo}, ${c.stemCount} stems, color ${c.colorHex})`
      )
      .join(', ');

    const imagePrompt = `Editorial luxury studio product photography of a bespoke spiral hand-tied Korean florist flower bouquet for ${occasion}, style "${styleName}".
Bouquet composition following Mass-Filler-Line hierarchy: ${flowerDetails}.
Wrapped in artisanal matte Korean florist craft paper in hex color ${wrappingColor} with a soft satin ribbon bow in hex color ${ribbonColor}.
Placed on a warm travertine stone table against a soft Petal White (#F5F4ED) studio backdrop, natural golden hour side window lighting, shallow depth of field, ultra-detailed botanical petals and foliage, 8k commercial photography.`;

    const parts: any[] = [];
    if (snapshotBase64) {
      const cleanBase64 = snapshotBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64,
        },
      });
      parts.push({
        text: `Transform this 3D flower bouquet composition into an ultra-realistic luxury florist studio photograph while preserving the overall color harmony, wrapping color (${wrappingColor}), ribbon (${ribbonColor}), and flower types: ${imagePrompt}`,
      });
    } else {
      parts.push({ text: imagePrompt });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: '4:3',
        },
      },
    });

    let generatedImageUrl: string | null = null;
    const candidateParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of candidateParts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!generatedImageUrl) {
      throw new Error('No image returned from model');
    }

    res.json({ imageUrl: generatedImageUrl, promptUsed: imagePrompt });
  } catch (error: any) {
    console.error('[API /render-photorealistic Error]:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to generate photorealistic bouquet image' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Darte Flores server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
