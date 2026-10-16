import {
  BouquetComponentSlot,
  BouquetStyle,
  FlowerShapeType,
  MainFlowerRecommendation,
  OccasionAnalysisResponse,
  WRAPPING_FEE,
} from '../types';

const VALID_SHAPES: FlowerShapeType[] = [
  'peony',
  'rose',
  'tulip',
  'freesia',
  'daisy',
  'babysbreath',
  'eucalyptus',
];

function sanitizeShape(shape: string, fallback: FlowerShapeType = 'rose'): FlowerShapeType {
  const normalized = (shape || '').toLowerCase().trim() as FlowerShapeType;
  return VALID_SHAPES.includes(normalized) ? normalized : fallback;
}

/**
 * Extracts 4 dominant Hex colors AND checks basic color variance to detect
 * solid black/white screens, receipts, or code screenshots when offline.
 */
export async function analyzeImageClient(
  imageBase64: string
): Promise<{ colors: string[]; isLikelyRelevant: boolean }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ colors: ['#BF6C8B', '#E7DBC1', '#F0B659', '#CCDFAA'], isLikelyRelevant: true });
          return;
        }
        canvas.width = 32;
        canvas.height = 32;
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;

        // Check saturation and luminance distribution across all 1024 pixels
        let colorfulPixels = 0;
        let nearBlackOrWhitePixels = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          if (sat > 0.14) colorfulPixels++;
          if (max < 28 || min > 235) nearBlackOrWhitePixels++;
        }

        // If >88% of pixels are pure black/white and almost no saturation, likely a receipt/document/code screenshot
        const isLikelyRelevant = !(nearBlackOrWhitePixels > 900 && colorfulPixels < 45);

        const samplePoints = [
          [8, 8],
          [24, 8],
          [16, 16],
          [20, 24],
        ];
        const colors = samplePoints.map(([x, y]) => {
          const idx = (y * 32 + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          return (
            '#' +
            [r, g, b]
              .map((c) => Math.max(40, Math.min(240, c)).toString(16).padStart(2, '0'))
              .join('')
              .toUpperCase()
          );
        });
        resolve({ colors, isLikelyRelevant });
      } catch {
        resolve({ colors: ['#BF6C8B', '#E7DBC1', '#F0B659', '#CCDFAA'], isLikelyRelevant: true });
      }
    };
    img.onerror = () =>
      resolve({ colors: ['#BF6C8B', '#E7DBC1', '#F0B659', '#CCDFAA'], isLikelyRelevant: true });
    img.src = imageBase64;
  });
}

