# 🌸 PRD: Darte Flores (다르테 플로레스) — 3D 커스텀 꽃다발 메이커 & 플로리스트 소통 가이드

> **브랜드명 의미:** 스페인어로 *"너에게 꽃을 선물하다 (To give you flowers)"*  
> **문서 목적:** Google AI Studio (`Build new App`) 기반 웹 애플리케이션 생성용 제품 요구사항 정의서 (PRD)  
> **해커톤 트랙:** Track 1 (Gemini 4 Argon in Entertainment / Generative Media) & Track 4 (Open Innovation)  
> **필수 기술 스택:** React 19 + **TypeScript (`.tsx`, `.ts`)** + Three.js (`@types/three`) + Tailwind CSS + `@google/genai` SDK  
> **UI 언어:** 한국어 (헤더 브랜드 로고는 `Darte Flores`와 서브타이틀 `다르테 플로레스 — 너에게 꽃을 선물하다`로 표기)

---

## 1. 제품 개요 (Product Overview)

### 1.1 배경 및 문제 정의 (Problem Statement)
* 사용자는 졸업식, 어버이날, 브라이덜 샤워, 연주회, 생일 등 특별한 기념일에 꽃다발을 선물할 때 **기념일에 어울리는 꽃과 '꽃말(Flower Meaning)'**을 중요하게 찾아본 뒤 **메인 꽃**을 고른다.
* 하지만 메인 꽃 주변을 채울 **서브 꽃(주변 꽃)과 포장지의 조합**은 머릿속으로 상상하기 어렵고 2D 사진만으로는 볼륨감이나 조화를 알기 힘들어, 결국 플로리스트에게 *"알아서 어울리게 해주세요"*라고 맡기게 된다.
* 이로 인해 상상했던 분위기와 다른 결과물이 나오거나, 꽃집에 특정 꽃의 재고가 없을 때 원하는 느낌을 정확히 전달하기 어렵다는 소통의 한계가 발생한다.

### 1.2 핵심 가치 및 해결책 (Solution)
1. **상황 & 분위기 맞춤 메인 꽃 추천 (꽃말 중심):** 기념일, 예산, 그리고 선물 받을 사람이나 장소의 **분위기 사진(멀티모달 입력)**을 분석해 **꽃말**과 함께 최적의 **메인 꽃**을 추천한다.
2. **2~3가지 스타일의 인터랙티브 3D 꽃다발 조합 (`Three.js`):** 선택한 메인 꽃을 중심으로 어울리는 주변 꽃들이 조합된 **2~3가지 스타일의 3D 꽃다발**을 실시간 렌더링한다.
3. **3D 바꿔 끼우기 커스텀:** 사용자가 360도 3D 뷰어에서 직접 주변 꽃 슬롯을 다른 추천 꽃(각 꽃말 표시)으로 교체해 보거나 포장지·리본 색상을 변경한다.
4. **실사 렌더링 & 플로리스트 주문 가이드 발급:** 완성된 3D 꽃다발 구도를 바탕으로 **고화질 실사 꽃다발 이미지**를 생성하고, 꽃집 사장님께 그대로 보여드릴 수 있는 **플로리스트 전용 주문 가이드(꽃 목록, 꽃말, 예상 단가, 재고 부재 시 대체 꽃 추천)**를 출력한다.

---

## 2. 핵심 유저 플로우 및 기능 요구사항 (Core User Flow & Features)

### Step 1. 상황 & 분위기 입력 (Context & Multimodal Input)
* **기념일 선택 (프리셋 칩 + 직접 입력):** `여성의 날`, `어버이날`, `엄마 생신`, `파트너의 생일`, `친구 브라이덜 샤워`, `졸업식`, `연주회`, `직접 입력`
* **예산 설정:** 슬라이더 UI (`30,000원` ~ `150,000원`, 기본값 `50,000원`)
* **분위기 참고 사진 업로드 (선택 사항 - Multimodal):**
  * 선물 받을 사람의 평소 옷 스타일, 브라이덜 샤워 드레스, 연주회 포스터/의상 사진을 업로드.
  * Gemini 멀티모달 분석을 통해 이미지의 **핵심 컬러 팔레트(Hex 코드 4개)**와 **분위기 키워드**를 추출하여 화면에 표시.

