import React from 'react';
import { useMediaStore } from '../store/useMediaStore';
import { Search, CheckSquare, Square, X } from 'lucide-react';

export const FilterBar: React.FC = () => {
  const {
    items,
    selectedIds,
    filterType,
    searchQuery,
    setFilterType,
    setSearchQuery,
    selectAll,
  } = useMediaStore();

  const totalCount = items.length;
  const videoCount = items.filter((i) => i.type === 'video').length;
  const albumCount = items.filter((i) => i.type === 'album').length;

  const isAllSelected = totalCount > 0 && selectedIds.size === totalCount;
  const isNoneSelected = selectedIds.size === 0;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      selectAll(false);
    } else {
      selectAll(true);
    }
  };

  return (
    <div className="bg-[#181B27] px-3.5 py-2.5 border-b border-[#2A2E40] space-y-2">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm theo tiêu đề video..."
          className="w-full pl-8 pr-7 py-1.5 bg-[#12141D] text-xs text-gray-200 placeholder-gray-500 rounded-md border border-[#2E3348] focus:outline-none focus:border-[#FE2C55] transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 text-gray-400 hover:text-gray-200 p-0.5 cursor-pointer"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filter Tabs and Select All toggle */}
      <div className="flex items-center justify-between text-xs">
        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1 bg-[#12141E] p-0.5 rounded-md border border-[#272B3C]">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-[#FE2C55] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filterType === 'video'
                ? 'bg-[#FE2C55] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Video ({videoCount})
          </button>
          <button
            onClick={() => setFilterType('album')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filterType === 'album'
                ? 'bg-[#FE2C55] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Ảnh ({albumCount})
          </button>
        </div>

        {/* Select All Checkbox */}
        <button
          onClick={handleToggleSelectAll}
          disabled={totalCount === 0}
          className="flex items-center gap-1.5 text-[11px] text-gray-300 hover:text-white px-2 py-1 rounded hover:bg-[#252838] transition-colors disabled:opacity-40 cursor-pointer"
        >
          {isAllSelected ? (
            <CheckSquare size={14} className="text-[#FE2C55]" />
          ) : (
            <Square size={14} className="text-gray-400" />
          )}
          <span>{isAllSelected ? 'Bỏ chọn' : 'Chọn hết'}</span>
        </button>
      </div>
    </div>
  );
};