const OCCASION_PRESETS: Record<string, OccasionAnalysisResponse> = {
  졸업식: {
    occasion: '졸업식',
    isImageRelevant: true,
    imageValidationMessage: '',
    extractedMood: '찬란한 새 출발을 축복하는 화사한 프림로즈 & 코랄 코티지 무드',
    colorPalette: ['#F6A93A', '#F7EC8D', '#BF6C8B', '#CCDFAA'],
    recommendedMainFlowers: [
      {
        id: 'main-freesia',
        nameKo: '골든 프리지아',
        nameEn: 'Golden Freesia',
        flowerMeaning: '당신의 새로운 시작을 응원합니다',
        estimatedPricePerStem: 3500,
        defaultColor: '#F7EC8D',
        shapeType: 'freesia',
        reason: '졸업과 입학 시즌의 대표 꽃으로, 향기로운 종 모양 꽃송이가 앞날의 밝은 출발을 축복합니다.',
        alternatives: ['버터플라이 라넌큘러스', '미니 수선화', '노란 튤립'],
      },
      {
        id: 'main-tulip-coral',
        nameKo: '코랄 망고 튤립',
        nameEn: 'Mango Charm Tulip',
        flowerMeaning: '영원한 애정과 빛나는 성취',
        estimatedPricePerStem: 4500,
        defaultColor: '#F6A93A',
        shapeType: 'tulip',
        reason: '학위복이나 정장 어디에나 화사하게 포인트가 되어 졸업 스냅 사진에서 가장 돋보입니다.',
        alternatives: ['오렌지 거베라', '코랄 장미', '겹튤립'],
      },
      {
        id: 'main-gerbera',
        nameKo: '파스텔 폼폰 거베라',
        nameEn: 'Pastel Pomponi Gerbera',
        flowerMeaning: '신비로움과 희망찬 미래',
        estimatedPricePerStem: 4000,
        defaultColor: '#F4A6B8',
        shapeType: 'daisy',
        reason: '시선을 사로잡는 큼직한 방사형 화형으로 적은 송이 수로도 풍성한 볼륨감을 연출합니다.',
        alternatives: ['다알리아', '해바라기', '샤스타데이지'],
      },
      {
        id: 'main-peony-pink',
        nameKo: '사라번하트 작약',
        nameEn: 'Sarah Bernhardt Peony',
        flowerMeaning: '수줍음과 화려한 영광',
        estimatedPricePerStem: 7000,
        defaultColor: '#E598B1',
        shapeType: 'peony',
        reason: '겹겹이 피어나는 탐스러운 꽃잎이 오랜 학업의 결실을 우아하게 기념해 줍니다.',
        alternatives: ['하노이 라넌큘러스', '왕방울 가든 로즈', '핑크 수국'],
      },
    ],
  },
  어버이날: {
    occasion: '어버이날',
    isImageRelevant: true,
    imageValidationMessage: '',
    extractedMood: '깊은 존경과 따뜻한 사랑을 담은 클래식 로즈 & 피치 코랄 무드',
    colorPalette: ['#BF6C8B', '#F2A297', '#E7DBC1', '#CCDFAA'],
    recommendedMainFlowers: [
      {
        id: 'main-carnation-vintage',
        nameKo: '빈티지 모브 카네이션',
        nameEn: 'Vintage Mauve Carnation',
        flowerMeaning: '당신의 사랑과 헌신에 깊이 감사드립니다',
        estimatedPricePerStem: 4000,
        defaultColor: '#BF6C8B',
        shapeType: 'rose',
        reason: '전통적인 붉은색 대신 우아한 터키쉬 로즈 톤의 수입 카네이션으로 품격 있는 감사를 전합니다.',
        alternatives: ['리시안셔스', '가든 로즈', '작약'],
      },
      {
        id: 'main-peony-coral',
        nameKo: '코랄 참 작약',
        nameEn: 'Coral Charm Peony',
        flowerMeaning: '복스러움과 행복한 미소',
        estimatedPricePerStem: 7500,
        defaultColor: '#F28B7D',
        shapeType: 'peony',
        reason: '크고 풍성한 화형이 부모님 품에 안겼을 때 가장 화사하고 건강한 에너지를 선사합니다.',
        alternatives: ['하노이 라넌큘러스', '코랄 가든 로즈', '다알리아'],
      },
      {
        id: 'main-ranunculus',
        nameKo: '하노이 라넌큘러스',
        nameEn: 'Hanoi Ranunculus',
        flowerMeaning: '변치 않는 매력과 따뜻한 마음',
        estimatedPricePerStem: 6000,
        defaultColor: '#F5C6D0',
        shapeType: 'peony',
        reason: '실크처럼 겹겹이 감싸인 수백 장의 꽃잎이 부모님의 섬세한 사랑을 닮았습니다.',
        alternatives: ['핑크 작약', '겹카네이션', '영국 장미'],
      },
      {
        id: 'main-rose-juliet',
        nameKo: '줄리엣 가든 로즈',
        nameEn: 'Juliet Garden Rose',
        flowerMeaning: '영원한 존경과 감동',
        estimatedPricePerStem: 5000,
        defaultColor: '#F3B69B',
        shapeType: 'rose',
        reason: '따뜻한 살구빛 화형과 은은한 다마스크 향기로 호불호 없이 사랑받는 프리미엄 장미입니다.',
        alternatives: ['피치 아발란체 장미', '살구빛 카네이션', '겹리시안셔스'],
      },
    ],
  },
  '친구 브라이덜 샤워': {
    occasion: '친구 브라이덜 샤워',
    isImageRelevant: true,
    imageValidationMessage: '',
    extractedMood: '순백의 웨딩 드레스와 조화로운 로맨틱 블러쉬 & 바이올렛 가든 무드',
    colorPalette: ['#F3C6D3', '#8B6EC7', '#F5F4ED', '#CCDFAA'],
    recommendedMainFlowers: [
      {
        id: 'main-peony-blush',
        nameKo: '블러쉬 핑크 작약',
        nameEn: 'Blush Pink Peony',
        flowerMeaning: '행복한 결혼과 수줍은 설렘',
        estimatedPricePerStem: 7500,
        defaultColor: '#F3C6D3',
        shapeType: 'peony',
        reason: '부케의 여왕이라 불리는 작약은 브라이덜 샤워 주인공의 손에서 가장 로맨틱한 실루엣을 완성합니다.',
        alternatives: ['하노이 라넌큘러스', '왕방울 가든 로즈', '화이트 수국'],
      },
      {
        id: 'main-tulip-white',
        nameKo: '화이트 트라이엄프 튤립',
        nameEn: 'White Triumph Tulip',
        flowerMeaning: '순결한 약속과 새로운 시작',
        estimatedPricePerStem: 4500,
        defaultColor: '#FAF7F0',
        shapeType: 'tulip',
        reason: '군더더기 없이 깨끗한 컵 형태의 화이트 튤립이 신부의 청초한 분위기를 극대화합니다.',
        alternatives: ['화이트 칼라(카라)', '화이트 리시안셔스', '화이트 프리지아'],
      },
      {
        id: 'main-sweetpea-lilac',
        nameKo: '라일락 프리지아 & 스위트피',
        nameEn: 'Lilac Freesia',
        flowerMeaning: '달콤한 추억과 우아한 축복',
        estimatedPricePerStem: 4000,
        defaultColor: '#8B6EC7',
        shapeType: 'freesia',
        reason: '하늘거리는 퍼플·라일락 색감이 화이트 드레스에 감각적인 포인트를 더해줍니다.',
        alternatives: ['보라 튤립', '캄파눌라', '스카비오사'],
      },
      {
        id: 'main-rose-capuccino',
        nameKo: '로맨틱 가든 로즈',
        nameEn: 'Romantic Garden Rose',
        flowerMeaning: '완벽한 사랑의 결실',
        estimatedPricePerStem: 4500,
        defaultColor: '#E58FA8',
        shapeType: 'rose',
        reason: '클래식한 나선형 꽃잎이 파티 테이블 센터피스와 핸드타이드 부케 모두에 잘 어울립니다.',
        alternatives: ['부바르디아', '핑크 리시안셔스', '라넌큘러스'],
      },
    ],
  },
};

