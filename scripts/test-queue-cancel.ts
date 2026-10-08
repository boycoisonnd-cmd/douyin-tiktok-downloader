import { QueueManager } from '../src/core/downloader/queue-manager';
import { StreamDownloader } from '../src/core/downloader/stream-downloader';
import { FileSystemManager } from '../src/core/downloader/file-system-manager';

// Mock FileSystemManager
(FileSystemManager as any).getAuthorFolder = async () => ({
  getFileHandle: async () => ({
    createWritable: async () => ({
      write: async () => {},
      close: async () => {},
      abort: async () => {},
    }),
  }),
});

// Mock StreamDownloader.downloadItem
let downloadedItemIds: string[] = [];
(StreamDownloader as any).downloadItem = async (item: any, _dir: any, _onProgress: any, signal?: AbortSignal) => {
  if (signal?.aborted) throw new Error('Tải xuống đã bị hủy.');
  downloadedItemIds.push(item.id);
  // Mô phỏng thời gian tải 100ms
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 100);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Tải xuống đã bị hủy.'));
    });
  });
};

async function testCancel() {
  const items: any[] = [
    { id: '1', title: 'Video 1', type: 'video' },
    { id: '2', title: 'Video 2', type: 'video' },
    { id: '3', title: 'Video 3', type: 'video' },
    { id: '4', title: 'Video 4', type: 'video' },
    { id: '5', title: 'Video 5', type: 'video' },
  ];

  const qm = new QueueManager(1); // 1 luồng
  const startPromise = qm.start(items, 'Test Author');

  // Đợi 30ms (Video 1 đang chạy dở), sau đó bấm Hủy tải
  await new Promise((r) => setTimeout(r, 30));
  console.log('Bấm Hủy tải...');
  qm.cancel();

  await startPromise;

  console.log('Các item đã tải xong hoặc bắt đầu tải:', downloadedItemIds);
  const status = qm.getStatus();
  console.log('Trạng thái hàng đợi sau khi hủy:', status);

  if (downloadedItemIds.length <= 1 && !status.isRunning) {
    console.log('✅ TEST CANCEL THÀNH CÔNG: Các video khác trong hàng đợi (2, 3, 4, 5) không bị tải tiếp!');
  } else {
    console.error('❌ TEST CANCEL THẤT BẠI: Vẫn tải tiếp các video sau!', downloadedItemIds);
    process.exit(1);
  }
}

testCancel();
