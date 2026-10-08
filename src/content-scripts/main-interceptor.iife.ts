// Chạy trong MAIN world để hook trực tiếp vào fetch và XMLHttpRequest của trang web

(function initMainInterceptor() {
  if ((window as any).__MEDIA_DOWNLOADER_INTERCEPTOR_INJECTED__) {
    return;
  }
  (window as any).__MEDIA_DOWNLOADER_INTERCEPTOR_INJECTED__ = true;

  const MESSAGE_TYPE = '__UNIVERSAL_MEDIA_INTERCEPTED__';

  type SupportedPlatform = 'douyin' | 'tiktok' | 'instagram' | 'x' | 'youtube' | 'facebook' | 'threads';

  function dispatchToBridge(payload: {
    url: string;
    platform: SupportedPlatform;
    data: any;
  }) {
    window.postMessage(
      {
        type: MESSAGE_TYPE,
        payload,
      },
      '*'
    );
  }

  function parseAndDispatchText(url: string, platform: SupportedPlatform, text: string) {
    if (!text) return;
    let cleaned = text.trim();
    if (platform === 'facebook' || platform === 'threads') {
      cleaned = cleaned.replace(/^for\s*\(\s*;\s*;\s*\)\s*;?/, '').trim();
    }

    if (cleaned.includes('\n') && (platform === 'facebook' || platform === 'threads')) {
      // Xử lý NDJSON streaming chunks của Facebook/Threads Relay
      const lines = cleaned.split('\n');
      for (const line of lines) {
        const trimmed = line.trim().replace(/^for\s*\(\s*;\s*;\s*\)\s*;?/, '').trim();
        if (trimmed) {
          try {
            const data = JSON.parse(trimmed);
            dispatchToBridge({ url, platform, data });
          } catch (e) {}
        }
      }
    } else {
      try {
        const data = JSON.parse(cleaned);
        dispatchToBridge({ url, platform, data });
      } catch (e) {}
    }
  }

  function detectPlatform(url: string): SupportedPlatform | null {
    if (!url) return null;

    const host = window.location.hostname;
    // Resolve full URL nếu là relative path
    let fullUrl = url;
    try {
      fullUrl = new URL(url, window.location.href).href;
    } catch (e) {}

    // 1. Douyin
    if (
      fullUrl.includes('/aweme/v1/web/aweme/post/') ||
      fullUrl.includes('/aweme/v1/web/aweme/detail/') ||
      fullUrl.includes('/aweme/v1/web/tab/feed/')
    ) {
      return 'douyin';
    }

    // 2. TikTok
    if (
      fullUrl.includes('/api/post/item_list/') ||
      fullUrl.includes('/api/item/detail/') ||
      fullUrl.includes('/api/user/detail/')
    ) {
      return 'tiktok';
    }

    // 3. Instagram
    if (
      host.includes('instagram.com') ||
      fullUrl.includes('instagram.com')
    ) {
      if (
        fullUrl.includes('/graphql/query') ||
        fullUrl.includes('/api/graphql') ||
        fullUrl.includes('/api/v1/feed/') ||
        fullUrl.includes('/api/v1/clips/') ||
        fullUrl.includes('/api/v1/users/web_profile_info/') ||
        fullUrl.includes('/api/v1/tags/web_info/') ||
        fullUrl.includes('/api/v1/media/')
      ) {
        return 'instagram';
      }
    }

    // 4. X (Twitter)
    if (
      host.includes('x.com') ||
      host.includes('twitter.com') ||
      fullUrl.includes('x.com') ||
      fullUrl.includes('twitter.com')
    ) {
      if (
        fullUrl.includes('/i/api/graphql/') ||
        fullUrl.includes('/i/api/2/timeline/') ||
        fullUrl.includes('/i/api/2/')
      ) {
        return 'x';
      }
    }

    // 5. YouTube
    if (
      host.includes('youtube.com') ||
      fullUrl.includes('youtube.com')
    ) {
      if (
        fullUrl.includes('/youtubei/v1/browse') ||
        fullUrl.includes('/youtubei/v1/search') ||
        fullUrl.includes('/youtubei/v1/reel/') ||
        fullUrl.includes('/youtubei/v1/next')
      ) {
        return 'youtube';
      }
    }

    // 6. Facebook
    if (
      host.includes('facebook.com') ||
      host.includes('fb.watch') ||
      fullUrl.includes('facebook.com')
    ) {
      if (
        fullUrl.includes('/api/graphql') ||
        fullUrl.includes('/graphql/query') ||
        fullUrl.includes('/ajax/pagelet/')
      ) {
        return 'facebook';
      }
    }

    // 7. Threads
    if (
      host.includes('threads.net') ||
      fullUrl.includes('threads.net')
    ) {
      if (
        fullUrl.includes('/api/graphql') ||
        fullUrl.includes('/graphql/query') ||
        fullUrl.includes('/api/v1/')
      ) {
        return 'threads';
      }
    }

    return null;
  }

  // 1. Hook window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
      const platform = detectPlatform(url);

      if (platform) {
        const cloned = response.clone();
        if (platform === 'facebook' || platform === 'threads') {
          cloned
            .text()
            .then((text) => {
              parseAndDispatchText(url, platform, text);
            })
            .catch(() => {});
        } else {
          cloned
            .json()
            .then((data) => {
              dispatchToBridge({
                url,
                platform,
                data,
              });
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      // Bỏ qua lỗi ngầm
    }

    return response;
  };

  // 2. Hook XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async: boolean = true,
    user?: string | null,
    password?: string | null
  ) {
    (this as any).__url = typeof url === 'string' ? url : url.toString();
    return originalOpen.apply(this, [method, url, async, user, password] as any);
  };

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    this.addEventListener('load', function () {
      try {
        const url = (this as any).__url || '';
        const platform = detectPlatform(url);

        if (platform) {
          if (this.responseType === '' || this.responseType === 'text') {
            const responseText = this.responseText;
            if (responseText) {
              parseAndDispatchText(url, platform, responseText);
            }
          } else if (this.responseType === 'json' && this.response) {
            dispatchToBridge({
              url,
              platform,
              data: this.response,
            });
          }
        }
      } catch (e) {}
    });

    return originalSend.apply(this, [body]);
  };

  // 3. Quét SSR Initial Data có sẵn trên trang
  function checkInitialSSRData() {
    try {
      const href = window.location.href;

      // Douyin
      const ssrData = (window as any)._SSR_HYDRATED_DATA;
      if (ssrData) {
        const awemeList = ssrData?.raw?.data?.aweme_list || ssrData?.aweme_list;
        if (Array.isArray(awemeList) && awemeList.length > 0) {
          dispatchToBridge({
            url: href,
            platform: 'douyin',
            data: { aweme_list: awemeList, has_more: 1 },
          });
        }
      }

      // TikTok
      const sigiState = (window as any).SIGI_STATE || (window as any).__UNIVERSAL_DATA_FOR_REHYDRATION__;
      if (sigiState?.ItemModule) {
        const items = Object.values(sigiState.ItemModule);
        if (items.length > 0) {
          dispatchToBridge({
            url: href,
            platform: 'tiktok',
            data: { itemList: items, hasMore: true },
          });
        }
      } else if (sigiState?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.itemList) {
        const items = sigiState.__DEFAULT_SCOPE__['webapp.user-detail'].itemList;
        if (Array.isArray(items) && items.length > 0) {
          dispatchToBridge({
            url: href,
            platform: 'tiktok',
            data: { itemList: items, hasMore: true },
          });
        }
      }

      // YouTube
      const ytData = (window as any).ytInitialData;
      if (ytData && (ytData.contents || ytData.header)) {
        dispatchToBridge({
          url: href,
          platform: 'youtube',
          data: ytData,
        });
      }

      // Instagram _sharedData hoặc inline script tags
      const igShared = (window as any)._sharedData;
      if (igShared?.entry_data?.ProfilePage?.[0]?.graphql?.user?.edge_owner_to_timeline_media) {
        dispatchToBridge({
          url: href,
          platform: 'instagram',
          data: { data: { user: igShared.entry_data.ProfilePage[0].graphql.user } },
        });
      }

      // Quét các script JSON của Instagram hiện đại
      const jsonScripts = document.querySelectorAll('script[type="application/json"]');
      jsonScripts.forEach((script) => {
        const text = script.textContent;
        if (text && (text.includes('xdt_api__v1') || text.includes('edge_owner_to_timeline_media'))) {
          try {
            const parsed = JSON.parse(text);
            dispatchToBridge({
              url: href,
              platform: 'instagram',
              data: parsed,
            });
          } catch (e) {}
        }
      });

      // Facebook Comet SSR (script[data-sjs] hoặc script[type="application/json"])
      const fbScripts = document.querySelectorAll('script[type="application/json"][data-sjs], script[type="application/json"]');
      fbScripts.forEach((script) => {
        const text = script.textContent;
        if (
          text &&
          (text.includes('browser_native_hd_url') ||
            text.includes('playable_url') ||
            text.includes('timeline_feed_units') ||
            text.includes('reels_media_feed') ||
            text.includes('all_subattachments'))
        ) {
          parseAndDispatchText(href, 'facebook', text);
        }
      });

      // Threads SSR
      const threadsScripts = document.querySelectorAll('script[type="application/json"]');
      threadsScripts.forEach((script) => {
        const text = script.textContent;
        if (
          text &&
          (text.includes('BarcelonaUserFeed') ||
            text.includes('BarcelonaPostPageQuery') ||
            text.includes('text_post_app_thread') ||
            (text.includes('video_versions') && window.location.hostname.includes('threads.net')))
        ) {
          parseAndDispatchText(href, 'threads', text);
        }
      });
    } catch (e) {}
  }

  // Lắng nghe yêu cầu rescan SSR từ isolated-bridge
  window.addEventListener('message', (event) => {
    if (event.source === window && event.data?.type === '__REQUEST_SSR_RESCAN__') {
      checkInitialSSRData();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkInitialSSRData);
  } else {
    setTimeout(checkInitialSSRData, 800);
  }
})();
export {};
