import { DouyinParser } from '../core/parsers/douyin-parser';
import { TikTokParser } from '../core/parsers/tiktok-parser';
import { InstagramParser } from '../core/parsers/instagram-parser';
import { XParser } from '../core/parsers/x-parser';
import { YouTubeParser } from '../core/parsers/youtube-parser';
import { FacebookParser } from '../core/parsers/facebook-parser';
import { ThreadsParser } from '../core/parsers/threads-parser';
import { ScrollController, ScrollStatus } from './scroll-controller';
import { DomMediaParser } from './dom-parser';

(function initIsolatedBridge() {
  if ((window as any).__MEDIA_DOWNLOADER_ISOLATED_BRIDGE_INJECTED__) {
    return;
  }
  (window as any).__MEDIA_DOWNLOADER_ISOLATED_BRIDGE_INJECTED__ = true;

  const MESSAGE_TYPE_UNIVERSAL = '__UNIVERSAL_MEDIA_INTERCEPTED__';
  const MESSAGE_TYPE_LEGACY = '__DOUYIN_TIKTOK_MEDIA_INTERCEPTED__';

  const scanAndDispatchDom = () => {
    try {
      const { items, platform } = DomMediaParser.scanCurrentPage();
      if (items.length > 0 && platform) {
        chrome.runtime
          .sendMessage({
            type: 'MEDIA_ITEMS_CAPTURED',
            payload: {
              items,
              platform,
              hasMore: true,
            },
          })
          .catch(() => {});
      }
    } catch (e) {}
  };

  const scrollController = new ScrollController(
    (status: ScrollStatus, message?: string) => {
      chrome.runtime
        .sendMessage({
          type: 'SCAN_STATUS_CHANGED',
          payload: { status, message },
        })
        .catch(() => {});
    },
    () => {
      // Mỗi bước cuộn tự động: kích hoạt quét DOM
      scanAndDispatchDom();
    }
  );

  // 1. Nhận message từ MAIN world (main-interceptor)
  window.addEventListener('message', (event) => {
    if (
      event.source !== window ||
      !event.data ||
      (event.data.type !== MESSAGE_TYPE_UNIVERSAL && event.data.type !== MESSAGE_TYPE_LEGACY)
    ) {
      return;
    }

    const { platform, data } = event.data.payload || {};
    let parsedResult = null;

    if (platform === 'douyin') {
      parsedResult = DouyinParser.parsePostResponse(data);
    } else if (platform === 'tiktok') {
      parsedResult = TikTokParser.parsePostResponse(data);
    } else if (platform === 'instagram') {
      parsedResult = InstagramParser.parsePostResponse(data);
    } else if (platform === 'x') {
      parsedResult = XParser.parsePostResponse(data);
    } else if (platform === 'youtube') {
      parsedResult = YouTubeParser.parsePostResponse(data);
    } else if (platform === 'facebook') {
      parsedResult = FacebookParser.parsePostResponse(data);
    } else if (platform === 'threads') {
      parsedResult = ThreadsParser.parsePostResponse(data);
    }

    if (parsedResult && parsedResult.items.length > 0) {
      chrome.runtime
        .sendMessage({
          type: 'MEDIA_ITEMS_CAPTURED',
          payload: parsedResult,
        })
        .catch(() => {});
    }
  });

  // 2. Nhận lệnh từ Side Panel hoặc Background Service Worker
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    switch (request.type) {
      case 'START_AUTO_SCROLL':
        // Kích hoạt rescan SSR và DOM ngay lập tức
        window.postMessage({ type: '__REQUEST_SSR_RESCAN__' }, '*');
        scanAndDispatchDom();
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

      case 'TRIGGER_DOM_SCAN':
        window.postMessage({ type: '__REQUEST_SSR_RESCAN__' }, '*');
        scanAndDispatchDom();
        sendResponse({ success: true });
        break;

      case 'GET_PAGE_INFO': {
        const host = window.location.hostname;
        const isDouyin = host.includes('douyin.com');
        const isTikTok = host.includes('tiktok.com');
        const isInstagram = host.includes('instagram.com');
        const isX = host.includes('x.com') || host.includes('twitter.com');
        const isYouTube = host.includes('youtube.com');
        const isFacebook = host.includes('facebook.com') || host.includes('fb.watch');
        const isThreads = host.includes('threads.net');

        let platform: any = null;
        let channelName = '';
        let channelAvatar = '';
        let channelId = '';

        if (isDouyin) {
          platform = 'douyin';
          const match = window.location.pathname.match(/\/user\/([^/?#]+)/);
          if (match) channelId = match[1];

          const nameEl = document.querySelector('.author-name, .Nu6AoaPq, [data-e2e="user-title"], h1');
          if (nameEl) channelName = nameEl.textContent?.trim() || '';
          const avatarEl = document.querySelector('.avatar-container img, .fLwL_C2Z img');
          if (avatarEl) channelAvatar = (avatarEl as HTMLImageElement).src || '';
        } else if (isTikTok) {
          platform = 'tiktok';
          const match = window.location.pathname.match(/\/@([^/?#]+)/);
          if (match) channelId = match[1];

          const nameEl = document.querySelector('[data-e2e="user-title"], h1, h2');
          if (nameEl) channelName = nameEl.textContent?.trim() || '';
          const avatarEl = document.querySelector('[data-e2e="user-avatar"] img');
          if (avatarEl) channelAvatar = (avatarEl as HTMLImageElement).src || '';
        } else if (isInstagram) {
          platform = 'instagram';
          const pathSegments = window.location.pathname.split('/').filter(Boolean);
          if (pathSegments.length > 0 && !['explore', 'reels', 'direct', 'p'].includes(pathSegments[0])) {
            channelId = pathSegments[0];
          }

          const nameEl = document.querySelector('header h2, header h1, h2, h1');
          if (nameEl) channelName = nameEl.textContent?.trim() || channelId;
          const avatarEl = document.querySelector('header img, img[alt*="profile picture"], img[alt*="ảnh hồ sơ"]');
          if (avatarEl) channelAvatar = (avatarEl as HTMLImageElement).src || '';
        } else if (isX) {
          platform = 'x';
          const pathSegments = window.location.pathname.split('/').filter(Boolean);
          if (pathSegments.length > 0 && !['home', 'explore', 'notifications', 'messages'].includes(pathSegments[0])) {
            channelId = pathSegments[0];
          }

          const nameEl = document.querySelector('[data-testid="UserName"]');
          if (nameEl) channelName = nameEl.textContent?.replace(/\n/g, ' ')?.trim() || channelId;
          const avatarEl = document.querySelector('[data-testid="UserAvatar-Container-"] img, [data-testid="Tweet-User-Avatar"] img');
          if (avatarEl) channelAvatar = (avatarEl as HTMLImageElement).src || '';
        } else if (isYouTube) {
          platform = 'youtube';
          const match = window.location.pathname.match(/\/(@[^/?#]+)/) ||
                        window.location.pathname.match(/\/(channel\/[^/?#]+)/) ||
                        window.location.pathname.match(/\/(c\/[^/?#]+)/);
          if (match) channelId = match[1];

          const nameEl = document.querySelector('ytd-channel-name #text, #channel-header #text, h1.dynamic-text-view-model-wiz__h1, yt-page-header-view-model h1');
          if (nameEl) channelName = nameEl.textContent?.trim() || channelId;
          const avatarEl = document.querySelector('#avatar img, ytd-channel-avatar-editor img, #channel-header img, yt-page-header-view-model img');
          if (avatarEl) channelAvatar = (avatarEl as HTMLImageElement).src || '';
        } else if (isFacebook) {
          platform = 'facebook';
          const pathSegments = window.location.pathname.split('/').filter(Boolean);
          if (
            pathSegments.length > 0 &&
            !['watch', 'reel', 'reels', 'groups', 'marketplace', 'gaming', 'events', 'profile.php'].includes(pathSegments[0])
          ) {
            channelId = pathSegments[0];
          } else {
            const urlParams = new URLSearchParams(window.location.search);
            channelId = urlParams.get('id') || 'facebook_channel';
          }

          const nameEl = document.querySelector('h1[dir="auto"], div[role="main"] h1, h1, [data-pagelet="ProfileTiles"] h1');
          if (nameEl) channelName = nameEl.textContent?.trim() || channelId;
          const avatarEl = document.querySelector('svg image, img[src*="fbcdn"], [aria-label*="ảnh đại diện"] img, [aria-label*="Profile picture"] img');
          if (avatarEl) {
            channelAvatar = (avatarEl as HTMLImageElement).src || (avatarEl as any)?.href?.baseVal || '';
          }
        } else if (isThreads) {
          platform = 'threads';
          const match = window.location.pathname.match(/\/@([^/?#]+)/);
          if (match) channelId = `@${match[1]}`;

          const nameEl = document.querySelector('header h1, h1, [data-pressable-container="true"] h1');
          if (nameEl) channelName = nameEl.textContent?.trim() || channelId;
          const avatarEl = document.querySelector('header img, img[alt*="ảnh hồ sơ"], img[alt*="profile picture"]');
          if (avatarEl) channelAvatar = (avatarEl as HTMLImageElement).src || '';
        }

        // Tự động kích hoạt quét DOM và yêu cầu SSR ban đầu
        window.postMessage({ type: '__REQUEST_SSR_RESCAN__' }, '*');
        scanAndDispatchDom();

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
