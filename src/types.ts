export const WRAPPING_FEE = 7000; // 대중적인 포장·스타일링 기본 공임비 (7,000원)

export type FlowerRole = 'MAIN' | 'SUB' | 'FILLER' | 'GREENERY';

export type FlowerShapeType =
  | 'peony'       // 풍성한 겹꽃잎 (작약, 라넌큘러스, 수국)
  | 'rose'        // 나선형 꽃잎 (장미, 카네이션, 리시안셔스)
  | 'tulip'       // 컵 모양 꽃봉오리 (튤립)
  | 'freesia'     // 종 모양 작은 꽃송이 군집 (프리지아, 방울꽃)
  | 'daisy'       // 중심 수술 + 방사형 꽃잎 (거베라, 마가렛, 해바라기)
  | 'babysbreath' // 안개꽃 형태의 잔꽃 군집 (안개꽃, 스타티스)
  | 'eucalyptus'; // 둥근 잎사귀 줄기 (유칼립투스, 더스티밀러 등 그린 소재)

export interface MainFlowerRecommendation {
  id: string;
  nameKo: string;
  nameEn: string;
  flowerMeaning: string; // 꽃말 (필수 표시)
  estimatedPricePerStem: number;
  defaultColor: string;  // Hex color code (e.g., "#FFB7C5")
  shapeType: FlowerShapeType;
  reason: string;
  alternatives?: string[]; // 메인 꽃 재고 부재 시 대체 추천 메인 꽃 2~3종
}

export interface BouquetComponentSlot {
  slotId: string;
  role: FlowerRole;
  nameKo: string;
  nameEn: string;
  flowerMeaning: string; // 각 꽃의 고유 꽃말
  stemCount: number;
  pricePerStem: number;
  colorHex: string;
  shapeType: FlowerShapeType;
  alternatives: string[]; // 플로리스트용 대체 추천 꽃 리스트 (재고 부재 시 활용)
}

export interface BouquetStyle {
  styleId: string;
  styleName: string;
  description: string;
  wrappingColor: string;
  ribbonColor: string;
  estimatedTotalCost: number;
  components: BouquetComponentSlot[];
  swapCandidates: BouquetComponentSlot[]; // 사용자가 바꿔 끼워볼 수 있는 추천 서브 꽃/소재 풀
}

export interface OccasionAnalysisResponse {
  occasion: string;
  extractedMood: string;
  colorPalette: string[];
  recommendedMainFlowers: MainFlowerRecommendation[];
  isImageRelevant?: boolean; // 업로드한 사진이 인물/의상/장소/분위기 파악에 적합한지 여부
  imageValidationMessage?: string; // 무관한 사진일 때 사용자에게 보여줄 친절한 안내 문구
}

export type CameraViewPreset = 'front' | 'top' | 'side';

export interface BouquetSnapshotSet {
  front?: string;
  top?: string;
}

export interface GeneratedPhotoHistoryItem {
  id: string;
  timestamp: string;
  imageUrl: string;
  bouquetSnapshot: BouquetStyle;
}

export interface SavedBouquetSession {
  sessionId: string;
  savedAt: string;
  occasion: string;
  budget: number;
  mainFlower: MainFlowerRecommendation;
  styleName: string;
  wrappingColor: string;
  ribbonColor: string;
  components: BouquetComponentSlot[];
  swapCandidates: BouquetComponentSlot[];
  extractedMood: string;
  colorPalette: string[];
  photorealisticUrl?: string | null;
}
