import React from 'react';
import { useScanner } from '../hooks/useScanner';
import { useMediaStore } from '../store/useMediaStore';
import { Pause, Trash2, Loader2, Sparkles, RotateCcw, ArrowRightLeft } from 'lucide-react';

export const ScanControls: React.FC = () => {
  const { isScanning, scanStatusText, startScan, stopScan, refreshForCurrentTab } = useScanner();
  const { clearAll, items, author, detectedTab } = useMediaStore();

  const handleClear = () => {
    if (items.length === 0) return;
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách đã quét không?')) {
      clearAll();
    }
  };

  // Phát hiện tab trình duyệt đang mở một kênh khác với kênh đã lưu
  const isDifferentTabChannel = Boolean(
    detectedTab?.channelName &&
    author?.name &&
    detectedTab.channelName.toLowerCase() !== author.name.toLowerCase()
  );

  return (
    <div className="bg-[#1A1D2B] px-3.5 py-3 border-b border-[#2E3245] space-y-2.5">
      {/* Alert banner if on a new channel tab */}
      {isDifferentTabChannel && (
        <div className="flex items-center justify-between gap-2 p-2 bg-[#252837] border border-[#25F4EE]/40 rounded-lg text-xs animate-fadeIn">
          <div className="flex items-center gap-1.5 min-w-0">
            <ArrowRightLeft size={14} className="text-[#25F4EE] shrink-0" />
            <span className="truncate text-gray-200 text-[11px]">
              Đang ở kênh mới: <strong className="text-white">{detectedTab?.channelName}</strong>
            </span>
          </div>
          <button
            onClick={refreshForCurrentTab}
            className="shrink-0 px-2 py-1 bg-[#FE2C55] hover:bg-[#FF007A] text-white font-medium text-[11px] rounded shadow transition-all cursor-pointer"
          >
            Chuyển kênh này
          </button>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="flex items-center gap-2">
        {!isScanning ? (
          <button
            onClick={startScan}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#FE2C55] to-[#FF007A] hover:opacity-95 text-white font-semibold py-2.5 px-3 rounded-lg shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all text-xs cursor-pointer"
          >
            <Sparkles size={15} className="text-[#25F4EE]" />
            <span>Quét toàn bộ video</span>
          </button>
        ) : (
          <button
            onClick={stopScan}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2.5 px-3 rounded-lg shadow-md active:scale-[0.98] transition-all text-xs cursor-pointer"
          >
            <Pause size={15} />
            <span>Tạm dừng quét</span>
          </button>
        )}

        {/* Nút Làm Mới để quét kênh mới */}
        <button
          onClick={refreshForCurrentTab}
          title="Làm mới danh sách (Xóa video cũ để quét kênh mới)"
          disabled={isScanning}
          className="flex items-center gap-1 px-3 py-2.5 bg-[#252837] hover:bg-[#32364A] text-gray-200 hover:text-white rounded-lg border border-[#3A3F58] font-medium text-xs transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-sm"
        >
          <RotateCcw size={14} className="text-[#25F4EE]" />
          <span>Làm mới</span>
        </button>

        {/* Nút Xóa */}
        <button
          onClick={handleClear}
          title="Xóa toàn bộ danh sách"
          disabled={items.length === 0 || isScanning}
          className="p-2.5 bg-[#252837] hover:bg-red-500/20 hover:text-red-400 text-gray-400 rounded-lg border border-[#34384E] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Dynamic Status Bar */}
      <div className="flex items-center gap-2 text-xs py-1.5 px-2.5 bg-[#141622] rounded-md border border-[#262A3C]">
        <div className="relative flex items-center justify-center w-2.5 h-2.5">
          {isScanning ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25F4EE] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25F4EE]"></span>
            </>
          ) : (
            <span className="inline-flex rounded-full h-2 w-2 bg-gray-500"></span>
          )}
        </div>
        <span className="text-gray-300 truncate text-[11px] font-medium flex-1">
          {scanStatusText}
        </span>
        {isScanning && (
          <Loader2 size={13} className="text-[#25F4EE] animate-spin shrink-0" />
        )}
      </div>
    </div>
  );
};
