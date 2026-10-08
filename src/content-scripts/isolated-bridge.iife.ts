import { DouyinParser } from '../core/parsers/douyin-parser';
import { TikTokParser } from '../core/parsers/tiktok-parser';
import { InstagramParser } from '../core/parsers/instagram-parser';
import { XParser } from '../core/parsers/x-parser';
import { YouTubeParser } from '../core/parsers/youtube-parser';
import { ScrollController, ScrollStatus } from './scroll-controller';

(function initIsolatedBridge() {
  const MESSAGE_TYPE_UNIVERSAL = '__UNIVERSAL_MEDIA_INTERCEPTED__';
  const MESSAGE_TYPE_LEGACY = '__DOUYIN_TIKTOK_MEDIA_INTERCEPTED__';

  const scrollController = new ScrollController((status: ScrollStatus, message?: string) => {
    chrome.runtime
      .sendMessage({
        type: 'SCAN_STATUS_CHANGED',
        payload: { status, message },
      })
      .catch(() => {});
  });

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
        const host = window.location.hostname;
        const isDouyin = host.includes('douyin.com');
        const isTikTok = host.includes('tiktok.com');
        const isInstagram = host.includes('instagram.com');
        const isX = host.includes('x.com') || host.includes('twitter.com');
        const isYouTube = host.includes('youtube.com');

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
          if (pathSegments.length > 0 && !['explore', 'reels', 'direct'].includes(pathSegments[0])) {
            channelId = pathSegments[0];
          }

          const nameEl = document.querySelector('header h2, header h1, header section');
          if (nameEl) channelName = nameEl.textContent?.trim() || channelId;
          const avatarEl = document.querySelector('header img');
          if (avatarEl) channelAvatar = (avatarEl as HTMLImageElement).src || '';
        } else if (isX) {
          platform = 'x';
          const pathSegments = window.location.pathname.split('/').filter(Boolean);
          if (pathSegments.length > 0 && !['home', 'explore', 'notifications', 'messages'].includes(pathSegments[0])) {
            channelId = pathSegments[0];
          }

          const nameEl = document.querySelector('[data-testid="UserName"]');
          if (nameEl) channelName = nameEl.textContent?.replace(/\n/g, ' ')?.trim() || channelId;
          const avatarEl = document.querySelector('[data-testid="UserAvatar-Container-"] img');
          if (avatarEl) channelAvatar = (avatarEl as HTMLImageElement).src || '';
        } else if (isYouTube) {
          platform = 'youtube';
          const match = window.location.pathname.match(/\/@([^/?#]+)/);
          if (match) channelId = `@${match[1]}`;

          const nameEl = document.querySelector('ytd-channel-name #text, #channel-header #text, h1.dynamic-text-view-model-wiz__h1');
          if (nameEl) channelName = nameEl.textContent?.trim() || channelId;
          const avatarEl = document.querySelector('#avatar img, ytd-channel-avatar-editor img, #channel-header img');
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