function getFallbackAnalysis(
  occasion: string,
  customPalette?: string[],
  isImageRelevant: boolean = true
): OccasionAnalysisResponse {
  const validationMessage = !isImageRelevant
    ? `업로드하신 사진에서 분위기 요소를 찾기 어려워, 선택하신 기념일('${occasion}')을 기준으로 어울리는 꽃을 추천해 드렸어요.`
    : '';

  const matched = OCCASION_PRESETS[occasion];
  if (matched) {
    return {
      ...matched,
      isImageRelevant,
      imageValidationMessage: validationMessage,
      colorPalette:
        isImageRelevant && customPalette && customPalette.length === 4
          ? customPalette
          : matched.colorPalette,
    };
  }

  return {
    occasion: occasion || '특별한 기념일',
    isImageRelevant,
    imageValidationMessage: validationMessage,
    extractedMood: `"${occasion || '기념일'}"의 설렘을 담은 우아한 부티크 로즈 & 보타니컬 무드`,
    colorPalette:
      isImageRelevant && customPalette && customPalette.length === 4
        ? customPalette
        : ['#BF6C8B', '#F0B659', '#8B6EC7', '#CCDFAA'],
    recommendedMainFlowers: [
      {
        id: 'main-peony-signature',
        nameKo: '하노이 라넌큘러스 & 작약',
        nameEn: 'Peony & Ranunculus',
        flowerMeaning: '당신은 언제나 빛나는 사람입니다',
        estimatedPricePerStem: 6500,
        defaultColor: (isImageRelevant && customPalette?.[0]) || '#E899B1',
        shapeType: 'peony',
        reason: '풍성한 겹꽃잎이 선사하는 압도적인 볼륨감으로 특별한 날의 감동을 배가시킵니다.',
        alternatives: ['왕방울 가든 로즈', '핑크 수국', '다알리아'],
      },
      {
        id: 'main-rose-signature',
        nameKo: '피치 아발란체 장미',
        nameEn: 'Peach Avalanche Rose',
        flowerMeaning: '진심 어린 사랑과 변치 않는 응원',
        estimatedPricePerStem: 4500,
        defaultColor: (isImageRelevant && customPalette?.[1]) || '#F0B659',
        shapeType: 'rose',
        reason: '따뜻하고 부드러운 꽃잎 색감이 선물 받는 분의 얼굴을 한층 화사하게 밝혀줍니다.',
        alternatives: ['살구빛 리시안셔스', '줄리엣 로즈', '피치 카네이션'],
      },
      {
        id: 'main-tulip-signature',
        nameKo: '크라운 퍼플 튤립',
        nameEn: 'Crown Purple Tulip',
        flowerMeaning: '영원한 애정과 품격 있는 축하',
        estimatedPricePerStem: 4500,
        defaultColor: (isImageRelevant && customPalette?.[2]) || '#8B6EC7',
        shapeType: 'tulip',
        reason: '유려한 컵 모양의 꽃봉오리가 모던하고 세련된 플로럴 실루엣을 만들어 줍니다.',
        alternatives: ['보라 리시안셔스', '아이리스', '클레마티스'],
      },
      {
        id: 'main-daisy-signature',
        nameKo: '폼폰 거베라',
        nameEn: 'Pomponi Gerbera',
        flowerMeaning: '희망찬 내일과 기분 좋은 미소',
        estimatedPricePerStem: 4000,
        defaultColor: '#F6A93A',
        shapeType: 'daisy',
        reason: '생기 넘치는 방사형 꽃잎이 보는 즉시 기분 좋은 에너지를 전달합니다.',
        alternatives: ['미니 해바라기', '샤스타데이지', '골든 볼'],
      },
    ],
  };
}