### Step 2. 메인 꽃 & 꽃말 선택 (Main Flower Selection)
* 입력된 기념일, 예산, 사진 분위기(업로드 시)에 어울리는 **메인 꽃 후보 3~4종**을 Gemini API로 생성하여 카드로 표시.
* **필수 표시 항목:**
  * 꽃 한글/영문 이름 및 대표 컬러 스와치
  * **꽃말 (Flower Meaning) 강조 뱃지** (예: `"새로운 시작을 응원합니다"`)
  * 이 기념일에 추천하는 이유 및 송이당 예상 단가
* 사용자가 마음에 드는 **메인 꽃 1종**을 선택하면 다음 단계로 진행.

### Step 3. 2~3가지 스타일의 3D 꽃다발 비교 (3D Style Variations)
* 선택한 메인 꽃을 중심으로, 어울리는 주변 꽃(서브 꽃, 필러 꽃, 그리너리 소재)이 조합된 **3가지 서로 다른 무드의 꽃다발**을 생성 (예: `Style A. 로맨틱 파스텔 톤`, `Style B. 세련된 모던 비비드 톤`, `Style C. 싱그러운 내추럴 가든 톤`).
* 각 스타일 탭을 클릭하면 중앙 `Three.js` 3D 캔버스에 해당 꽃다발이 입체적으로 즉시 렌더링됨.
* 꽃다발을 구성하는 모든 꽃(메인 꽃 + 서브 꽃 + 그린 소재)의 이름과 **각각의 고유한 꽃말**을 리스트에 명시.

### Step 4. 3D 인터랙티브 커스텀 (Swap & Customize in 3D)
* **360도 3D 뷰어 (`Three.js`):**
  * `OrbitControls`를 통한 360도 회전, 줌 인/아웃 지원.
  * 빠른 카메라 시점 전환 버튼: `[정면 뷰]`, `[항공샷 (위에서 보기)]`, `[측면 뷰]`.
  * `FlowerShapeType`에 따라 각기 다른 절차적(Procedural) 3D 꽃 지오메트리 구현 (겹꽃잎 작약/장미, 컵 모양 튤립, 종 모양 프리지아, 방사형 데이지/거베라, 잔꽃 안개꽃, 유칼립투스 잎사귀, 하단 포장지 콘 & 리본).
* **주변 꽃 바꿔 끼우기 (Slot Swapping):**
  * 현재 꽃다발에 들어간 서브 꽃이나 그린 소재 슬롯을 클릭하면, 교체 가능한 추천 꽃 후보(`swapCandidates`, 각 후보의 꽃말·색상·단가 포함)가 표시됨.
  * 다른 꽃을 선택해 끼우면 **즉시 3D 뷰어의 꽃 모델과 예상 총액 게이지가 실시간으로 업데이트**됨.
* **포장지 & 리본 색상 변경:** 프리셋 컬러 팔레트 또는 컬러 피커로 포장지와 리본 색상을 실시간 변경.

### Step 5. 실사 프리뷰 렌더링 & 플로리스트 소통 가이드 발급 (Photorealistic View & Florist Sheet)
* **AI 실사 꽃다발 이미지 생성 (3D → Photorealistic):**
  * `[📸 AI 실사 사진으로 미리보기]` 버튼 클릭 시, 현재 3D 꽃다발에 조합된 꽃 종류, 색상, 송이 수, 포장지 색상을 프롬프트로 구성하여 Gemini 이미지 생성 모델(`gemini-2.5-flash-image` / `imagen-3.0-generate-002` 등 AI Studio 지원 모델)로 고화질 실사 꽃다발 사진을 렌더링.
* **플로리스트 전용 주문 가이드 (Florist Order Sheet):**
  * 꽃집 사장님께 스마트폰 화면으로 바로 보여드리거나 인쇄/저장할 수 있는 한 장의 명세서 UI 제공:
    1. **시각 레퍼런스:** 3D 꽃다발 스냅샷(정면/위) + AI 실사 렌더링 사진 + 컬러 팔레트 칩
    2. **꽃다발 구성표:** 구분(메인/서브/필러/그린), 꽃 이름, 권장 송이 수, 예상 금액
    3. **💡 플로리스트 대체 꽃 가이드 (Alternative Flowers):** 꽃집에 해당 서브 꽃 재고가 없을 때 비슷한 분위기와 색감을 낼 수 있는 **대체 추천 꽃 2~3종** 필수 표기
    4. **꽃말 메시지 카드:** 선물에 동봉할 수 있도록 각 꽃의 꽃말을 모아 보여주는 카드 섹션

---

## 3. TypeScript 인터페이스 명세 (`types.ts`)

