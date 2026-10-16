import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  MessageSquareHeart,
  Printer,
  Sparkles,
  X,
} from 'lucide-react';
import { BouquetComponentSlot, BouquetSnapshotSet, WRAPPING_FEE } from '../types';

interface FloristGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  occasion: string;
  styleName: string;
  components: BouquetComponentSlot[];
  wrappingColor: string;
  ribbonColor: string;
  budget: number;
  totalEstimatedCost: number;
  snapshots: BouquetSnapshotSet;
  photorealisticUrl: string | null;
  isRenderingPhoto: boolean;
  onTriggerPhotorealisticRender: () => Promise<void>;
}

const ROLE_LABEL_MAP: Record<string, string> = {
  MAIN: '메인 꽃',
  SUB: '서브 꽃',
  FILLER: '필러 꽃',
  GREENERY: '그리너리',
};

export const FloristGuideModal: React.FC<FloristGuideModalProps> = ({
  isOpen,
  onClose,
  occasion,
  styleName,
  components,
  wrappingColor,
  ribbonColor,
  budget,
  totalEstimatedCost,
  snapshots,
  photorealisticUrl,
  isRenderingPhoto,
  onTriggerPhotorealisticRender,
}) => {
  const [copied, setCopied] = useState(false);
  const [previewTab, setPreviewTab] = useState<'3d' | 'ai'>('3d');
  const [renderProgress, setRenderProgress] = useState(0);

  useEffect(() => {
    if (!isRenderingPhoto) {
      setRenderProgress(0);
      return;
    }
    setRenderProgress(8);
    const interval = setInterval(() => {
      setRenderProgress((prev) => {
        if (prev >= 94) return prev;
        const step = prev < 45 ? 5 : prev < 75 ? 3 : 1;
        return Math.min(94, prev + step);
      });
    }, 220);
    return () => clearInterval(interval);
  }, [isRenderingPhoto]);

  if (!isOpen) return null;

  const mainSlot = components.find((c) => c.role === 'MAIN') || components[0];
  const mainFlowerName = mainSlot ? mainSlot.nameKo : '메인 꽃';
  const mainAlternativesText =
    mainSlot && mainSlot.alternatives && mainSlot.alternatives.length > 0
      ? mainSlot.alternatives.slice(0, 2).join(', ')
      : '하노이 라넌큘러스, 가든 로즈';

  const renderStages = [
    `3D 꽃다발 정면 구도 및 포장지(${wrappingColor}) 스캔`,
    `메인 꽃(${mainFlowerName})과 서브·필러 꽃잎 질감 렌더링`,
    `자연광 플로럴 스튜디오 조명 및 색감 보정 마무리`,
  ];
  const activeStageIndex = renderProgress < 38 ? 0 : renderProgress < 74 ? 1 : 2;

  const handleSwitchToAiTab = async () => {
    setPreviewTab('ai');
    if (!photorealisticUrl && !isRenderingPhoto) {
      await onTriggerPhotorealisticRender();
    }
  };

  const handleCopyOrderText = () => {
    const lines = [
      `[Darte Flores 플로리스트 주문 가이드]`,
      `• 기념일: ${occasion} (${styleName})`,
      `• 예상 금액: ${totalEstimatedCost.toLocaleString()}원 (포장비 ${WRAPPING_FEE.toLocaleString()}원 포함 / 예산 ${budget.toLocaleString()}원)`,
      `• 포장지 컬러: ${wrappingColor}`,
      ``,
      `[플로리스트님께 드리는 요청 말씀]`,
      `"레퍼런스 이미지의 전체적인 분위기와 컬러감을 가장 중요하게 생각합니다. 메인 꽃(${mainFlowerName})과 서브 꽃 구성을 희망하지만, 재고가 없다면 아래 대체 꽃(메인 대체: ${mainAlternativesText})으로 비슷한 색감과 볼륨감으로 제작 부탁드립니다!"`,
      ``,
      `[꽃 구성 및 대체 꽃]`,
      ...components.map(
        (c) =>
          `- [${ROLE_LABEL_MAP[c.role]}] ${c.nameKo} ${c.stemCount}송이 (${c.flowerMeaning}) | 대체: ${c.alternatives.slice(0, 2).join(', ')}`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2A26]/60 p-4 overflow-hidden">
      <div className="relative w-full max-w-2xl bg-[#F5F4ED] border border-[#E7DBC1] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Clean Modal Header */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 bg-[#E7DBC1]/60 border-b border-[#2D2A26]/10 shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#2D2A26] font-serif-kr">
              플로리스트 주문 가이드
            </h2>
            <p className="text-xs text-[#2D2A26]/65">
              {occasion} · {styleName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 text-[#2D2A26]/70 hover:text-[#2D2A26] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Top Segmented Toggle: [3D 스냅샷 보기 | ✨ AI 실사 사진 생성하기] */}
          <div className="space-y-2.5">
            <div className="no-print flex items-center p-1 bg-[#E7DBC1] rounded-xl">
              <button
                type="button"
                onClick={() => setPreviewTab('3d')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  previewTab === '3d'
                    ? 'bg-[#F5F4ED] text-[#2D2A26] shadow-xs'
                    : 'text-[#2D2A26]/70 hover:text-[#2D2A26]'
                }`}
              >
                3D 스냅샷 보기
              </button>
              <button
                type="button"
                onClick={handleSwitchToAiTab}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  previewTab === 'ai'
                    ? 'bg-[#BF6C8B] text-white shadow-xs'
                    : 'text-[#2D2A26]/70 hover:text-[#2D2A26]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {photorealisticUrl ? '✨ AI 실사 사진 보기' : '✨ AI 실사 사진 생성하기'}
                </span>
              </button>
            </div>

            {/* Visual Reference Frame */}
            <div className="aspect-16/10 w-full bg-[#DFD6C7] rounded-xl overflow-hidden border border-[#2D2A26]/10 flex items-center justify-center relative">
              {previewTab === '3d' ? (
                snapshots.front ? (
                  <img
                    src={snapshots.front}
                    alt="3D 꽃다발 스냅샷"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain bg-[#DFD6C7]"
                  />
                ) : (
                  <span className="text-xs text-[#2D2A26]/50">3D 스냅샷 이미지</span>
                )
              ) : isRenderingPhoto ? (
                <div className="w-full max-w-md mx-auto p-5 bg-[#F5F4ED]/95 border border-[#BF6C8B]/30 rounded-xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#2D2A26] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#BF6C8B] animate-pulse" />
                      AI 실사 꽃다발 렌더링 진행 중
                    </span>
                    <span className="font-mono-num font-bold text-[#BF6C8B]">
                      {renderProgress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-[#E7DBC1] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#BF6C8B] rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>

                  {/* Step Checklist */}
                  <div className="space-y-1.5 pt-0.5">
                    {renderStages.map((label, idx) => {
                      const isDone = idx < activeStageIndex;
                      const isCurrent = idx === activeStageIndex;
                      return (
                        <div
                          key={label}
                          className={`flex items-center gap-2 text-[11px] transition-colors ${
                            isCurrent
                              ? 'text-[#2D2A26] font-semibold'
                              : isDone
                              ? 'text-[#2D2A26]/65'
                              : 'text-[#2D2A26]/35'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#5c7a52] shrink-0" />
                          ) : isCurrent ? (
                            <Loader2 className="w-3.5 h-3.5 text-[#BF6C8B] animate-spin shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-[#2D2A26]/25 shrink-0" />
                          )}
                          <span className="truncate">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : photorealisticUrl ? (
                <img
                  src={photorealisticUrl}
                  alt="AI 실사 꽃다발"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <button
                  type="button"
                  onClick={onTriggerPhotorealisticRender}
                  className="px-4 py-2.5 bg-[#BF6C8B] text-white text-xs font-semibold rounded-lg hover:bg-[#a85876] transition-colors"
                >
                  ✨ AI 실사 사진 생성하기
                </button>
              )}
            </div>
          </div>

          {/* Florist Request Note Callout */}
          <div className="bg-[#E7DBC1]/55 border border-[#BF6C8B]/35 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#BF6C8B]">
              <MessageSquareHeart className="w-4 h-4 shrink-0" />
              <span>플로리스트님께 드리는 요청 말씀</span>
            </div>
            <p className="text-xs text-[#2D2A26] leading-relaxed font-serif-kr">
              “위 레퍼런스 이미지의 <strong>전체적인 분위기(무드)와 컬러감</strong>을 가장 중요하게 생각합니다.{' '}
              <strong>메인 꽃({mainFlowerName})</strong>과 서브 꽃 구성을 희망하지만, 매장에 재고가 없다면 아래 표기된{' '}
              <strong>대체 꽃(메인 대체: {mainAlternativesText})</strong>을 사용해 최대한 비슷한 색상 조합과 볼륨감으로 제작해 주세요!”
            </p>
          </div>

          {/* Compact Bouquet Composition & Alternatives List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#2D2A26]">꽃다발 구성 및 대체 꽃 가이드</span>
              <span className="font-mono-num font-bold text-[#BF6C8B]">
                총 예상 {totalEstimatedCost.toLocaleString()}원{' '}
                <span className="font-normal text-[#2D2A26]/60">
                  (포장비 {WRAPPING_FEE.toLocaleString()}원 포함)
                </span>
              </span>
            </div>

            <div className="divide-y divide-[#2D2A26]/10 border border-[#2D2A26]/12 rounded-xl bg-[#F5F4ED] overflow-hidden">
              {components.map((slot) => (
                <div
                  key={slot.slotId}
                  className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: slot.colorHex }}
                    />
                    <div>
                      <div className="font-bold text-[#2D2A26]">
                        [{ROLE_LABEL_MAP[slot.role]}] {slot.nameKo} · {slot.stemCount}송이
                      </div>
                      <div className="text-[#BF6C8B] text-[11px] mt-0.5">
                        꽃말: “{slot.flowerMeaning}”
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] bg-[#CCDFAA]/45 text-[#2D2A26] px-2.5 py-1 rounded-md shrink-0">
                    <strong>대체 꽃:</strong> {slot.alternatives.slice(0, 2).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clean Modal Footer Actions */}
        <div className="no-print px-6 py-4 bg-[#E7DBC1]/50 border-t border-[#2D2A26]/10 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyOrderText}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-[#F5F4ED] text-[#2D2A26] border border-[#2D2A26]/15 rounded-xl hover:bg-[#E7DBC1] transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-[#5c7a52]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '주문 텍스트 복사 완료' : '꽃집 문의용 텍스트 복사'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold bg-[#BF6C8B] text-white rounded-xl hover:bg-[#a85876] transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>인쇄 / PDF 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
};
