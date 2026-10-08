// Chạy trong MAIN world để hook trực tiếp vào fetch và XMLHttpRequest của trang web

(function initMainInterceptor() {
  if ((window as any).__MEDIA_DOWNLOADER_INTERCEPTOR_INJECTED__) {
    return;
  }
  (window as any).__MEDIA_DOWNLOADER_INTERCEPTOR_INJECTED__ = true;

  console.log('[Universal Media Interceptor] Injected into MAIN world');

  const MESSAGE_TYPE = '__UNIVERSAL_MEDIA_INTERCEPTED__';

  function dispatchToBridge(payload: {
    url: string;
    platform: 'douyin' | 'tiktok' | 'instagram' | 'x' | 'youtube';
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

  function detectPlatform(url: string): 'douyin' | 'tiktok' | 'instagram' | 'x' | 'youtube' | null {
    if (!url) return null;

    // Douyin
    if (url.includes('/aweme/v1/web/aweme/post/') || url.includes('/aweme/v1/web/aweme/detail/')) {
      return 'douyin';
    }
    // TikTok
    if (url.includes('/api/post/item_list/') || url.includes('/api/item/detail/')) {
      return 'tiktok';
    }
    // Instagram
    if (
      url.includes('/api/v1/feed/user/') ||
      url.includes('/api/v1/clips/user/') ||
      (url.includes('/graphql/query') && (url.includes('Polaris') || url.includes('query_hash') || url.includes('clips') || url.includes('feed')))
    ) {
      return 'instagram';
    }
    // X (Twitter)
    if (
      url.includes('/i/api/graphql/') &&
      (url.includes('UserMedia') || url.includes('UserTweets') || url.includes('TweetDetail') || url.includes('UserHighlightsTweets'))
    ) {
      return 'x';
    }
    // YouTube
    if (url.includes('/youtubei/v1/browse')) {
      return 'youtube';
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
          const responseText = this.responseText;
          if (responseText) {
            const data = JSON.parse(responseText);
            dispatchToBridge({
              url,
              platform,
              data,
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
      const sigiState = (window as any).SIGI_STATE;
      if (sigiState?.ItemModule) {
        const items = Object.values(sigiState.ItemModule);
        if (items.length > 0) {
          dispatchToBridge({
            url: href,
            platform: 'tiktok',
            data: { itemList: items, hasMore: true },
          });
        }
      }

      // YouTube
      const ytData = (window as any).ytInitialData;
      if (ytData && ytData.contents) {
        dispatchToBridge({
          url: href,
          platform: 'youtube',
          data: ytData,
        });
      }

      // Instagram _sharedData
      const igShared = (window as any)._sharedData;
      if (igShared?.entry_data?.ProfilePage?.[0]?.graphql?.user?.edge_owner_to_timeline_media) {
        dispatchToBridge({
          url: href,
          platform: 'instagram',
          data: { data: { user: igShared.entry_data.ProfilePage[0].graphql.user } },
        });
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkInitialSSRData);
  } else {
    setTimeout(checkInitialSSRData, 1200);
  }
})();
export {};
