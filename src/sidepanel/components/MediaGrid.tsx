import React, { useMemo } from 'react';
import { useMediaStore } from '../store/useMediaStore';
import { MediaItemCard } from './MediaItemCard';
import { Film, SearchX, MousePointerClick } from 'lucide-react';

export const MediaGrid: React.FC = () => {
  const { items, filterType, searchQuery } = useMediaStore();

  // Lọc theo loại và từ khóa tìm kiếm
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Lọc theo loại
      if (filterType === 'video' && item.type !== 'video') return false;
      if (filterType === 'album' && item.type !== 'album') return false;

      // Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = item.title.toLowerCase().includes(query);
        const idMatch = item.id.includes(query);
        return titleMatch || idMatch;
      }

      return true;
    });
  }, [items, filterType, searchQuery]);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400 select-none">
        <div className="w-16 h-16 rounded-2xl bg-[#1F2232] border border-[#2E3347] flex items-center justify-center text-[#FE2C55] mb-4 shadow-inner">
          <Film size={32} />
        </div>
        <h4 className="text-sm font-semibold text-gray-200 mb-1">Chưa có video nào</h4>
        <p className="text-xs text-gray-400 max-w-[260px] leading-relaxed">
          Mở tab một kênh Douyin hoặc TikTok trên trình duyệt, sau đó bấm{' '}
          <strong className="text-white font-medium">"Quét toàn bộ video"</strong> ở trên để bắt đầu lấy dữ liệu.
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#25F4EE] bg-[#171B26] px-3 py-1.5 rounded-full border border-[#2A3144]">
          <MousePointerClick size={13} />
          <span>Hỗ trợ cả Video và Album ảnh chất lượng cao</span>
        </div>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400 select-none">
        <SearchX size={36} className="text-gray-500 mb-3" />
        <h4 className="text-sm font-semibold text-gray-300">Không tìm thấy kết quả</h4>
        <p className="text-xs text-gray-500 mt-1">
          Không có video nào khớp với điều kiện lọc hoặc từ khóa hiện tại.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3.5">
      <div className="grid grid-cols-2 gap-3">
        {filteredItems.map((item) => (
          <MediaItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};
