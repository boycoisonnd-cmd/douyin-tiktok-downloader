import { MediaItem } from '../parsers/parser.interface';
import { formatMediaFileName, sanitizeFileName } from '../../utils/sanitize-filename';
import { FileSystemManager } from './file-system-manager';
import { formatBytes } from '../../utils/formatters';
import { YouTubeResolver } from './youtube-resolver';

export interface DownloadProgressInfo {
  id: string;
  progress: number; // 0 - 100
  downloadedBytes: number;
  totalBytes: number;
  speed: string; // "3.2 MB/s"
  status: 'downloading' | 'completed' | 'error';
  errorMessage?: string;
}

export class StreamDownloader {
  /**
   * Tải 1 media item (video hoặc album ảnh) trực tiếp vào thư mục
   */
  public static async downloadItem(
    item: MediaItem,
    authorDirHandle: any,
    onProgress?: (info: DownloadProgressInfo) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    if (item.type === 'album') {
      await this.downloadAlbum(item, authorDirHandle, onProgress, abortSignal);
    } else {
      await this.downloadVideo(item, authorDirHandle, onProgress, abortSignal);
    }
  }

  /**
   * Tải video đơn lẻ stream trực tiếp vào ổ cứng không tốn RAM
   */
  private static async downloadVideo(
    item: MediaItem,
    authorDirHandle: any,
    onProgress?: (info: DownloadProgressInfo) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    let urls = [...(item.videoDetails?.downloadUrls || [])];

    // Đối với YouTube: Resolve stream URL MP4 trực tiếp trước khi tải
    if (item.platform === 'youtube' || item.videoDetails?.needsPlayerResolution) {
      try {
        const directUrl = await YouTubeResolver.resolveDirectUrl(item.id);
        urls = [directUrl, ...urls];
      } catch (err: any) {
        console.warn('Không thể resolve trực tiếp YouTube URL:', err);
      }
    }

    if (urls.length === 0) {
      throw new Error('Không tìm thấy link tải video hợp lệ.');
    }

    const fileName = formatMediaFileName(item.createTime, item.id, item.title, 'mp4');

    // Thử lần lượt các URL từ chất lượng cao nhất
    let lastError: any = null;
    for (const url of urls) {
      if (abortSignal?.aborted) {
        throw new Error('Tải xuống đã bị hủy.');
      }

      try {
        await this.streamUrlToFile(url, authorDirHandle, fileName, item.id, onProgress, abortSignal);
        return; // Tải thành công!
      } catch (err: any) {
        if (abortSignal?.aborted) throw err;
        console.warn(`Lỗi khi tải URL ${url}:`, err);
        lastError = err;
      }
    }

    throw lastError || new Error('Tất cả link tải video đều không thể kết nối.');
  }

