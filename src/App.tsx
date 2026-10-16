import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Minus,
  Plus,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  BouquetComponentSlot,
  BouquetSnapshotSet,
  BouquetStyle,
  CameraViewPreset,
  MainFlowerRecommendation,
  OccasionAnalysisResponse,
  WRAPPING_FEE,
} from './types';
import {
  analyzeOccasionWithGemini,
  generateBouquetStylesWithGemini,
  renderPhotorealisticBouquet,
} from './services/geminiService';
import { BouquetCanvas3D, BouquetCanvas3DRef } from './components/BouquetCanvas3D';
import { FloristGuideModal } from './components/FloristGuideModal';

const OCCASION_PRESETS = [
  '졸업식',
  '어버이날',
  '엄마 생신',
  '파트너의 생일',
  '친구 브라이덜 샤워',
  '여성의 날',
  '연주회',
  '직접 입력',
];

const WRAPPING_COLOR_CHIPS = [
  { name: '본 베이지', hex: '#E7DBC1', ribbon: '#BF6C8B' },
  { name: '페탈 화이트', hex: '#F5F4ED', ribbon: '#8B6EC7' },
  { name: '더스티 로즈', hex: '#E6C8D0', ribbon: '#BF6C8B' },
  { name: '티 그린', hex: '#DCE5C9', ribbon: '#F0B659' },
  { name: '모던 차콜', hex: '#3E3A37', ribbon: '#F0B659' },
];

const STYLE_TAB_LABELS = ['로맨틱 파스텔', '모던 비비드', '내추럴 가든'];

