import { DouyinParser } from '../core/parsers/douyin-parser';
import { TikTokParser } from '../core/parsers/tiktok-parser';
import { ScrollController, ScrollStatus } from './scroll-controller';

(function initIsolatedBridge() {
  const MESSAGE_TYPE = '__DOUYIN_TIKTOK_MEDIA_INTERCEPTED__';

  const scrollController = new ScrollController((status: ScrollStatus, message?: string) => {
    chrome.runtime.sendMessage({
      type: 'SCAN_STATUS_CHANGED',
      payload: { status, message },
    }).catch(() => {});
  });

  // 1. Nhận message từ MAIN world (main-interceptor)
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.type !== MESSAGE_TYPE) {
      return;
    }

    const { platform, data } = event.data.payload || {};
    let parsedResult = null;

    if (platform === 'douyin') {
      parsedResult = DouyinParser.parsePostResponse(data);
    } else if (platform === 'tiktok') {
      parsedResult = TikTokParser.parsePostResponse(data);
    }

    if (parsedResult && parsedResult.items.length > 0) {
      chrome.runtime.sendMessage({
        type: 'MEDIA_ITEMS_CAPTURED',
        payload: parsedResult,
      }).catch(() => {});
    }
  });

  // 2. Nhận lệnh từ Side Panel hoặc Background Service Worker
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    switch (request.type) {
      case 'START_AUTO_SCROLL':
        scrollController.start();
        sendResponse({ success: true, status: 'running' });
        break;

      case 'STOP_AUTO_SCROLL':
        scrollController.stop('Người dùng dừng quét.');
        sendResponse({ success: true, status: 'stopped' });
        break;

      case 'PAUSE_AUTO_SCROLL':
        scrollController.pause();
        sendResponse({ success: true, status: 'paused' });
        break;

      case 'GET_PAGE_INFO': {
        const isDouyin = window.location.hostname.includes('douyin.com');
        const isTikTok = window.location.hostname.includes('tiktok.com');
        const platform = isDouyin ? 'douyin' : (isTikTok ? 'tiktok' : null);

        let channelName = '';
        let channelAvatar = '';

        let channelId = '';
        if (isDouyin) {
          const match = window.location.pathname.match(/\/user\/([^/?#]+)/);
          if (match) channelId = match[1];

          const nameEl = document.querySelector('.author-name, .Nu6AoaPq, [data-e2e="user-title"], h1');
          if (nameEl) channelName = nameEl.textContent?.trim() || '';
          const avatarEl = document.querySelector('.avatar-container img, .fLwL_C2Z img');
          if (avatarEl) channelAvatar = (avatarEl as HTMLImageElement).src || '';
        } else if (isTikTok) {
          const match = window.location.pathname.match(/\/@([^/?#]+)/);
          if (match) channelId = match[1];

          const nameEl = document.querySelector('[data-e2e="user-title"], h1, h2');
          if (nameEl) channelName = nameEl.textContent?.trim() || '';
          const avatarEl = document.querySelector('[data-e2e="user-avatar"] img');
          if (avatarEl) channelAvatar = (avatarEl as HTMLImageElement).src || '';
        }

        sendResponse({
          success: true,
          platform,
          url: window.location.href,
          channelName,
          channelAvatar,
          channelId,
          isScanning: scrollController.getStatus() === 'running',
        });
        break;
      }

      default:
        break;
    }
    return true;
  });
})();
export {};