  /**
   * Tải album ảnh và nhạc nền vào một thư mục con (hỗ trợ cả album hỗn hợp ảnh/video)
   */
  private static async downloadAlbum(
    item: MediaItem,
    authorDirHandle: any,
    onProgress?: (info: DownloadProgressInfo) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const albumDetails = item.albumDetails;
    const mixedMedia = albumDetails?.mixedMedia || [];
    const imageUrls = albumDetails?.imageUrls || [];

    const totalCount = mixedMedia.length > 0 ? mixedMedia.length : imageUrls.length;
    if (totalCount === 0) {
      throw new Error('Album không chứa hình ảnh hoặc video nào.');
    }

    // Tạo thư mục con cho Album
    const folderName = `[ALBUM]_${item.id}_${sanitizeFileName(item.title, 40)}`;
    const albumFolderHandle = await FileSystemManager.getAlbumFolder(authorDirHandle, folderName);

    const totalFiles = totalCount + (albumDetails?.musicUrl ? 1 : 0);
    let completedFiles = 0;

    // 1. Tải Album hỗn hợp (Instagram/X Carousel có cả video và ảnh)
    if (mixedMedia.length > 0) {
      for (let i = 0; i < mixedMedia.length; i++) {
        if (abortSignal?.aborted) throw new Error('Tải xuống đã bị hủy.');

        const media = mixedMedia[i];
        const ext = media.type === 'video' ? 'mp4' : 'jpg';
        const fileName = `${String(i + 1).padStart(2, '0')}.${ext}`;

        try {
          await this.streamUrlToFile(media.url, albumFolderHandle, fileName, item.id, undefined, abortSignal);
        } catch (e) {
          console.warn(`Không thể tải file ${fileName}:`, e);
        }

        completedFiles++;
        const percent = Math.round((completedFiles / totalFiles) * 100);
        onProgress?.({
          id: item.id,
          progress: percent,
          downloadedBytes: 0,
          totalBytes: 0,
          speed: `${completedFiles}/${totalFiles} file`,
          status: 'downloading',
        });
      }
    }
    // 2. Tải Album ảnh thông thường
    else {
      for (let i = 0; i < imageUrls.length; i++) {
        if (abortSignal?.aborted) throw new Error('Tải xuống đã bị hủy.');

        const imgUrl = imageUrls[i];
        const imgFileName = `${String(i + 1).padStart(2, '0')}.jpg`;

        try {
          await this.streamUrlToFile(imgUrl, albumFolderHandle, imgFileName, item.id, undefined, abortSignal);
        } catch (e) {
          console.warn(`Không thể tải ảnh ${imgFileName}:`, e);
        }

        completedFiles++;
        const percent = Math.round((completedFiles / totalFiles) * 100);
        onProgress?.({
          id: item.id,
          progress: percent,
          downloadedBytes: 0,
          totalBytes: 0,
          speed: `${completedFiles}/${totalFiles} file`,
          status: 'downloading',
        });
      }
    }

    // Tải nhạc nền nếu có
    if (albumDetails?.musicUrl) {
      try {
        await this.streamUrlToFile(
          albumDetails.musicUrl,
          albumFolderHandle,
          'music.mp3',
          item.id,
          undefined,
          abortSignal
        );
      } catch (e) {
        console.warn('Không thể tải nhạc nền album:', e);
      }
    }

    onProgress?.({
      id: item.id,
      progress: 100,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 'Xong',
      status: 'completed',
    });
  }

  /**
   * Đọc Stream từ fetch() và ghi trực tiếp vào FileSystemWritableFileStream
   */
  private static async streamUrlToFile(
    url: string,
    dirHandle: any,
    fileName: string,
    itemId: string,
    onProgress?: (info: DownloadProgressInfo) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const response = await fetch(url, {
      signal: abortSignal,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body không hỗ trợ ReadableStream');
    }

    const contentLengthHeader = response.headers.get('content-length');
    const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

    const writable = await FileSystemManager.createWritableStream(dirHandle, fileName);
    const reader = response.body.getReader();

    let downloadedBytes = 0;
    let startTime = performance.now();
    let lastReportTime = startTime;
    let bytesInInterval = 0;

    try {
      while (true) {
        if (abortSignal?.aborted) {
          throw new Error('Tải xuống đã bị hủy.');
        }

        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          await writable.write(value);
          downloadedBytes += value.length;
          bytesInInterval += value.length;

          const now = performance.now();
          if (now - lastReportTime >= 400 || downloadedBytes === totalBytes) {
            const timeDiffSec = (now - lastReportTime) / 1000;
            const currentSpeedBytesPerSec = timeDiffSec > 0 ? bytesInInterval / timeDiffSec : 0;
            const speedStr = `${formatBytes(currentSpeedBytesPerSec)}/s`;

            const percent = totalBytes > 0
              ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
              : 50;

            onProgress?.({
              id: itemId,
              progress: percent,
              downloadedBytes,
              totalBytes,
              speed: speedStr,
              status: 'downloading',
            });

            lastReportTime = now;
            bytesInInterval = 0;
          }
        }
      }

      await writable.close();

      onProgress?.({
        id: itemId,
        progress: 100,
        downloadedBytes,
        totalBytes,
        speed: 'Hoàn tất',
        status: 'completed',
      });
    } catch (err) {
      try {
        await writable.abort();
      } catch (_) {}
      throw err;
    }
  }
}
