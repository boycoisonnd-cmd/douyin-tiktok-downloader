import React from 'react';
import { MediaItem } from '../../core/parsers/parser.interface';
import { useMediaStore } from '../store/useMediaStore';
import { useDownloader } from '../hooks/useDownloader';
import {
  Heart,
  MessageCircle,
  Clock,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatNumber, formatDuration, formatDate } from '../../utils/formatters';

interface MediaItemCardProps {
  item: MediaItem;
}

export const MediaItemCard: React.FC<MediaItemCardProps> = ({ item }) => {
  const { selectedIds, toggleSelect } = useMediaStore();
  const { downloadSingleItem } = useDownloader();

  const isSelected = selectedIds.has(item.id);
  const isVideo = item.type === 'video';

  const getPlatformBadge = (platform?: string) => {
    switch (platform) {
      case 'douyin':
        return { label: 'Douyin', className: 'bg-[#FE2C55] text-white' };
      case 'tiktok':
        return { label: 'TikTok', className: 'bg-black text-[#00F2FE] border border-gray-700' };
      case 'instagram':
        return { label: 'Instagram', className: 'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white' };
      case 'x':
        return { label: 'X', className: 'bg-black text-[#1D9BF0] border border-[#1D9BF0]' };
      case 'youtube':
        return { label: 'YouTube', className: 'bg-[#FF0000] text-white' };
      case 'facebook':
        return { label: 'Facebook', className: 'bg-[#1877F2] text-white' };
      case 'threads':
        return { label: 'Threads', className: 'bg-black text-white border border-gray-600' };
      default:
        return null;
    }
  };

  const platformBadge = getPlatformBadge(item.platform);

  return (
    <div
      onClick={() => toggleSelect(item.id)}
      className={`group relative flex flex-col bg-[#1A1D2B] rounded-lg overflow-hidden border transition-all duration-200 cursor-pointer select-none ${
        isSelected
          ? 'border-[#FE2C55] ring-1 ring-[#FE2C55]/60 shadow-lg shadow-red-500/10'
          : 'border-[#2E3347] hover:border-gray-500 hover:shadow-md'
      }`}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-[9/12] w-full bg-[#12141D] overflow-hidden">
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            Không có ảnh bìa
          </div>
        )}

        {/* Dark gradient overlay on thumbnail bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Selection Checkbox & Platform Badge (Top Left) */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
          <div
            className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-[#FE2C55] text-white shadow'
                : 'bg-black/60 border border-white/50 group-hover:border-white text-transparent'
            }`}
          >
            <svg
              className="w-3.5 h-3.5 fill-current"
              viewBox="0 0 20 20"
            >
              <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
            </svg>
          </div>

          {platformBadge && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow backdrop-blur-sm ${platformBadge.className}`}
            >
              {platformBadge.label}
            </span>
          )}
        </div>

        {/* Single Quick Download Button (Top Right) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadSingleItem(item);
          }}
          title="Tải nhanh video này"
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-[#FE2C55] text-white backdrop-blur-sm transition-all opacity-80 group-hover:opacity-100 hover:scale-110 cursor-pointer"
        >
          <Download size={13} />
        </button>

        {/* Badges: Type & Resolution */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none text-[10px]">
          {/* Left badge: HD / Quality label / Album count */}
          <span className="flex items-center gap-1 bg-black/75 backdrop-blur-sm text-[#25F4EE] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
            {isVideo ? <Sparkles size={9} /> : <Layers size={9} className="text-[#FE2C55]" />}
            <span>
              {item.qualityLabel ||
                (isVideo
                  ? item.videoDetails?.height && item.videoDetails.height >= 1080
                    ? '1080P'
                    : 'HD'
                  : `${(item.albumDetails?.mixedMedia?.length || item.albumDetails?.imageUrls?.length || 1)} mục`)}
            </span>
          </span>

          {/* Right badge: Duration */}
          {isVideo && item.duration > 0 && (
            <span className="flex items-center gap-0.5 bg-black/75 backdrop-blur-sm text-gray-200 px-1.5 py-0.5 rounded font-medium">
              <Clock size={9} />
              {formatDuration(item.duration)}
            </span>
          )}
        </div>

        {/* Download State Overlay (Active downloading / Completed / Error) */}
        {item.downloadStatus === 'downloading' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-3 z-20">
            <Loader2 size={24} className="text-[#25F4EE] animate-spin mb-2" />
            <div className="text-xs font-bold text-[#25F4EE]">{item.progress}%</div>
            <div className="text-[10px] text-gray-300 mt-1">{item.downloadSpeed || 'Đang tải...'}</div>
            {/* Progress bar */}
            <div className="w-full bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] h-full transition-all duration-300"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        )}

        {item.downloadStatus === 'queued' && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-2 z-20">
            <Clock size={20} className="text-amber-400 mb-1" />
            <span className="text-[11px] text-amber-200 font-medium">Đang trong hàng đợi...</span>
          </div>
        )}

        {item.downloadStatus === 'completed' && (
          <div className="absolute top-2 right-9 z-10 flex items-center gap-1 bg-emerald-500/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full shadow">
            <CheckCircle2 size={11} />
            <span>Đã tải</span>
          </div>
        )}

        {item.downloadStatus === 'error' && (
          <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center p-2 z-20 text-center">
            <AlertCircle size={22} className="text-red-400 mb-1" />
            <span className="text-[10px] text-red-200 font-medium line-clamp-2">
              {item.errorMessage || 'Lỗi tải'}
            </span>
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <h3
          title={item.title}
          className="text-xs text-gray-200 font-medium line-clamp-2 leading-snug group-hover:text-white"
        >
          {item.title || 'Không có tiêu đề'}
        </h3>

        {/* Stats footer */}
        <div className="mt-2 pt-2 border-t border-[#252839] flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <Heart size={11} className="text-rose-500 fill-rose-500/20" />
            <span>{formatNumber(item.stats.diggCount)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle size={11} className="text-sky-400" />
            <span>{formatNumber(item.stats.commentCount)}</span>
          </div>
          <span className="text-gray-500">{formatDate(item.createTime)}</span>
        </div>
      </div>
    </div>
  );
};
