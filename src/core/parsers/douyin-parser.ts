import { MediaItem, ScanResponsePayload } from './parser.interface';

export class DouyinParser {
  /**
   * Bóc tách toàn bộ dữ liệu từ JSON response của Douyin Post List hoặc Detail API
   */
  public static parsePostResponse(data: any): ScanResponsePayload | null {
    if (!data || typeof data !== 'object') return null;

    const awemeList = data.aweme_list || (data.aweme_detail ? [data.aweme_detail] : []);
    if (!Array.isArray(awemeList) || awemeList.length === 0) {
      // Có thể trang cuối hoặc không có video
      return {
        items: [],
        hasMore: Boolean(data.has_more),
        maxCursor: data.max_cursor,
        platform: 'douyin',
      };
    }

    const items: MediaItem[] = [];
    let authorInfo: any = null;

    for (const item of awemeList) {
      try {
        const parsed = this.parseSingleItem(item);
        if (parsed) {
          items.push(parsed);
          if (!authorInfo && parsed.author) {
            authorInfo = parsed.author;
          }
        }
      } catch (err) {
        console.warn('Lỗi khi bóc tách item Douyin:', err, item);
      }
    }

    return {
      items,
      author: authorInfo,
      hasMore: Boolean(data.has_more),
      maxCursor: data.max_cursor,
      platform: 'douyin',
    };
  }

  /**
   * Bóc tách 1 bài viết / video Douyin
   */
  public static parseSingleItem(item: any): MediaItem | null {
    if (!item || (!item.aweme_id && !item.id)) return null;

    const id = String(item.aweme_id || item.id);
    const title = item.desc || item.title || `Video_${id}`;
    const createTime = item.create_time || Math.floor(Date.now() / 1000);

    // Thông tin tác giả
    const authorRaw = item.author || {};
    const author = {
      id: String(authorRaw.uid || authorRaw.short_id || ''),
      name: authorRaw.nickname || 'Người dùng Douyin',
      avatar: (authorRaw.avatar_thumb?.url_list?.[0] || authorRaw.avatar_medium?.url_list?.[0] || ''),
      secUid: authorRaw.sec_uid || '',
    };

    // Thống kê tương tác
    const statsRaw = item.statistics || {};
    const stats = {
      diggCount: Number(statsRaw.digg_count || statsRaw.admire_count || 0),
      commentCount: Number(statsRaw.comment_count || 0),
      shareCount: Number(statsRaw.share_count || 0),
      playCount: Number(statsRaw.play_count || 0),
    };

    // Phân loại: Album ảnh (aweme_type === 68 hoặc có mảng images) hay Video thông thường
    const isAlbum = item.aweme_type === 68 || (Array.isArray(item.images) && item.images.length > 0);

    if (isAlbum && Array.isArray(item.images) && item.images.length > 0) {
      // Xử lý bài đăng album ảnh
      const imageUrls: string[] = [];
      for (const img of item.images) {
        const url = img.download_url_list?.[0] ||
                    img.display_image?.url_list?.[0] ||
                    img.url_list?.[0];
        if (url) {
          imageUrls.push(url);
        }
      }

      // Nhạc nền (nếu có)
      const musicRaw = item.music || {};
      const musicUrl = musicRaw.play_url?.url_list?.[0] || '';
      const musicTitle = musicRaw.title || '';

      const coverUrl = imageUrls[0] || (item.video?.cover?.url_list?.[0] || '');

      return {
        id,
        platform: 'douyin',
        type: 'album',
        title,
        coverUrl,
        duration: 0,
        stats,
        author,
        albumDetails: {
          imageUrls,
          musicUrl,
          musicTitle,
        },
        createTime,
        downloadStatus: 'idle',
        progress: 0,
      };
    }

    // Xử lý Video: Tìm URL chất lượng cao nhất không watermark
    const videoRaw = item.video || {};
    const coverUrl = videoRaw.cover?.url_list?.[0] || videoRaw.origin_cover?.url_list?.[0] || '';
    const duration = Math.round((videoRaw.duration || 0) / 1000); // Đổi từ ms sang s

    const downloadUrls: string[] = [];
    let bestBitrate = 0;
    let bestWidth = videoRaw.width;
    let bestHeight = videoRaw.height;

    // 1. Quét mảng bit_rate để lấy link độ phân giải cao nhất
    if (Array.isArray(videoRaw.bit_rate) && videoRaw.bit_rate.length > 0) {
      // Sắp xếp bit_rate từ cao xuống thấp
      const sortedBitrates = [...videoRaw.bit_rate].sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0));
      bestBitrate = sortedBitrates[0].bit_rate || 0;
      if (sortedBitrates[0].play_addr?.width) {
        bestWidth = sortedBitrates[0].play_addr.width;
        bestHeight = sortedBitrates[0].play_addr.height;
      }

      for (const br of sortedBitrates) {
        const urls = br.play_addr?.url_list || [];
        for (const u of urls) {
          const cleanedUrl = this.removeWatermarkParam(u);
          if (cleanedUrl && !downloadUrls.includes(cleanedUrl)) {
            downloadUrls.push(cleanedUrl);
          }
        }
      }
    }

    // 2. Fallback về play_addr gốc
    const fallbackUrls = videoRaw.play_addr?.url_list || [];
    for (const u of fallbackUrls) {
      const cleanedUrl = this.removeWatermarkParam(u);
      if (cleanedUrl && !downloadUrls.includes(cleanedUrl)) {
        downloadUrls.push(cleanedUrl);
      }
    }

    const bestUrl = downloadUrls[0] || '';

    return {
      id,
      platform: 'douyin',
      type: 'video',
      title,
      coverUrl,
      duration,
      stats,
      author,
      videoDetails: {
        downloadUrls,
        bestUrl,
        width: bestWidth,
        height: bestHeight,
        bitrate: bestBitrate,
      },
      createTime,
      downloadStatus: 'idle',
      progress: 0,
    };
  }

  /**
   * Thay thế playwm thành play (nếu dính URL watermark)
   */
  private static removeWatermarkParam(url: string): string {
    if (!url) return '';
    // Evil0ctal rule: replace /playwm/ -> /play/
    let result = url.replace(/\/playwm\//g, '/play/');
    // Đảm bảo dùng giao thức HTTPS
    if (result.startsWith('http://')) {
      result = 'https://' + result.substring(7);
    }
    return result;
  }
}
