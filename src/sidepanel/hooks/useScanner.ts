import { useEffect, useCallback } from 'react';
import { useMediaStore } from '../store/useMediaStore';

export function useScanner() {
  const {
    isScanning,
    scanStatusText,
    setScanning,
    addItems,
    loadSavedData,
    setDetectedTab,
    resetForNewChannel,
  } = useMediaStore();

  // Nạp dữ liệu đã lưu từ IndexedDB khi mở Side Panel
  useEffect(() => {
    loadSavedData();
  }, [loadSavedData]);

  // Lắng nghe message từ Content Scripts
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) {
      return;
    }

    const handleMessage = (message: any) => {
      if (message.type === 'MEDIA_ITEMS_CAPTURED') {
        const { items, author, platform } = message.payload;
        if (Array.isArray(items) && items.length > 0) {
          addItems(items, author, platform);
        }
      } else if (message.type === 'SCAN_STATUS_CHANGED') {
        const { status, message: statusMsg } = message.payload;
        if (status === 'stopped' || status === 'captcha_detected') {
          setScanning(false, statusMsg);
        } else if (status === 'running') {
          setScanning(true, statusMsg);
        } else if (status === 'paused') {
          setScanning(false, statusMsg);
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [addItems, setScanning]);

  // Kiểm tra tab hiện tại khi mở Panel hoặc chuyển tab
  const checkActiveTab = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      return;
    }
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' }, (response) => {
          if (chrome.runtime?.lastError) {
            return;
          }
          if (response?.success) {
            setDetectedTab({
              channelName: response.channelName,
              channelAvatar: response.channelAvatar,
              channelId: response.channelId,
              platform: response.platform,
              url: response.url,
            });

            if (response.isScanning) {
              setScanning(true, 'Đang tự động cuộn trang quét video...');
            }
          }
        });
      }
    } catch (e) {}
  }, [setScanning, setDetectedTab]);

  useEffect(() => {
    checkActiveTab();

    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    const handleTabActivated = () => {
      checkActiveTab();
    };

    const handleTabUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.status === 'complete' || changeInfo.url) {
        checkActiveTab();
      }
    };

    chrome.tabs.onActivated?.addListener(handleTabActivated);
    chrome.tabs.onUpdated?.addListener(handleTabUpdated);

    return () => {
      chrome.tabs.onActivated?.removeListener(handleTabActivated);
      chrome.tabs.onUpdated?.removeListener(handleTabUpdated);
    };
  }, [checkActiveTab]);

  // Dừng quét
  const stopScan = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      setScanning(false, 'Đã dừng quét mô phỏng');
      return;
    }
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'STOP_AUTO_SCROLL' }, () => {
          setScanning(false, 'Đã tạm dừng quét');
        });
      } else {
        setScanning(false, 'Đã tạm dừng quét');
      }
    } catch (err) {
      setScanning(false, 'Đã tạm dừng quét');
    }
  }, [setScanning]);

  // Làm mới lại toàn bộ danh sách để sẵn sàng quét kênh trên tab hiện tại
  const refreshForCurrentTab = useCallback(async () => {
    // Dừng cuộn trang
    await stopScan();

    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      await resetForNewChannel();
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' }, async (response) => {
          if (response?.success) {
            let newAuthor = undefined;
            if (response.channelName || response.channelId) {
              newAuthor = {
                id: response.channelId || '',
                name: response.channelName || 'Kênh mới',
                avatar: response.channelAvatar || '',
              };
            }
            await resetForNewChannel(newAuthor, response.platform);
          } else {
            await resetForNewChannel();
          }
        });
      } else {
        await resetForNewChannel();
      }
    } catch (e) {
      await resetForNewChannel();
    }
  }, [stopScan, resetForNewChannel]);

  // Bắt đầu quét tự động
  const startScan = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      // Khi test trực tiếp trên trình duyệt ngoài extension: nạp mock data để kiểm thử trực quan giao diện
      setScanning(true, 'Đang chạy quét mô phỏng (Test Mode)...');
      setTimeout(() => {
        addItems([
          {
            id: '7355001122334455667',
            platform: 'douyin',
            type: 'video',
            title: 'Video test 1: Douyin 1080P siêu nét không watermark',
            coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80',
            duration: 48,
            stats: { diggCount: 154200, commentCount: 3820, shareCount: 1250 },
            author: { id: 'douyin_creator_01', name: 'Triệu Lệ Dĩnh Official', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80' },
            videoDetails: { downloadUrls: ['https://example.com/test1.mp4'], bestUrl: 'https://example.com/test1.mp4', height: 1080 },
            createTime: Math.floor(Date.now() / 1000) - 3600,
            downloadStatus: 'idle',
            progress: 0,
          },
          {
            id: '7355001122334455668',
            platform: 'douyin',
            type: 'album',
            title: 'Album ảnh test 2: Bộ sưu tập phong cảnh 8 ảnh HD kèm nhạc nền',
            coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
            duration: 0,
            stats: { diggCount: 89300, commentCount: 1210, shareCount: 450 },
            author: { id: 'douyin_creator_01', name: 'Triệu Lệ Dĩnh Official', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80' },
            albumDetails: { imageUrls: ['https://example.com/1.jpg', 'https://example.com/2.jpg'], musicUrl: 'https://example.com/music.mp3' },
            createTime: Math.floor(Date.now() / 1000) - 7200,
            downloadStatus: 'idle',
            progress: 0,
          },
          {
            id: '7355001122334455669',
            platform: 'tiktok',
            type: 'video',
            title: 'Video test 3: TikTok viral dance triệu view không logo',
            coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&q=80',
            duration: 25,
            stats: { diggCount: 432100, commentCount: 9540, shareCount: 8200 },
            author: { id: 'tiktok_dancer', uniqueId: 'tiktok_dancer', name: 'TikTok Trend Star', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80' },
            videoDetails: { downloadUrls: ['https://example.com/test3.mp4'], bestUrl: 'https://example.com/test3.mp4', height: 1080 },
            createTime: Math.floor(Date.now() / 1000) - 14400,
            downloadStatus: 'idle',
            progress: 0,
          }
        ], { id: 'douyin_creator_01', name: 'Triệu Lệ Dĩnh Official', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80' }, 'douyin');
        setScanning(false, 'Đã quét xong 3 video mô phỏng (Test Mode)');
      }, 1000);
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const isDouyinOrTikTok = tab.url?.includes('douyin.com') || tab.url?.includes('tiktok.com');
      if (!isDouyinOrTikTok) {
        alert('Vui lòng mở một trang kênh Douyin hoặc TikTok trên tab chính trước khi bấm Quét!');
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'START_AUTO_SCROLL' }, () => {
        if (chrome.runtime?.lastError) {
          alert('Không thể kết nối với trang web. Hãy thử tải lại (F5) trang Douyin/TikTok và thử lại.');
          return;
        }
        setScanning(true, 'Đang tự động cuộn trang quét video...');
      });
    } catch (err) {
      console.error(err);
    }
  }, [setScanning, addItems]);

  return {
    isScanning,
    scanStatusText,
    startScan,
    stopScan,
    refreshForCurrentTab,
  };
}
