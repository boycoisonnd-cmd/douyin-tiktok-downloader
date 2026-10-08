import pLimit from 'p-limit';
import { MediaItem } from '../parsers/parser.interface';
import { StreamDownloader, DownloadProgressInfo } from './stream-downloader';
import { FileSystemManager } from './file-system-manager';

export interface QueueStatus {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  overallProgress: number;
  isRunning: boolean;
  isPaused: boolean;
}

export class QueueManager {
  private concurrency: number = 3;
  private abortController: AbortController | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  private onProgressCallback?: (info: DownloadProgressInfo) => void;
  private onQueueStatusCallback?: (status: QueueStatus) => void;

  private completedCount: number = 0;
  private failedCount: number = 0;
  private totalCount: number = 0;

  constructor(
    concurrency: number = 3,
    onProgress?: (info: DownloadProgressInfo) => void,
    onQueueStatus?: (status: QueueStatus) => void
  ) {
    this.concurrency = concurrency;
    this.onProgressCallback = onProgress;
    this.onQueueStatusCallback = onQueueStatus;
  }

  public setConcurrency(limit: number) {
    this.concurrency = Math.max(1, Math.min(10, limit));
  }

  /**
   * Bắt đầu tải danh sách MediaItem
   */
  public async start(items: MediaItem[], authorName: string, authorId?: string, platform: string = 'douyin') {
    if (this.isRunning) return;
    if (items.length === 0) return;

    this.isRunning = true;
    this.isPaused = false;
    this.abortController = new AbortController();
    this.totalCount = items.length;
    this.completedCount = 0;
    this.failedCount = 0;

    this.emitQueueStatus();

    try {
      // 1. Mở cửa sổ chọn thư mục và tạo thư mục cho kênh tác giả
      const authorDirHandle = await FileSystemManager.getAuthorFolder(platform, authorName, authorId);

      // 2. Khởi tạo giới hạn số luồng đồng thời (p-limit)
      const limit = pLimit(this.concurrency);

      const downloadPromises = items.map((item) =>
        limit(async () => {
          if (this.abortController?.signal.aborted) return;

          // Thử lại tối đa 3 lần nếu lỗi mạng
          let attempts = 0;
          const maxRetries = 3;
          let succeeded = false;

          while (attempts < maxRetries && !succeeded) {
            if (this.abortController?.signal.aborted) return;

            try {
              attempts++;
              await StreamDownloader.downloadItem(
                item,
                authorDirHandle,
                (info) => {
                  this.onProgressCallback?.(info);
                },
                this.abortController?.signal
              );
              succeeded = true;
              this.completedCount++;
            } catch (err: any) {
              if (this.abortController?.signal.aborted) {
                return;
              }

              if (attempts >= maxRetries) {
                this.failedCount++;
                this.onProgressCallback?.({
                  id: item.id,
                  progress: 0,
                  downloadedBytes: 0,
                  totalBytes: 0,
                  speed: 'Lỗi',
                  status: 'error',
                  errorMessage: err.message || 'Lỗi tải video',
                });
              } else {
                // Exponential backoff trước khi thử lại (1s, 2s)
                await new Promise((res) => setTimeout(res, attempts * 1000));
              }
            }
          }

          this.emitQueueStatus();
        })
      );

      await Promise.all(downloadPromises);
    } catch (err: any) {
      console.error('Lỗi hàng đợi tải:', err);
    } finally {
      this.isRunning = false;
      this.emitQueueStatus();
    }
  }

  /**
   * Hủy toàn bộ hàng đợi đang tải
   */
  public cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isRunning = false;
    this.isPaused = false;
    this.emitQueueStatus();
  }

  public getStatus(): QueueStatus {
    const total = this.totalCount;
    const completed = this.completedCount;
    const failed = this.failedCount;
    const inProgress = Math.max(0, total - completed - failed);
    const overallProgress = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

    return {
      total,
      completed,
      failed,
      inProgress,
      overallProgress,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
    };
  }

  private emitQueueStatus() {
    this.onQueueStatusCallback?.(this.getStatus());
  }
}