애플리케이션 전반에서 아래 TypeScript 타입을 엄격하게 준수하며, Gemini API 호출 시 `responseSchema`를 사용하여 타입 안전성을 보장한다.

```typescript
export type FlowerRole = 'MAIN' | 'SUB' | 'FILLER' | 'GREENERY';

export type FlowerShapeType =
  | 'peony'       // 풍성한 겹꽃잎 (작약, 라넌큘러스)
  | 'rose'        // 나선형 꽃잎 (장미, 카네이션)
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
}
```

---

## 4. 화면 레이아웃 및 디자인 컬러 시스템 (UI/UX & Brand Color Palette)

### 4.1 브랜드 대표 컬러 시스템 (`Darte Flores` Color Palette)
첨부된 두 가지 플로럴 팔레트의 조화를 바탕으로, **3D 꽃다발이 가장 돋보이는 따뜻한 뉴트럴 베이스** 위에 **우아한 부티크 메인 컬러**와 **생기 있는 플로럴 포인트 컬러**를 매칭한다.

| 역할 (Role) | 컬러 이름 (Color Name) | Hex 코드 | UI 적용 위치 |
| :--- | :--- | :--- | :--- |
| **Background (기본 배경)** | **Petal White** | `#F5F4ED` | 전체 앱 배경 및 3D 캔버스 배경 (꽃 색상이 가장 선명하게 보이도록 지원) |
| **Surface / Card (서브 배경)** | **Bone** | `#E7DBC1` | 좌측 컨트롤 패널, 스텝퍼, 포장지 기본 톤, 플로리스트 주문서 카드 테두리/배경 |
| **Primary (메인 브랜드)** | **Turkish Rose** | `#BF6C8B` | 메인 CTA 버튼, 선택된 스텝/카드 테두리, **'꽃말(Flower Meaning)' 강조 뱃지** |
| **Secondary (보타니컬 그린)** | **Tea Green** | `#CCDFAA` | 그리너리/소재 슬롯 뱃지, 예산 안정권 게이지, 완료/대체 꽃 안내 태그 |
| **Warm Accent (하이라이트)** | **Maximum Yellow Red** / **Marigold Orange** | `#F0B659` / `#F6A93A` | 추천 이유 아이콘, 인기 기념일 태그, 따뜻한 무드 포인트 |
| **Floral Theme Accents (스타일 무드 칩 & 3D 꽃 기본 팔레트)** | **Primrose Yellow** / **Violet Bloom** / **Cornflower Blue** | `#F7EC8D` / `#8B6EC7` / `#5E84E2` | 3가지 꽃다발 스타일 탭(`Style A/B/C`) 구분 뱃지 및 3D 꽃 기본 컬러 프리셋 |
| **Typography (본문 텍스트)** | **Deep Botanical Charcoal** | `#2D2A26` | 가독성을 위한 본문 및 타이틀 텍스트 (`#F5F4ED`, `#E7DBC1` 배경 위 고대비 확보) |

### 4.2 파일 구조 및 아키텍처 요구사항 (`TypeScript`)
* `types.ts`: 모든 데이터 모델 및 인터페이스 정의
* `services/geminiService.ts`: `@google/genai` SDK(`new GoogleGenAI({ apiKey: process.env.API_KEY })`)를 사용한 멀티모달 분석, 메인 꽃 추천, 3가지 꽃다발 스타일 생성(`responseSchema` 적용), 실사 꽃다발 이미지 생성 함수 구현 (네트워크/API 지연 시 즉시 테스트할 수 있는 풍부한 Fallback 프리셋 데이터 포함)
* `components/BouquetCanvas3D.tsx`: `Three.js` 기반 절차적 3D 꽃다발 렌더링, 마우스 회전/줌, 카메라 뷰 프리셋(정면/항공샷), 꽃 호버 시 `[꽃 이름 + 꽃말]` 오버레이 표시
* `components/FloristGuideModal.tsx`: 플로리스트 소통용 주문 가이드 시트 (3D 스냅샷 + 실사 사진 + 레시피 표 + 대체 꽃 안내 + 꽃말 카드)
* `App.tsx`: 좌측 단계별 컨트롤 패널 + 중앙 3D/실사 스테이지 + 하단 실시간 예산 게이지 통합 레이아웃 (위의 `Darte Flores` Hex 컬러 팔레트를 Tailwind 임의 값 `bg-[#F5F4ED]`, `bg-[#E7DBC1]`, `bg-[#BF6C8B]` 등으로 정확히 적용)
