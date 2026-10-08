import React from 'react';
import { useMediaStore } from '../store/useMediaStore';
import { useScanner } from '../hooks/useScanner';
import { Video, Image, CheckCircle2, User, RotateCcw } from 'lucide-react';

export const ChannelHeader: React.FC = () => {
  const { author, platform, items, detectedTab } = useMediaStore();
  const { refreshForCurrentTab } = useScanner();

  const totalItems = items.length;
  const videoCount = items.filter((i) => i.type === 'video').length;
  const albumCount = items.filter((i) => i.type === 'album').length;
  const completedCount = items.filter((i) => i.downloadStatus === 'completed').length;

  const currentPlatform = platform || detectedTab?.platform || null;
  const currentAuthor = author || (detectedTab?.platform ? {
    id: detectedTab.channelId || '',
    uniqueId: detectedTab.channelId || '',
    name: detectedTab.channelName || detectedTab.channelId || 'Kênh mạng xã hội',
    avatar: detectedTab.channelAvatar || '',
    verified: false,
  } : null);

  const getPlatformInfo = (plat: string | null) => {
    switch (plat) {
      case 'douyin':
        return { label: 'Douyin', badgeClass: 'bg-[#FE2C55] text-white', ringClass: 'from-[#25F4EE] via-[#FE2C55] to-[#FF007A]' };
      case 'tiktok':
        return { label: 'TikTok', badgeClass: 'bg-black text-[#00F2FE] border border-gray-700', ringClass: 'from-[#00F2FE] via-black to-[#FE2C55]' };
      case 'instagram':
        return { label: 'Instagram', badgeClass: 'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white', ringClass: 'from-[#F58529] via-[#DD2A7B] to-[#8134AF]' };
      case 'x':
        return { label: 'X', badgeClass: 'bg-black text-white border border-[#1D9BF0]', ringClass: 'from-[#1D9BF0] to-gray-800' };
      case 'youtube':
        return { label: 'YouTube', badgeClass: 'bg-[#FF0000] text-white', ringClass: 'from-[#FF0000] to-red-800' };
      case 'facebook':
        return { label: 'Facebook', badgeClass: 'bg-[#1877F2] text-white', ringClass: 'from-[#1877F2] via-[#0866FF] to-blue-900' };
      case 'threads':
        return { label: 'Threads', badgeClass: 'bg-black text-white border border-gray-600', ringClass: 'from-neutral-100 via-neutral-500 to-black' };
      default:
        return { label: '', badgeClass: 'bg-gray-700 text-gray-200', ringClass: 'from-[#25F4EE] via-[#FE2C55] to-[#FF007A]' };
    }
  };

  const platformInfo = getPlatformInfo(currentPlatform);

  return (
    <div className="bg-[#1F2232] border-b border-[#2E3245] p-3.5 shadow-md">
      <div className="flex items-center gap-3">
        {/* Avatar with gradient ring */}
        <div className="relative">
          <div className={`w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr ${platformInfo.ringClass}`}>
            {currentAuthor?.avatar ? (
              <img
                src={currentAuthor.avatar}
                alt={currentAuthor.name}
                className="w-full h-full rounded-full object-cover bg-gray-800"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
                <User size={22} />
              </div>
            )}
          </div>
          {currentPlatform && (
            <span
              className={`absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow ${platformInfo.badgeClass}`}
            >
              {platformInfo.label}
            </span>
          )}
        </div>

        {/* Channel info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-sm font-bold text-white truncate leading-tight">
                {typeof currentAuthor?.name === 'string' ? currentAuthor.name : (currentAuthor?.name ? String(currentAuthor.name) : 'Chưa phát hiện kênh')}
              </h2>
              {currentAuthor?.verified && (
                <span title="Tài khoản đã xác minh" className="text-sky-400 shrink-0">
                  <CheckCircle2 size={13} className="fill-sky-400/20" />
                </span>
              )}
            </div>
            <button
              onClick={refreshForCurrentTab}
              title="Làm mới thông tin kênh từ tab hiện tại"
              className="p-1 text-gray-400 hover:text-[#25F4EE] hover:bg-[#2A2E40] rounded transition-all cursor-pointer"
            >
              <RotateCcw size={13} />
            </button>
          </div>
          <p className="text-[11px] text-gray-400 truncate mt-0.5">
            {typeof currentAuthor?.uniqueId === 'string' && currentAuthor.uniqueId
              ? (currentAuthor.uniqueId.startsWith('@') ? currentAuthor.uniqueId : `@${currentAuthor.uniqueId}`)
              : typeof currentAuthor?.id === 'string' && currentAuthor.id
              ? (currentAuthor.id.startsWith('@') ? currentAuthor.id : `ID: ${currentAuthor.id}`)
              : 'Mở tab Douyin, TikTok, IG, X, YouTube, FB hoặc Threads'}
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
