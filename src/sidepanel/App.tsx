import React from 'react';
import { ChannelHeader } from './components/ChannelHeader';
import { ScanControls } from './components/ScanControls';
import { FilterBar } from './components/FilterBar';
import { MediaGrid } from './components/MediaGrid';
import { DownloadBar } from './components/DownloadBar';

export const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-full bg-[#161823] text-gray-100 select-none overflow-hidden">
      {/* 1. Header tác giả */}
      <ChannelHeader />

      {/* 2. Bộ điều khiển quét */}
      <ScanControls />

      {/* 3. Thanh tìm kiếm & lọc danh mục */}
      <FilterBar />

      {/* 4. Danh sách lưới video */}
      <MediaGrid />

      {/* 5. Thanh hành động tải xuống cố định phía dưới */}
      <DownloadBar />
    </div>
  );
};

export default App;
