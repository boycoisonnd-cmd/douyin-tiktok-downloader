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
      const tabId = tab?.id;
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_INFO' }, (response) => {
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
            } else {
              chrome.tabs.sendMessage(tabId, { type: 'TRIGGER_DOM_SCAN' }, () => {
                if (chrome.runtime?.lastError) {}
              });
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

    const handleTabUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab?: chrome.tabs.Tab) => {
      // Chỉ kiểm tra khi sự kiện phát sinh từ chính tab đang active
      if (tab?.active && (changeInfo.status === 'complete' || changeInfo.url)) {
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
      const tabId = tab?.id;
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_INFO' }, async (response) => {
          if (response?.success) {
            let newAuthor = undefined;
            if (response.channelName || response.channelId) {
              newAuthor = {
                id: response.channelId || '',
                uniqueId: response.channelId || '',
                name: response.channelName || 'Kênh mới',
                avatar: response.channelAvatar || '',
              };
            }
            await resetForNewChannel(newAuthor, response.platform);
            chrome.tabs.sendMessage(tabId, { type: 'TRIGGER_DOM_SCAN' }, () => {
              if (chrome.runtime?.lastError) {}
            });
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
        addItems(
          [
            {
              id: '7355001122334455667',
              platform: 'douyin',
              type: 'video',
              title: 'Douyin 1080P siêu nét không watermark',
              coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80',
              duration: 48,
              stats: { diggCount: 154200, commentCount: 3820, shareCount: 1250 },
              author: { id: 'douyin_creator_01', name: 'Triệu Lệ Dĩnh Official', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80', verified: true },
              videoDetails: { downloadUrls: ['https://example.com/test1.mp4'], bestUrl: 'https://example.com/test1.mp4', height: 1080 },
              createTime: Math.floor(Date.now() / 1000) - 3600,
              downloadStatus: 'idle',
              progress: 0,
              qualityLabel: '1080P',
            },
            {
              id: '7355001122334455669',
              platform: 'tiktok',
              type: 'video',
              title: 'TikTok viral dance triệu view không logo',
              coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&q=80',
              duration: 25,
              stats: { diggCount: 432100, commentCount: 9540, shareCount: 8200 },
              author: { id: 'tiktok_dancer', uniqueId: 'tiktok_dancer', name: 'TikTok Trend Star', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80', verified: true },
              videoDetails: { downloadUrls: ['https://example.com/test2.mp4'], bestUrl: 'https://example.com/test2.mp4', height: 1080 },
              createTime: Math.floor(Date.now() / 1000) - 7200,
              downloadStatus: 'idle',
              progress: 0,
              qualityLabel: '1080P',
            },
            {
              id: 'ig_post_999888',
              platform: 'instagram',
              type: 'video',
              title: 'Instagram Reel: Chuyến du lịch mùa thu tuyệt đẹp',
              coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
              duration: 35,
              stats: { diggCount: 89300, commentCount: 1210, shareCount: 450 },
              author: { id: 'cristiano', uniqueId: 'cristiano', name: 'Cristiano Ronaldo', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80', verified: true },
              videoDetails: { downloadUrls: ['https://example.com/reel.mp4'], bestUrl: 'https://example.com/reel.mp4', height: 1080 },
              createTime: Math.floor(Date.now() / 1000) - 10800,
              downloadStatus: 'idle',
              progress: 0,
              qualityLabel: 'Reels 1080P',
            },
            {
              id: 'x_tweet_177999888',
              platform: 'x',
              type: 'video',
              title: 'X (Twitter): Starship phóng thành công lên quỹ đạo',
              coverUrl: 'https://images.unsplash.com/photo-1517976487502-d52f6fbf8c5e?w=500&q=80',
              duration: 58,
              stats: { diggCount: 290000, commentCount: 18400, shareCount: 42000 },
              author: { id: 'elonmusk', uniqueId: 'elonmusk', name: 'Elon Musk', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', verified: true },
              videoDetails: { downloadUrls: ['https://example.com/x_video.mp4'], bestUrl: 'https://example.com/x_video.mp4', height: 1080 },
              createTime: Math.floor(Date.now() / 1000) - 14400,
              downloadStatus: 'idle',
              progress: 0,
              qualityLabel: '1080P',
            },
            {
              id: 'yt_shorts_888999',
              platform: 'youtube',
              type: 'video',
              title: 'YouTube Shorts: Kỷ lục thế giới mới',
              coverUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=500&q=80',
              duration: 42,
              stats: { diggCount: 950000, commentCount: 32000, shareCount: 12000, playCount: 15000000 },
              author: { id: 'MrBeast', uniqueId: 'MrBeast', name: 'MrBeast', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80', verified: true },
              videoDetails: { downloadUrls: ['https://example.com/yt_shorts.mp4'], bestUrl: 'https://example.com/yt_shorts.mp4', height: 1080 },
              createTime: Math.floor(Date.now() / 1000) - 18000,
              downloadStatus: 'idle',
              progress: 0,
              qualityLabel: 'Shorts',
            },
            {
              id: 'fb_reel_777888',
              platform: 'facebook',
              type: 'video',
              title: 'Facebook Reels: Video giải trí triệu view sắc nét 1080P',
              coverUrl: 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=500&q=80',
              duration: 45,
              stats: { diggCount: 125000, commentCount: 3400, shareCount: 1520 },
              author: { id: 'meta_creators', name: 'Meta Creators Official', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80', verified: true },
              videoDetails: { downloadUrls: ['https://example.com/fb_reel.mp4'], bestUrl: 'https://example.com/fb_reel.mp4', height: 1080 },
              createTime: Math.floor(Date.now() / 1000) - 21600,
              downloadStatus: 'idle',
              progress: 0,
              qualityLabel: 'Reels 1080P',
            },
            {
              id: 'threads_post_555666',
              platform: 'threads',
              type: 'video',
              title: 'Threads: Khoảnh khắc chia sẻ hàng ngày cực nét',
              coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80',
              duration: 28,
              stats: { diggCount: 45000, commentCount: 1890, shareCount: 760 },
              author: { id: 'zuck', uniqueId: '@zuck', name: 'Mark Zuckerberg', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', verified: true },
              videoDetails: { downloadUrls: ['https://example.com/threads_video.mp4'], bestUrl: 'https://example.com/threads_video.mp4', height: 1080 },
              createTime: Math.floor(Date.now() / 1000) - 25200,
              downloadStatus: 'idle',
              progress: 0,
              qualityLabel: '1080P',
            },
          ],
          { id: 'all_creators', name: 'Universal Demo Creator', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80', verified: true },
          'douyin'
        );
        setScanning(false, 'Đã quét xong 7 video mô phỏng (Douyin, TikTok, IG, X, YouTube, FB, Threads)');
      }, 1000);
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const url = tab.url || '';
      const isSupportedPlatform =
        url.includes('douyin.com') ||
        url.includes('tiktok.com') ||
        url.includes('instagram.com') ||
        url.includes('x.com') ||
        url.includes('twitter.com') ||
        url.includes('youtube.com') ||
        url.includes('facebook.com') ||
        url.includes('threads.net');

      if (!isSupportedPlatform) {
        alert('Vui lòng mở một trang cá nhân hoặc kênh trên Douyin, TikTok, Instagram, X (Twitter), YouTube, Facebook hoặc Threads trước khi bấm Quét!');
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'START_AUTO_SCROLL' }, () => {
        if (chrome.runtime?.lastError) {
          alert('Không thể kết nối với trang web. Hãy thử tải lại (F5) trang mạng xã hội và thử lại.');
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