export function buildFallbackBouquetStyles(
  mainFlower: MainFlowerRecommendation,
  budget: number,
  palette: string[]
): BouquetStyle[] {
  // Subtract standard 7,000 KRW wrapping fee to allocate flower budget according to 45% : 25% : 18% : 12%
  const netFlowerBudget = Math.max(20000, budget - WRAPPING_FEE);
  const mainStemCount = Math.max(
    3,
    Math.min(8, Math.round((netFlowerBudget * 0.45) / mainFlower.estimatedPricePerStem))
  );
  const subStemCount = Math.max(3, Math.min(7, Math.round((netFlowerBudget * 0.26) / 3000)));
  const fillerStemCount = Math.max(3, Math.min(6, Math.round((netFlowerBudget * 0.17) / 3000)));
  const greenStemCount = Math.max(3, Math.min(5, Math.round((netFlowerBudget * 0.12) / 2500)));

  const mainAlternatives =
    mainFlower.alternatives && mainFlower.alternatives.length >= 2
      ? mainFlower.alternatives
      : mainFlower.shapeType === 'peony'
      ? ['하노이 라넌큘러스', '왕방울 가든 로즈', '수국']
      : mainFlower.shapeType === 'tulip'
      ? ['망고 겹튤립', '프렌치 장미', '리시안셔스']
      : ['줄리엣 가든 로즈', '하노이 라넌큘러스', '수입 카네이션'];

  // Realistic Korean Flower Shop Retail Pricing in Swap Pool
  const swapPool: BouquetComponentSlot[] = [
    {
      slotId: 'swap-freesia',
      role: 'SUB',
      nameKo: '옐로우 프리지아',
      nameEn: 'Yellow Freesia',
      flowerMeaning: '새로운 시작을 응원합니다',
      stemCount: subStemCount,
      pricePerStem: 3000,
      colorHex: '#F7EC8D',
      shapeType: 'freesia',
      alternatives: ['버터플라이 라넌큘러스', '미니 수선화', '골든 볼'],
    },
    {
      slotId: 'swap-tulip',
      role: 'SUB',
      nameKo: '라벤더 망고 튤립',
      nameEn: 'Lavender Tulip',
      flowerMeaning: '고백과 영원한 애정',
      stemCount: Math.max(3, subStemCount - 1),
      pricePerStem: 4000,
      colorHex: '#8B6EC7',
      shapeType: 'tulip',
      alternatives: ['히야신스', '보라 리시안셔스', '캄파눌라'],
    },
    {
      slotId: 'swap-daisy',
      role: 'SUB',
      nameKo: '화이트 마가렛 데이지',
      nameEn: 'Marguerite Daisy',
      flowerMeaning: '진실한 마음과 순수한 기쁨',
      stemCount: subStemCount + 1,
      pricePerStem: 2500,
      colorHex: '#FAF6EE',
      shapeType: 'daisy',
      alternatives: ['옥시페탈룸', '미니 거베라', '마트리카리아(캐모마일)'],
    },
    {
      slotId: 'swap-lisianthus',
      role: 'SUB',
      nameKo: '피치 샴페인 리시안셔스',
      nameEn: 'Champagne Lisianthus',
      flowerMeaning: '변치 않는 아름다움과 진심',
      stemCount: subStemCount,
      pricePerStem: 3500,
      colorHex: '#F4C7C3',
      shapeType: 'rose',
      alternatives: ['미니 장미(자나)', '스톡(비단향꽃무)', '미니 카네이션'],
    },
    {
      slotId: 'swap-babysbreath',
      role: 'FILLER',
      nameKo: '클라우드 안개꽃',
      nameEn: "Baby's Breath",
      flowerMeaning: '맑은 마음과 간절한 기쁨',
      stemCount: fillerStemCount,
      pricePerStem: 3000,
      colorHex: '#F9F8F3',
      shapeType: 'babysbreath',
      alternatives: ['화이트 스타티스', '왁스플라워', '아미초'],
    },
    {
      slotId: 'swap-statice',
      role: 'FILLER',
      nameKo: '코랄 핑크 스타티스',
      nameEn: 'Coral Statice',
      flowerMeaning: '변치 않는 영원한 사랑',
      stemCount: fillerStemCount,
      pricePerStem: 3500,
      colorHex: '#F0B659',
      shapeType: 'babysbreath',
      alternatives: ['천일홍', '미니 카네이션(스프레이)', '부바르디아'],
    },
    {
      slotId: 'swap-eucalyptus',
      role: 'GREENERY',
      nameKo: '실버드롭 유칼립투스',
      nameEn: 'Silver Drop Eucalyptus',
      flowerMeaning: '추억과 치유의 숨결',
      stemCount: greenStemCount,
      pricePerStem: 2500,
      colorHex: '#9EB897',
      shapeType: 'eucalyptus',
      alternatives: ['더스티밀러', '구니 유칼립투스', '루스커스'],
    },
  ];

  const styleAComponents: BouquetComponentSlot[] = [
    {
      slotId: 'slot-main',
      role: 'MAIN',
      nameKo: mainFlower.nameKo,
      nameEn: mainFlower.nameEn,
      flowerMeaning: mainFlower.flowerMeaning,
      stemCount: mainStemCount,
      pricePerStem: mainFlower.estimatedPricePerStem,
      colorHex: mainFlower.defaultColor || palette[0] || '#BF6C8B',
      shapeType: mainFlower.shapeType,
      alternatives: mainAlternatives,
    },
    {
      slotId: 'slot-sub',
      role: 'SUB',
      nameKo: '피치 샴페인 리시안셔스',
      nameEn: 'Champagne Lisianthus',
      flowerMeaning: '변치 않는 아름다움과 진심',
      stemCount: subStemCount,
      pricePerStem: 3500,
      colorHex: '#F4C7C3',
      shapeType: 'rose',
      alternatives: ['미니 장미(자나)', '스톡(비단향꽃무)', '스프레이 카네이션'],
    },
    {
      slotId: 'slot-filler',
      role: 'FILLER',
      nameKo: '화이트 클라우드 안개꽃',
      nameEn: "White Baby's Breath",
      flowerMeaning: '맑은 마음과 사랑의 성공',
      stemCount: fillerStemCount,
      pricePerStem: 3000,
      colorHex: '#FAF8F5',
      shapeType: 'babysbreath',
      alternatives: ['화이트 왁스플라워', '아미초', '옥시페탈룸'],
    },
    {
      slotId: 'slot-greenery',
      role: 'GREENERY',
      nameKo: '블랙잭 유칼립투스',
      nameEn: 'Blackjack Eucalyptus',
      flowerMeaning: '소중한 추억과 평온',
      stemCount: greenStemCount,
      pricePerStem: 2500,
      colorHex: '#94AF8C',
      shapeType: 'eucalyptus',
      alternatives: ['구니 유칼립투스', '레몬잎', '루스커스'],
    },
  ];

  const styleBComponents: BouquetComponentSlot[] = [
    {
      slotId: 'slot-main',
      role: 'MAIN',
      nameKo: mainFlower.nameKo,
      nameEn: mainFlower.nameEn,
      flowerMeaning: mainFlower.flowerMeaning,
      stemCount: mainStemCount,
      pricePerStem: mainFlower.estimatedPricePerStem,
      colorHex: mainFlower.defaultColor || '#BF6C8B',
      shapeType: mainFlower.shapeType,
      alternatives: mainAlternatives,
    },
    {
      slotId: 'slot-sub',
      role: 'SUB',
      nameKo: '바이올렛 스윗 튤립',
      nameEn: 'Violet Bloom Tulip',
      flowerMeaning: '영원한 애정과 고귀한 품격',
      stemCount: subStemCount,
      pricePerStem: 4000,
      colorHex: '#8B6EC7',
      shapeType: 'tulip',
      alternatives: ['보라 리시안셔스', '클레마티스', '베로니카'],
    },
    {
      slotId: 'slot-filler',
      role: 'FILLER',
      nameKo: '마리골드 옐로우 프리지아',
      nameEn: 'Marigold Freesia',
      flowerMeaning: '빛나는 앞날을 향한 응원',
      stemCount: fillerStemCount,
      pricePerStem: 3000,
      colorHex: '#F0B659',
      shapeType: 'freesia',
      alternatives: ['골든 스타티스', '미니 소국', '마트리카리아'],
    },
    {
      slotId: 'slot-greenery',
      role: 'GREENERY',
      nameKo: '실버 더스티밀러 & 유칼립투스',
      nameEn: 'Dusty Miller & Eucalyptus',
      flowerMeaning: '차분한 위로와 조화',
      stemCount: greenStemCount,
      pricePerStem: 2500,
      colorHex: '#A7BEA2',
      shapeType: 'eucalyptus',
      alternatives: ['은엽아카시아', '러시안 세이지', '폴리 유칼립투스'],
    },
  ];

  const styleCComponents: BouquetComponentSlot[] = [
    {
      slotId: 'slot-main',
      role: 'MAIN',
      nameKo: mainFlower.nameKo,
      nameEn: mainFlower.nameEn,
      flowerMeaning: mainFlower.flowerMeaning,
      stemCount: mainStemCount,
      pricePerStem: mainFlower.estimatedPricePerStem,
      colorHex: mainFlower.defaultColor || '#BF6C8B',
      shapeType: mainFlower.shapeType,
      alternatives: mainAlternatives,
    },
    {
      slotId: 'slot-sub',
      role: 'SUB',
      nameKo: '프림로즈 마가렛 데이지',
      nameEn: 'Primrose Marguerite Daisy',
      flowerMeaning: '마음속에 감춘 순수한 행복',
      stemCount: subStemCount,
      pricePerStem: 3000,
      colorHex: '#F7EC8D',
      shapeType: 'daisy',
      alternatives: ['캐모마일(마트리카리아)', '버터플라이 라넌큘러스', '미니 거베라'],
    },
    {
      slotId: 'slot-filler',
      role: 'FILLER',
      nameKo: '콘플라워 블루 옥시페탈룸',
      nameEn: 'Cornflower Blue Tweedia',
      flowerMeaning: '믿음직한 사랑과 청량한 설렘',
      stemCount: fillerStemCount,
      pricePerStem: 3500,
      colorHex: '#5E84E2',
      shapeType: 'babysbreath',
      alternatives: ['블루 스타티스', '델피늄', '수레국화'],
    },
    {
      slotId: 'slot-greenery',
      role: 'GREENERY',
      nameKo: '보타니컬 폴리 유칼립투스',
      nameEn: 'Populus Eucalyptus',
      flowerMeaning: '싱그러운 생명력과 새로운 시작',
      stemCount: greenStemCount,
      pricePerStem: 2000,
      colorHex: '#8FB379',
      shapeType: 'eucalyptus',
      alternatives: ['냉이초', '조팝나무 가지', '설유화'],
    },
  ];

  const calcTotal = (items: BouquetComponentSlot[]) =>
    items.reduce((acc, item) => acc + item.stemCount * item.pricePerStem, 0) + WRAPPING_FEE;

  return [
    {
      styleId: 'style-a',
      styleName: 'Style A. 로맨틱 파스텔 톤',
      description:
        '메인 꽃의 색감을 부드럽게 감싸 안는 크림·피치·화이트 파스텔 조합으로, 따뜻하고 우아한 감동을 전합니다.',
      wrappingColor: '#E7DBC1',
      ribbonColor: '#BF6C8B',
      estimatedTotalCost: calcTotal(styleAComponents),
      components: styleAComponents,
      swapCandidates: swapPool,
    },
    {
      styleId: 'style-b',
      styleName: 'Style B. 세련된 모던 비비드 톤',
      description:
        '바이올렛 블룸과 마리골드 웜 액센트를 매치하여 사진 촬영 시 가장 선명하고 감각적인 존재감을 발휘합니다.',
      wrappingColor: '#D8C7B8',
      ribbonColor: '#8B6EC7',
      estimatedTotalCost: calcTotal(styleBComponents),
      components: styleBComponents,
      swapCandidates: swapPool,
    },
    {
      styleId: 'style-c',
      styleName: 'Style C. 싱그러운 내추럴 가든 톤',
      description:
        '프림로즈 옐로우와 콘플라워 블루, 풍성한 유칼립투스를 더해 갓 꺾어 묶은 듯한 프렌치 가든 무드를 연출합니다.',
      wrappingColor: '#DCE5C9',
      ribbonColor: '#F0B659',
      estimatedTotalCost: calcTotal(styleCComponents),
      components: styleCComponents,
      swapCandidates: swapPool,
    },
  ];
}

