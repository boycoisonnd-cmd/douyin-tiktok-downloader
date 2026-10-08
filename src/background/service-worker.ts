// Background Service Worker

// 1. Tự động mở Side Panel khi người dùng bấm vào icon extension trên thanh công cụ
chrome.sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: true })
  ?.catch((error: any) => console.error('Lỗi cấu hình side panel behavior:', error));

// 2. Lắng nghe các sự kiện message
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Có thể chuyển tiếp message giữa Content Script và Side Panel nếu cần
  if (message.type === 'PING') {
    sendResponse({ status: 'PONG' });
  }
  return true;
});

console.log('[Background Service Worker] Initialized successfully');
export {};