export default function App() {
  // 3-Step Progressive Disclosure Flow:
  // Step 1: 상황 입력 (Centered Card)
  // Step 2: 메인 꽃 선택 (Centered Card with Accordion)
  // Step 3: 3D 스타일 & 커스텀 (380px Left Panel + Right 3D Viewer)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State
  const [selectedOccasionChip, setSelectedOccasionChip] = useState<string>('졸업식');
  const [customOccasionText, setCustomOccasionText] = useState<string>('');
  const [budget, setBudget] = useState<number>(50000);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | undefined>(undefined);
  const [uploadedImageMime, setUploadedImageMime] = useState<string | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Step 2 State
  const [analysisResult, setAnalysisResult] = useState<OccasionAnalysisResponse | null>(null);
  const [selectedMainFlower, setSelectedMainFlower] = useState<MainFlowerRecommendation | null>(
    null
  );
  const [isGeneratingStyles, setIsGeneratingStyles] = useState<boolean>(false);

  // Step 3 State
  const [bouquetStyles, setBouquetStyles] = useState<BouquetStyle[]>([]);
  const [selectedStyleIndex, setSelectedStyleIndex] = useState<number>(0);
  const [customComponents, setCustomComponents] = useState<BouquetComponentSlot[]>([]);
  const [wrappingColor, setWrappingColor] = useState<string>('#E7DBC1');
  const [ribbonColor, setRibbonColor] = useState<string>('#BF6C8B');
  const [openDrawerSlotId, setOpenDrawerSlotId] = useState<string | null>(null);
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraViewPreset>('front');

  // Final Order Modal & Photorealistic State
  const [isFloristModalOpen, setIsFloristModalOpen] = useState<boolean>(false);
  const [snapshots, setSnapshots] = useState<BouquetSnapshotSet>({});
  const [photorealisticUrl, setPhotorealisticUrl] = useState<string | null>(null);
  const [isRenderingPhoto, setIsRenderingPhoto] = useState<boolean>(false);

  const canvas3DRef = useRef<BouquetCanvas3DRef | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const effectiveOccasion =
    selectedOccasionChip === '직접 입력'
      ? customOccasionText.trim() || '특별한 기념일'
      : selectedOccasionChip;

  // Total Cost Calculation (Flowers + 7,000 KRW Wrapping Fee)
  const totalEstimatedCost = useMemo(() => {
    if (customComponents.length === 0) return 0;
    const stemsSum = customComponents.reduce(
      (sum, item) => sum + item.stemCount * item.pricePerStem,
      0
    );
    return stemsSum + WRAPPING_FEE;
  }, [customComponents]);

  const budgetDiff = totalEstimatedCost - budget;
  const isOverBudget = budgetDiff > 0;

  // Step 1: Image Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImageBase64(reader.result as string);
      setUploadedImageMime(file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  // Step 1 -> Step 2
  const handleProceedToStep2 = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeOccasionWithGemini({
        occasion: effectiveOccasion,
        budget,
        imageBase64: uploadedImageBase64,
        imageMimeType: uploadedImageMime,
      });
      setAnalysisResult(result);
      if (result.recommendedMainFlowers.length > 0) {
        setSelectedMainFlower(result.recommendedMainFlowers[0]);
      }
      setStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2 -> Step 3
  const handleProceedToStep3 = async () => {
    if (!selectedMainFlower) return;
    setIsGeneratingStyles(true);
    try {
      const palette =
        analysisResult?.colorPalette || ['#BF6C8B', '#F0B659', '#8B6EC7', '#CCDFAA'];
      const mood = analysisResult?.extractedMood || `${effectiveOccasion} 맞춤 플로럴 무드`;
      const styles = await generateBouquetStylesWithGemini({
        occasion: effectiveOccasion,
        budget,
        extractedMood: mood,
        colorPalette: palette,
        mainFlower: selectedMainFlower,
      });
      setBouquetStyles(styles);
      setSelectedStyleIndex(0);
      setCustomComponents(styles[0].components);
      setWrappingColor(styles[0].wrappingColor);
      setRibbonColor(styles[0].ribbonColor);
      setOpenDrawerSlotId(styles[0].components[1]?.slotId || null);
      setPhotorealisticUrl(null);
      setStep(3);
    } finally {
      setIsGeneratingStyles(false);
    }
  };

  // Step 3: Switch Style Tab (로맨틱 파스텔 | 모던 비비드 | 내추럴 가든)
  const handleSelectStyleVariation = (index: number) => {
    const chosen = bouquetStyles[index];
    if (!chosen) return;
    setSelectedStyleIndex(index);
    setCustomComponents(chosen.components.map((c) => ({ ...c })));
    setWrappingColor(chosen.wrappingColor);
    setRibbonColor(chosen.ribbonColor);
    setPhotorealisticUrl(null);
  };

  // Step 3: Adjust Stem Count (- / +)
  const handleStemCountChange = (slotId: string, delta: number) => {
    setCustomComponents((prev) =>
      prev.map((slot) => {
        if (slot.slotId !== slotId) return slot;
        const nextCount = Math.max(1, Math.min(15, slot.stemCount + delta));
        return { ...slot, stemCount: nextCount };
      })
    );
    setPhotorealisticUrl(null);
  };

  // Step 3: Inline Drawer Swap with Candidate Chip
  const handleSwapSlotWithCandidate = (targetSlotId: string, candidate: BouquetComponentSlot) => {
    setCustomComponents((prev) =>
      prev.map((slot) => {
        if (slot.slotId !== targetSlotId) return slot;
        return {
          ...slot,
          nameKo: candidate.nameKo,
          nameEn: candidate.nameEn,
          flowerMeaning: candidate.flowerMeaning,
          stemCount: candidate.stemCount || slot.stemCount,
          pricePerStem: candidate.pricePerStem,
          colorHex: candidate.colorHex,
          shapeType: candidate.shapeType,
          alternatives: candidate.alternatives,
        };
      })
    );
    setPhotorealisticUrl(null);
  };

  // Open Final Florist Guide Modal
  const handleOpenFloristGuide = () => {
    if (canvas3DRef.current) {
      const snap = canvas3DRef.current.captureSnapshot();
      if (snap) {
        setSnapshots({ front: snap });
      }
    }
    setIsFloristModalOpen(true);
  };

  // Generate AI Photorealistic Bouquet Image inside Modal
  const handleGeneratePhotorealistic = async () => {
    setIsRenderingPhoto(true);
    try {
      const frontSnap = snapshots.front || canvas3DRef.current?.captureSnapshot() || '';
      if (frontSnap && !snapshots.front) {
        setSnapshots({ front: frontSnap });
      }
      const currentStyle = bouquetStyles[selectedStyleIndex];
      const result = await renderPhotorealisticBouquet({
        occasion: effectiveOccasion,
        styleName: currentStyle?.styleName || '커스텀 스타일',
        components: customComponents,
        wrappingColor,
        ribbonColor,
        snapshotBase64: frontSnap,
      });
      setPhotorealisticUrl(result.imageUrl);
    } finally {
      setIsRenderingPhoto(false);
    }
  };

  const currentStyle = bouquetStyles[selectedStyleIndex];
  const swapCandidates = currentStyle?.swapCandidates || [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F4ED] text-[#2D2A26]">
      {/* Minimal 56px Top Header: Left Logo + Center 3-Step Dot Indicator */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-[#2D2A26]/10 bg-[#F5F4ED] shrink-0">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="text-xl font-bold tracking-tight text-[#2D2A26] font-editorial whitespace-nowrap"
        >
          Darte Flores
        </button>

        {/* Center 3-Step Dot Indicator */}
        <div className="flex items-center gap-2.5" aria-label="진행 단계">
          {([1, 2, 3] as const).map((s) => {
            const isCurrent = step === s;
            const isPassed = step > s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (s === 1) setStep(1);
                  if (s === 2 && analysisResult) setStep(2);
                  if (s === 3 && bouquetStyles.length > 0) setStep(3);
                }}
                disabled={(s === 2 && !analysisResult) || (s === 3 && bouquetStyles.length === 0)}
                className="flex items-center gap-1.5 disabled:cursor-default group"
              >
                <span
                  className={`block rounded-full transition-all ${
                    isCurrent
                      ? 'w-6 h-2 bg-[#BF6C8B]'
                      : isPassed
                      ? 'w-2 h-2 bg-[#BF6C8B]/55'
                      : 'w-2 h-2 bg-[#2D2A26]/20'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Right Minimal Back Link */}
        <div className="w-24 flex justify-end">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev === 3 ? 2 : 1))}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#2D2A26]/70 hover:text-[#2D2A26] transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>이전</span>
            </button>
          )}
        </div>
      </header>

      {/* ==================== STEP 1: 화면 중앙 단일 카드 (상황 입력) ==================== */}
      {step === 1 && (
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-xl bg-[#E7DBC1]/45 border border-[#2D2A26]/10 rounded-2xl p-6 sm:p-8 space-y-7 shadow-xs">
            <div className="text-center space-y-1.5">
              <p className="text-xs font-medium text-[#BF6C8B]">
                다르테 플로레스 — 너에게 꽃을 선물하다
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2D2A26] font-serif-kr">
                어떤 날 선물하는 꽃다발인가요?
              </h1>
            </div>

            {/* 1. 기념일 선택 칩 */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-[#2D2A26]">기념일 선택</label>
              <div className="flex flex-wrap gap-2">
                {OCCASION_PRESETS.map((occ) => {
                  const active = selectedOccasionChip === occ;
                  return (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => setSelectedOccasionChip(occ)}
                      className={`px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#BF6C8B] text-white border-[#BF6C8B]'
                          : 'bg-[#F5F4ED] text-[#2D2A26] border-[#2D2A26]/12 hover:bg-[#E7DBC1]'
                      }`}
                    >
                      {occ}
                    </button>
                  );
                })}
              </div>

              {selectedOccasionChip === '직접 입력' && (
                <input
                  type="text"
                  value={customOccasionText}
                  onChange={(e) => setCustomOccasionText(e.target.value)}
                  placeholder="기념일이나 상황을 입력해 주세요 (예: 전시회 축하, 승진)"
                  className="mt-2 w-full px-4 py-2.5 text-sm bg-[#F5F4ED] border border-[#2D2A26]/20 rounded-xl focus:outline-none focus:border-[#BF6C8B]"
                />
              )}
            </div>

            {/* 2. 예산 슬라이더 */}
            <div className="space-y-2 bg-[#F5F4ED] p-4 rounded-xl border border-[#2D2A26]/10">
              <div className="flex items-center justify-between">
                <label htmlFor="budget-slider" className="text-xs font-bold text-[#2D2A26]">
                  목표 예산
                </label>
                <span className="text-base font-bold text-[#BF6C8B] font-mono-num">
                  {budget.toLocaleString()}원
                </span>
              </div>
              <input
                id="budget-slider"
                type="range"
                min={30000}
                max={150000}
                step={5000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full accent-[#BF6C8B] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#2D2A26]/55 font-mono-num">
                <span>30,000원</span>
                <span>90,000원</span>
                <span>150,000원</span>
              </div>
            </div>

            {/* 3. 분위기 참고 사진 업로드 (선택) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2D2A26]">
                  분위기 참고 사진 <span className="font-normal text-[#2D2A26]/60">(선택)</span>
                </label>
                {uploadedImageBase64 && (
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImageBase64(undefined);
                      setUploadedImageMime(undefined);
                    }}
                    className="text-xs text-[#BF6C8B] hover:underline"
                  >
                    사진 삭제
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {!uploadedImageBase64 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 px-4 border border-dashed border-[#BF6C8B]/50 rounded-xl bg-[#F5F4ED]/70 hover:bg-[#F5F4ED] transition-colors flex items-center justify-center gap-2.5 text-xs text-[#2D2A26]/80"
                >
                  <Upload className="w-4 h-4 text-[#BF6C8B]" />
                  <span>선물 받을 분의 의상이나 장소 분위기 사진 추가하기</span>
                </button>
              ) : (
                <div className="p-3 bg-[#F5F4ED] border border-[#BF6C8B]/40 rounded-xl flex items-center gap-3">
                  <img
                    src={uploadedImageBase64}
                    alt="참고 사진"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover border border-black/10 shrink-0"
                  />
                  <span className="text-xs font-medium text-[#2D2A26]">
                    사진의 색감과 분위기를 분석해 꽃을 추천합니다
                  </span>
                </div>
              )}
            </div>

            {/* 단일 Primary CTA 버튼 */}
            <button
              type="button"
              onClick={handleProceedToStep2}
              disabled={isAnalyzing}
              className="w-full py-4 px-6 bg-[#BF6C8B] text-white font-semibold text-sm rounded-xl hover:bg-[#a85876] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isAnalyzing ? '어울리는 꽃과 꽃말을 찾는 중...' : '맞춤 메인 꽃 추천받기'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      )}

      {/* ==================== STEP 2: 화면 중앙 단일 카드 (메인 꽃 & 꽃말 선택) ==================== */}
      {step === 2 && analysisResult && (
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-xl bg-[#E7DBC1]/45 border border-[#2D2A26]/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="text-center space-y-1.5">
              <p className="text-xs font-medium text-[#BF6C8B]">
                {effectiveOccasion} 맞춤 추천
              </p>
              <h1 className="text-2xl font-bold text-[#2D2A26] font-serif-kr">
                중심이 될 메인 꽃과 꽃말을 선택해 주세요
              </h1>
              <p className="text-xs text-[#2D2A26]/70">{analysisResult.extractedMood}</p>
            </div>

            {/* 무관한 사진 안내 배너 (필요 시) */}
            {analysisResult.isImageRelevant === false && (
              <div className="bg-[#F6A93A]/20 border border-[#F6A93A] rounded-xl p-3 flex items-center gap-2 text-xs text-[#2D2A26]">
                <AlertTriangle className="w-4 h-4 text-[#c96f00] shrink-0" />
                <span>
                  {analysisResult.imageValidationMessage ||
                    `업로드하신 사진에서 분위기 요소를 찾기 어려워 '${effectiveOccasion}' 기준으로 추천해 드렸어요.`}
                </span>
              </div>
            )}

            {/* 꽃 카드 리스트 (Progressive Disclosure: 기본 3요소만 표시, 선택 시 하단 아코디언 확장) */}
            <div className="space-y-2.5">
              {analysisResult.recommendedMainFlowers.map((flower) => {
                const isSelected = selectedMainFlower?.id === flower.id;
                return (
                  <div
                    key={flower.id}
                    onClick={() => setSelectedMainFlower(flower)}
                    className={`cursor-pointer rounded-xl border transition-all overflow-hidden ${
                      isSelected
                        ? 'bg-[#F5F4ED] border-2 border-[#BF6C8B] shadow-xs'
                        : 'bg-[#F5F4ED]/80 border-[#2D2A26]/12 hover:bg-[#F5F4ED]'
                    }`}
                  >
                    {/* 기본 노출 영역: [컬러 원형 스와치] + [꽃 한글 이름] + [꽃말 한 줄 뱃지] */}
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-5 h-5 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: flower.defaultColor }}
                        />
                        <span className="font-serif-kr font-bold text-base text-[#2D2A26] whitespace-nowrap">
                          {flower.nameKo}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full truncate ${
                          isSelected
                            ? 'bg-[#BF6C8B] text-white'
                            : 'bg-[#E7DBC1] text-[#2D2A26]/85'
                        }`}
                      >
                        “{flower.flowerMeaning}”
                      </span>
                    </div>

                    {/* 선택(클릭)했을 때만 부드럽게 펼쳐지는 하단 상세 정보 (추천 이유 + 예상 단가) */}
                    {isSelected && (
                      <div className="px-4 pb-4 pt-2 border-t border-[#2D2A26]/8 bg-[#E7DBC1]/25 space-y-2">
                        <p className="text-xs text-[#2D2A26]/85 leading-relaxed">
                          {flower.reason}
                        </p>
                        <div className="flex items-center justify-between text-xs text-[#2D2A26]/70">
                          <span>
                            대체 가능 꽃: {(flower.alternatives || []).slice(0, 2).join(', ')}
                          </span>
                          <span className="font-mono-num font-semibold text-[#2D2A26]">
                            예상 단가 {flower.estimatedPricePerStem.toLocaleString()}원 / 송이
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 단일 Primary CTA 버튼 */}
            <button
              type="button"
              onClick={handleProceedToStep3}
              disabled={!selectedMainFlower || isGeneratingStyles}
              className="w-full py-4 px-6 bg-[#BF6C8B] text-white font-semibold text-sm rounded-xl hover:bg-[#a85876] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>
                {isGeneratingStyles
                  ? '3D 꽃다발 조합을 생성하는 중...'
                  : `${selectedMainFlower?.nameKo || '선택한 꽃'}으로 3D 꽃다발 만들기`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      )}

      {/* ==================== STEP 3: 좌측 슬림 패널(380px) + 우측 3D 뷰어 통합 ==================== */}
      {step === 3 && (
        <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-56px)] overflow-hidden">
          {/* 좌측 슬림 패널 (380px) */}
          <aside className="w-full lg:w-[380px] shrink-0 bg-[#E7DBC1]/45 border-r border-[#2D2A26]/12 flex flex-col justify-between h-full overflow-hidden">
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* 1) 상단: 3가지 스타일 전환 탭 */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#2D2A26]">
                  스타일 무드 선택
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-[#E7DBC1] rounded-xl">
                  {bouquetStyles.slice(0, 3).map((st, idx) => {
                    const active = selectedStyleIndex === idx;
                    return (
                      <button
                        key={st.styleId}
                        type="button"
                        onClick={() => handleSelectStyleVariation(idx)}
                        className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap truncate ${
                          active
                            ? 'bg-[#F5F4ED] text-[#BF6C8B] shadow-xs'
                            : 'text-[#2D2A26]/70 hover:text-[#2D2A26]'
                        }`}
                      >
                        {STYLE_TAB_LABELS[idx] || `스타일 ${idx + 1}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2) 중단: 컴팩트한 1줄 꽃 슬롯 리스트 + 클릭 시 인라인 서랍(교체 후보 칩 3개) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#2D2A26]">꽃다발 구성</span>
                  <span className="text-[11px] text-[#2D2A26]/60">
                    꽃을 누르면 다른 꽃으로 교체할 수 있어요
                  </span>
                </div>

                <div className="space-y-2">
                  {customComponents.map((slot) => {
                    const isDrawerOpen = openDrawerSlotId === slot.slotId;
                    // Pick 3 distinct swap candidate chips
                    const candidateChips = swapCandidates
                      .filter((c) => c.nameKo !== slot.nameKo)
                      .slice(0, 3);

                    return (
                      <div
                        key={slot.slotId}
                        onMouseEnter={() => setHoveredSlotId(slot.slotId)}
                        onMouseLeave={() => setHoveredSlotId(null)}
                        className={`rounded-xl border transition-all overflow-hidden ${
                          isDrawerOpen
                            ? 'bg-[#F5F4ED] border-[#BF6C8B] shadow-xs'
                            : 'bg-[#F5F4ED]/85 border-[#2D2A26]/10 hover:bg-[#F5F4ED]'
                        }`}
                      >
                        {/* 1줄 컴팩트 행: 좌측 [컬러 점] 꽃 한글 이름 · 꽃말 / 우측 [- 수량 +] */}
                        <div
                          onClick={() =>
                            setOpenDrawerSlotId((prev) =>
                              prev === slot.slotId ? null : slot.slotId
                            )
                          }
                          className="cursor-pointer px-3.5 py-3 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: slot.colorHex }}
                            />
                            <span className="font-bold text-xs text-[#2D2A26] whitespace-nowrap">
                              {slot.nameKo}
                            </span>
                            <span className="text-[11px] text-[#BF6C8B] truncate">
                              · {slot.flowerMeaning}
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-[#2D2A26]/45 shrink-0 ml-auto transition-transform ${
                                isDrawerOpen ? 'rotate-180 text-[#BF6C8B]' : ''
                              }`}
                            />
                          </div>

                          {/* 우측 [- 수량 +] */}
                          <div
                            className="flex items-center gap-1 shrink-0 pl-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleStemCountChange(slot.slotId, -1)}
                              disabled={slot.stemCount <= 1}
                              className="w-6 h-6 rounded-md bg-[#E7DBC1]/80 hover:bg-[#BF6C8B] hover:text-white disabled:opacity-35 flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center font-mono-num text-xs font-bold">
                              {slot.stemCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStemCountChange(slot.slotId, 1)}
                              disabled={slot.stemCount >= 15}
                              className="w-6 h-6 rounded-md bg-[#E7DBC1]/80 hover:bg-[#BF6C8B] hover:text-white disabled:opacity-35 flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* 인라인 서랍(Drawer): 교체 가능한 후보 꽃 칩 3개 */}
                        {isDrawerOpen && (
                          <div className="px-3.5 pb-3 pt-2 border-t border-[#2D2A26]/8 bg-[#E7DBC1]/30 space-y-1.5">
                            <div className="text-[11px] font-medium text-[#2D2A26]/70">
                              다른 꽃으로 바꿔 끼우기
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {candidateChips.map((cand) => (
                                <button
                                  key={cand.slotId}
                                  type="button"
                                  onClick={() =>
                                    handleSwapSlotWithCandidate(slot.slotId, cand)
                                  }
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F5F4ED] border border-[#2D2A26]/12 hover:border-[#BF6C8B] text-xs transition-colors"
                                >
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                                    style={{ backgroundColor: cand.colorHex }}
                                  />
                                  <span className="font-semibold text-[#2D2A26]">
                                    {cand.nameKo}
                                  </span>
                                  <span className="text-[10px] text-[#BF6C8B]">
                                    ({cand.flowerMeaning})
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3) 하단: 포장지 컬러 원형 칩 5개 */}
              <div className="space-y-2 pt-1">
                <span className="block text-xs font-bold text-[#2D2A26]">포장지 컬러</span>
                <div className="flex items-center gap-3">
                  {WRAPPING_COLOR_CHIPS.map((chip) => {
                    const isSelected =
                      wrappingColor.toUpperCase() === chip.hex.toUpperCase();
                    return (
                      <button
                        key={chip.hex}
                        type="button"
                        title={chip.name}
                        onClick={() => {
                          setWrappingColor(chip.hex);
                          setRibbonColor(chip.ribbon);
                          setPhotorealisticUrl(null);
                        }}
                        className={`w-8 h-8 rounded-full border transition-transform ${
                          isSelected
                            ? 'ring-2 ring-[#BF6C8B] ring-offset-2 ring-offset-[#F5F4ED] scale-105 border-black/30'
                            : 'border-black/20 hover:scale-105'
                        }`}
                        style={{ backgroundColor: chip.hex }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 최하단 고정 바: 예상 총액 + [꽃다발 완성 & 주문서 보기 →] 버튼 1개 */}
            <div className="p-4 bg-[#E7DBC1]/85 border-t border-[#2D2A26]/12 space-y-3 shrink-0">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-[#2D2A26]/80">
                  예상 총액 <span className="text-[11px] font-normal">(포장비 7,000원 포함)</span>
                </span>
                <div className="text-right">
                  <span
                    className={`text-lg font-bold font-mono-num ${
                      isOverBudget ? 'text-[#c96f00]' : 'text-[#2D2A26]'
                    }`}
                  >
                    {totalEstimatedCost.toLocaleString()}원
                  </span>
                  {isOverBudget && (
                    <span className="block text-[11px] text-[#c96f00] font-medium">
                      예산보다 +{budgetDiff.toLocaleString()}원
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenFloristGuide}
                className="w-full py-3.5 px-5 bg-[#BF6C8B] text-white font-semibold text-sm rounded-xl hover:bg-[#a85876] transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>꽃다발 완성 & 주문서 보기</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </aside>

          {/* 우측 3D 뷰어 영역 */}
          <section className="flex-1 h-full min-h-[420px] relative bg-[#F5F4ED]">
            <BouquetCanvas3D
              ref={canvas3DRef}
              components={customComponents}
              wrappingColor={wrappingColor}
              ribbonColor={ribbonColor}
              selectedSlotId={openDrawerSlotId}
              hoveredSlotId={hoveredSlotId}
              onSelectSlot={(slotId) => setOpenDrawerSlotId(slotId)}
              onHoverSlot={setHoveredSlotId}
              cameraPreset={cameraPreset}
              onCameraPresetChange={setCameraPreset}
            />
          </section>
        </main>
      )}

      {/* 최종 결과: 단순화된 플로리스트 주문 가이드 모달 */}
      <FloristGuideModal
        isOpen={isFloristModalOpen}
        onClose={() => setIsFloristModalOpen(false)}
        occasion={effectiveOccasion}
        styleName={
          STYLE_TAB_LABELS[selectedStyleIndex] || currentStyle?.styleName || '커스텀 스타일'
        }
        components={customComponents}
        wrappingColor={wrappingColor}
        ribbonColor={ribbonColor}
        budget={budget}
        totalEstimatedCost={totalEstimatedCost}
        snapshots={snapshots}
        photorealisticUrl={photorealisticUrl}
        isRenderingPhoto={isRenderingPhoto}
        onTriggerPhotorealisticRender={handleGeneratePhotorealistic}
      />
    </div>
  );
}
