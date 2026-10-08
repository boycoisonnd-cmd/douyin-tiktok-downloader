import React from 'react';
import { useMediaStore } from '../store/useMediaStore';
import { useScanner } from '../hooks/useScanner';
import { Video, Image, CheckCircle2, User, RotateCcw } from 'lucide-react';

export const ChannelHeader: React.FC = () => {
  const { author, platform, items } = useMediaStore();
  const { refreshForCurrentTab } = useScanner();

  const totalItems = items.length;
  const videoCount = items.filter((i) => i.type === 'video').length;
  const albumCount = items.filter((i) => i.type === 'album').length;
  const completedCount = items.filter((i) => i.downloadStatus === 'completed').length;

  return (
    <div className="bg-[#1F2232] border-b border-[#2E3245] p-3.5 shadow-md">
      <div className="flex items-center gap-3">
        {/* Avatar with gradient ring */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-[#25F4EE] via-[#FE2C55] to-[#FF007A]">
            {author?.avatar ? (
              <img
                src={author.avatar}
                alt={author.name}
                className="w-full h-full rounded-full object-cover bg-gray-800"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
                <User size={22} />
              </div>
            )}
          </div>
          {platform && (
            <span
              className={`absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-white shadow ${
                platform === 'douyin' ? 'bg-[#FE2C55]' : 'bg-black border border-gray-600'
              }`}
            >
              {platform}
            </span>
          )}
        </div>

        {/* Channel info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white truncate leading-tight">
              {author?.name || 'Chưa phát hiện kênh'}
            </h2>
            <button
              onClick={refreshForCurrentTab}
              title="Làm mới thông tin kênh từ tab hiện tại"
              className="p-1 text-gray-400 hover:text-[#25F4EE] hover:bg-[#2A2E40] rounded transition-all cursor-pointer"
            >
              <RotateCcw size={13} />
            </button>
          </div>
          <p className="text-[11px] text-gray-400 truncate mt-0.5">
            {author?.uniqueId ? `@${author.uniqueId}` : (author?.id ? `ID: ${author.id}` : 'Mở tab Douyin/TikTok để bắt đầu')}
          </p>
        </div>
      </div>

      {/* Mini stats counters */}
      <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-[#2A2E40] text-center">
        <div className="bg-[#161823] py-1 px-1.5 rounded">
          <div className="text-[10px] text-gray-400">Tổng quét</div>
          <div className="text-xs font-bold text-white">{totalItems}</div>
        </div>
        <div className="bg-[#161823] py-1 px-1.5 rounded flex flex-col items-center">
          <div className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Video size={10} className="text-[#25F4EE]" /> Video
          </div>
          <div className="text-xs font-bold text-[#25F4EE]">{videoCount}</div>
        </div>
        <div className="bg-[#161823] py-1 px-1.5 rounded flex flex-col items-center">
          <div className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Image size={10} className="text-[#FE2C55]" /> Album
          </div>
          <div className="text-xs font-bold text-[#FE2C55]">{albumCount}</div>
        </div>
        <div className="bg-[#161823] py-1 px-1.5 rounded flex flex-col items-center">
          <div className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <CheckCircle2 size={10} className="text-emerald-400" /> Đã tải
          </div>
          <div className="text-xs font-bold text-emerald-400">{completedCount}</div>
        </div>
      </div>
    </div>
  );
};
