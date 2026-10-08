import { useRef, useCallback } from 'react';
import { useMediaStore } from '../store/useMediaStore';
import { QueueManager } from '../../core/downloader/queue-manager';
import { MediaItem } from '../../core/parsers/parser.interface';
import { StreamDownloader } from '../../core/downloader/stream-downloader';
import { FileSystemManager } from '../../core/downloader/file-system-manager';

export function useDownloader() {
  const {
    items,
    selectedIds,
    author,
    platform,
    concurrency,
    queueStatus,
    updateItemProgress,
    setQueueStatus,
  } = useMediaStore();

  const queueManagerRef = useRef<QueueManager | null>(null);

  // Khởi tạo QueueManager nếu chưa có
  if (!queueManagerRef.current) {
    queueManagerRef.current = new QueueManager(
      concurrency,
      (info) => {
        updateItemProgress(info.id, info.progress, info.speed, info.status, info.errorMessage);
      },
      (status) => {
        setQueueStatus(status);
      }
    );
  }

  // Tải hàng loạt các video đã được chọn
  const startBatchDownload = useCallback(async () => {
    if (!queueManagerRef.current) return;

    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) {
      alert('Vui lòng chọn ít nhất một video hoặc album ảnh để tải!');
      return;
    }

    const channelName = author?.name || selectedItems[0]?.author?.name || 'Media_Channel';
    const channelId = author?.id || author?.secUid || selectedItems[0]?.author?.id;

    // Cập nhật số luồng tải đồng thời
    queueManagerRef.current.setConcurrency(concurrency);

    // Đánh dấu trạng thái queued cho các item được chọn
    for (const item of selectedItems) {
      updateItemProgress(item.id, 0, 'Chờ...', 'queued');
    }

    try {
      await queueManagerRef.current.start(
        selectedItems,
        channelName,
        channelId,
        platform || selectedItems[0]?.platform || 'douyin'
      );
    } catch (err: any) {
      alert(`Lỗi khi bắt đầu tải: ${err.message}`);
    }
  }, [items, selectedIds, author, platform, concurrency, updateItemProgress, setQueueStatus]);

  // Tải 1 video đơn lẻ
  const downloadSingleItem = useCallback(
    async (item: MediaItem) => {
      try {
        updateItemProgress(item.id, 0, 'Đang chuẩn bị...', 'downloading');
        const channelName = author?.name || item.author?.name || 'Media_Channel';
        const authorDirHandle = await FileSystemManager.getAuthorFolder(
          item.platform || platform || 'media',
          channelName,
          author?.id || item.author?.id
        );

        await StreamDownloader.downloadItem(item, authorDirHandle, (info) => {
          updateItemProgress(info.id, info.progress, info.speed, info.status, info.errorMessage);
        });
      } catch (err: any) {
        updateItemProgress(item.id, 0, 'Lỗi', 'error', err.message);
        alert(`Lỗi khi tải video: ${err.message}`);
      }
    },
    [author, updateItemProgress]
  );

  // Hủy tiến trình tải
  const cancelDownload = useCallback(() => {
    if (queueManagerRef.current) {
      queueManagerRef.current.cancel();
    }
  }, []);

  return {
    isDownloading: queueStatus?.isRunning ?? false,
    queueStatus,
    startBatchDownload,
    downloadSingleItem,
    cancelDownload,
  };
}
