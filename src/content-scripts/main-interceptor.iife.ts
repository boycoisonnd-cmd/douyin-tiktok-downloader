// Chạy trong MAIN world để hook trực tiếp vào fetch và XMLHttpRequest của trang web

(function initMainInterceptor() {
  if ((window as any).__DOUYIN_DOWNLOADER_INTERCEPTOR_INJECTED__) {
    return;
  }
  (window as any).__DOUYIN_DOWNLOADER_INTERCEPTOR_INJECTED__ = true;

  console.log('[Media Interceptor] Injected into MAIN world');

  const MESSAGE_TYPE = '__DOUYIN_TIKTOK_MEDIA_INTERCEPTED__';

  function dispatchToBridge(payload: { url: string; platform: 'douyin' | 'tiktok'; data: any }) {
    window.postMessage(
      {
        type: MESSAGE_TYPE,
        payload,
      },
      '*'
    );
  }

  // 1. Hook window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
      const isDouyinApi = url.includes('/aweme/v1/web/aweme/post/') || url.includes('/aweme/v1/web/aweme/detail/');
      const isTikTokApi = url.includes('/api/post/item_list/') || url.includes('/api/item/detail/');

      if (isDouyinApi || isTikTokApi) {
        const cloned = response.clone();
        cloned.json().then((data) => {
          dispatchToBridge({
            url,
            platform: isDouyinApi ? 'douyin' : 'tiktok',
            data,
          });
        }).catch(() => {});
      }
    } catch (e) {
      // Bỏ qua lỗi ngầm để không ảnh hưởng trang web
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
        const isDouyinApi = url.includes('/aweme/v1/web/aweme/post/') || url.includes('/aweme/v1/web/aweme/detail/');
        const isTikTokApi = url.includes('/api/post/item_list/') || url.includes('/api/item/detail/');

        if (isDouyinApi || isTikTokApi) {
          const responseText = this.responseText;
          if (responseText) {
            const data = JSON.parse(responseText);
            dispatchToBridge({
              url,
              platform: isDouyinApi ? 'douyin' : 'tiktok',
              data,
            });
          }
        }
      } catch (e) {}
    });

    return originalSend.apply(this, [body]);
  };

  // 3. Quét SSR State trên Douyin nếu có sẵn
  function checkInitialSSRData() {
    try {
      const ssrData = (window as any)._SSR_HYDRATED_DATA;
      if (ssrData) {
        const awemeList = ssrData?.raw?.data?.aweme_list || ssrData?.aweme_list;
        if (Array.isArray(awemeList) && awemeList.length > 0) {
          dispatchToBridge({
            url: window.location.href,
            platform: 'douyin',
            data: { aweme_list: awemeList, has_more: 1 },
          });
        }
      }

      // TikTok SIGI_STATE
      const sigiState = (window as any).SIGI_STATE;
      if (sigiState?.ItemModule) {
        const items = Object.values(sigiState.ItemModule);
        if (items.length > 0) {
          dispatchToBridge({
            url: window.location.href,
            platform: 'tiktok',
            data: { itemList: items, hasMore: true },
          });
        }
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkInitialSSRData);
  } else {
    setTimeout(checkInitialSSRData, 1000);
  }
})();
export {};