export async function analyzeOccasionWithGemini(params: {
  occasion: string;
  budget: number;
  imageBase64?: string;
  imageMimeType?: string;
  recipientNote?: string;
}): Promise<OccasionAnalysisResponse> {
  let extractedClientPalette: string[] | undefined;
  let clientImageRelevant = true;

  if (params.imageBase64) {
    const clientCheck = await analyzeImageClient(params.imageBase64);
    extractedClientPalette = clientCheck.colors;
    clientImageRelevant = clientCheck.isLikelyRelevant;
  }

  try {
    const res = await fetch('/api/gemini/analyze-occasion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }

    const data: OccasionAnalysisResponse = await res.json();
    const isImageRelevant =
      params.imageBase64 !== undefined
        ? data.isImageRelevant !== false && clientImageRelevant
        : true;

    const validationMessage =
      !isImageRelevant
        ? data.imageValidationMessage ||
          `업로드하신 사진에서 분위기 요소를 찾기 어려워, 선택하신 기념일('${params.occasion}')을 기준으로 어울리는 꽃을 추천해 드렸어요.`
        : '';

    return {
      occasion: data.occasion || params.occasion,
      isImageRelevant,
      imageValidationMessage: validationMessage,
      extractedMood: data.extractedMood,
      colorPalette:
        Array.isArray(data.colorPalette) && data.colorPalette.length >= 4
          ? data.colorPalette.slice(0, 4)
          : extractedClientPalette || ['#BF6C8B', '#E7DBC1', '#F0B659', '#CCDFAA'],
      recommendedMainFlowers: (data.recommendedMainFlowers || []).map((f, idx) => ({
        ...f,
        id: f.id || `main-${idx}`,
        shapeType: sanitizeShape(f.shapeType, idx === 0 ? 'peony' : idx === 1 ? 'rose' : 'tulip'),
        alternatives:
          Array.isArray(f.alternatives) && f.alternatives.length >= 2
            ? f.alternatives
            : ['하노이 라넌큘러스', '왕방울 가든 로즈', '리시안셔스'],
      })),
    };
  } catch (err) {
    console.warn('Using curated Darte Flores occasion analysis preset:', err);
    return getFallbackAnalysis(params.occasion, extractedClientPalette, clientImageRelevant);
  }
}

export async function generateBouquetStylesWithGemini(params: {
  occasion: string;
  budget: number;
  extractedMood: string;
  colorPalette: string[];
  mainFlower: MainFlowerRecommendation;
}): Promise<BouquetStyle[]> {
  try {
    const res = await fetch('/api/gemini/generate-styles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }

    const styles: BouquetStyle[] = await res.json();
    if (!Array.isArray(styles) || styles.length === 0) {
      throw new Error('Empty styles array');
    }

    const defaultMainAlternatives =
      params.mainFlower.alternatives && params.mainFlower.alternatives.length >= 2
        ? params.mainFlower.alternatives
        : ['하노이 라넌큘러스', '왕방울 가든 로즈', '수국'];

    return styles.map((style, sIdx) => {
      const normalizedComponents = (style.components || []).map((comp, cIdx) => ({
        ...comp,
        slotId: comp.slotId || `slot-${sIdx}-${cIdx}`,
        shapeType: sanitizeShape(
          comp.shapeType,
          comp.role === 'GREENERY'
            ? 'eucalyptus'
            : comp.role === 'FILLER'
            ? 'babysbreath'
            : 'rose'
        ),
        alternatives:
          Array.isArray(comp.alternatives) && comp.alternatives.length > 0
            ? comp.alternatives
            : comp.role === 'MAIN'
            ? defaultMainAlternatives
            : ['리시안셔스', '라넌큘러스', '미니 장미'],
      }));

      const normalizedSwaps = (style.swapCandidates || []).map((swap, swIdx) => ({
        ...swap,
        slotId: swap.slotId || `swap-${sIdx}-${swIdx}`,
        stemCount: Math.max(2, Math.min(10, swap.stemCount || 4)),
        shapeType: sanitizeShape(swap.shapeType, 'freesia'),
        alternatives:
          Array.isArray(swap.alternatives) && swap.alternatives.length > 0
            ? swap.alternatives
            : ['스토크', '캄파눌라', '아미초'],
      }));

      const total =
        normalizedComponents.reduce((acc, c) => acc + c.stemCount * c.pricePerStem, 0) +
        WRAPPING_FEE;

      return {
        ...style,
        styleId: style.styleId || `style-${sIdx}`,
        estimatedTotalCost: total,
        components: normalizedComponents,
        swapCandidates: normalizedSwaps,
      };
    });
  } catch (err) {
    console.warn('Using curated Darte Flores 3D bouquet styles:', err);
    return buildFallbackBouquetStyles(params.mainFlower, params.budget, params.colorPalette);
  }
}

/**
 * Generates an editorial studio lookbook composite canvas from the 3D snapshot
 * if the live image generation model is unavailable or delayed.
 */
async function createStudioEditorialFallbackImage(params: {
  occasion: string;
  styleName: string;
  components: BouquetComponentSlot[];
  wrappingColor: string;
  ribbonColor: string;
  snapshotBase64?: string;
}): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(params.snapshotBase64 || '');
      return;
    }

    const grad = ctx.createRadialGradient(600, 420, 80, 600, 450, 750);
    grad.addColorStop(0, '#FCFBF7');
    grad.addColorStop(0.55, '#F5F4ED');
    grad.addColorStop(1, '#E7DBC1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 900);

    ctx.save();
    ctx.fillStyle = 'rgba(212, 197, 169, 0.22)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(420, 0);
    ctx.lineTo(180, 900);
    ctx.lineTo(0, 900);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#E3D6BC';
    ctx.fillRect(0, 730, 1200, 170);
    ctx.strokeStyle = '#C9B99A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 730);
    ctx.lineTo(1200, 730);
    ctx.stroke();

    const finishOverlay = () => {
      ctx.strokeStyle = 'rgba(45, 42, 38, 0.14)';
      ctx.lineWidth = 2;
      ctx.strokeRect(36, 36, 1128, 828);

      ctx.fillStyle = '#2D2A26';
      ctx.font = '600 24px "Cormorant Garamond", Georgia, serif';
      ctx.fillText('DARTE FLORES — ATELIER STUDIO LOOKBOOK', 64, 84);
      ctx.font = '500 16px "Noto Sans KR", sans-serif';
      ctx.fillStyle = '#6E665E';
      ctx.fillText(`${params.occasion} · ${params.styleName}`, 64, 114);

      params.components.forEach((c, idx) => {
        const x = 1100 - idx * 44;
        const y = 805;
        ctx.fillStyle = c.colorHex;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      resolve(canvas.toDataURL('image/png'));
    };

    if (params.snapshotBase64) {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.shadowColor = 'rgba(45, 42, 38, 0.22)';
        ctx.shadowBlur = 48;
        ctx.shadowOffsetX = 18;
        ctx.shadowOffsetY = 24;
        const targetH = 740;
        const targetW = (img.width / img.height) * targetH;
        ctx.drawImage(img, (1200 - targetW) / 2, 85, targetW, targetH);
        ctx.restore();
        finishOverlay();
      };
      img.onerror = () => finishOverlay();
      img.src = params.snapshotBase64;
    } else {
      finishOverlay();
    }
  });
}

export async function renderPhotorealisticBouquet(params: {
  occasion: string;
  styleName: string;
  components: BouquetComponentSlot[];
  wrappingColor: string;
  ribbonColor: string;
  snapshotBase64?: string;
}): Promise<{ imageUrl: string; isAiGenerated: boolean }> {
  try {
    const res = await fetch('/api/gemini/render-photorealistic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }

    const data = await res.json();
    if (data.imageUrl) {
      return { imageUrl: data.imageUrl, isAiGenerated: true };
    }
    throw new Error('Missing imageUrl');
  } catch (err) {
    console.warn('Falling back to Studio Lookbook render from 3D canvas:', err);
    const studioUrl = await createStudioEditorialFallbackImage(params);
    return { imageUrl: studioUrl, isAiGenerated: false };
  }
}
