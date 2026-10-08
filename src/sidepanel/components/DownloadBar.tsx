import React from 'react';
import { useMediaStore } from '../store/useMediaStore';
import { useDownloader } from '../hooks/useDownloader';
import { Download, FolderDown, XCircle, SlidersHorizontal, CheckCircle2, AlertTriangle } from 'lucide-react';

export const DownloadBar: React.FC = () => {
  const { items, selectedIds, concurrency, setConcurrency } = useMediaStore();
  const { isDownloading, queueStatus, startBatchDownload, cancelDownload } = useDownloader();

  const selectedCount = selectedIds.size;
  const totalCount = items.length;

  return (
    <div className="bg-[#191C28] border-t border-[#2E3347] p-3 shadow-2xl">
      {/* Downloading Overall Progress State */}
      {isDownloading && queueStatus && (
        <div className="mb-2.5 bg-[#12141E] p-2.5 rounded-lg border border-[#2B3044]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <FolderDown size={14} className="text-[#25F4EE]" />
              Đang tải {queueStatus.completed}/{queueStatus.total} mục
            </span>
            <span className="font-bold text-[#25F4EE]">{queueStatus.overallProgress}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#25F4EE] via-[#FE2C55] to-[#FF007A] h-full transition-all duration-300"
              style={{ width: `${queueStatus.overallProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={11} /> {queueStatus.completed} xong
              </span>
              {queueStatus.failed > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <AlertTriangle size={11} /> {queueStatus.failed} lỗi
                </span>
              )}
            </div>

            <button
              onClick={cancelDownload}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 font-medium px-2 py-0.5 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <XCircle size={12} /> Hủy tải
            </button>
          </div>
        </div>
      )}

      {/* Main Download Action Row */}
      <div className="flex items-center gap-2">
        {/* Concurrency Selector */}
        <div className="flex items-center gap-1 bg-[#12141E] border border-[#2B3044] rounded-lg px-2 py-1.5 text-xs">
          <SlidersHorizontal size={13} className="text-gray-400" />
          <select
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
            disabled={isDownloading}
            title="Số luồng tải cùng lúc"
            className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer"
          >
            <option value={2} className="bg-[#191C28]">2 luồng</option>
            <option value={3} className="bg-[#191C28]">3 luồng</option>
            <option value={5} className="bg-[#191C28]">5 luồng</option>
            <option value={8} className="bg-[#191C28]">8 luồng</option>
          </select>
        </div>

        {/* Big Batch Download Button */}
        <button
          onClick={startBatchDownload}
          disabled={selectedCount === 0 || isDownloading}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#FE2C55] to-[#FF007A] hover:brightness-110 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-lg shadow-lg shadow-red-500/25 transition-all text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
        >
          <Download size={16} />
          <span>
            {isDownloading
              ? 'Đang tải hàng loạt...'
              : `Tải xuống (${selectedCount} mục)`}
          </span>
        </button>
      </div>

      {/* Subtext info */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 px-1">
        <span>Đã chọn: <strong className="text-white">{selectedCount}</strong> / {totalCount} video</span>
        <span className="text-gray-500">Tự động mở cửa sổ chọn thư mục</span>
      </div>
    </div>
  );
};
