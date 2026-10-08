import { MediaItem, ScanResponsePayload } from './parser.interface';

export class TikTokParser {
  /**
   * Bóc tách dữ liệu từ JSON response của TikTok Post List API (/api/post/item_list/)
   */
  public static parsePostResponse(data: any): ScanResponsePayload | null {
    if (!data || typeof data !== 'object') return null;

    const itemList = data.itemList || data.item_list || (data.itemInfo?.itemStruct ? [data.itemInfo.itemStruct] : []);
    if (!Array.isArray(itemList) || itemList.length === 0) {
      return {
        items: [],
        hasMore: Boolean(data.hasMore ?? data.has_more),
        maxCursor: data.cursor ?? data.maxCursor,
        platform: 'tiktok',
      };
    }

    const items: MediaItem[] = [];
    let authorInfo: any = null;

    for (const item of itemList) {
      try {
        const parsed = this.parseSingleItem(item);
        if (parsed) {
          items.push(parsed);
          if (!authorInfo && parsed.author) {
            authorInfo = parsed.author;
          }
        }
      } catch (err) {
        console.warn('Lỗi khi bóc tách item TikTok:', err, item);
      }
    }

    return {
      items,
      author: authorInfo,
      hasMore: Boolean(data.hasMore ?? data.has_more),
      maxCursor: data.cursor ?? data.maxCursor,
      platform: 'tiktok',
    };
  }

  /**
   * Bóc tách 1 bài viết / video TikTok
   */
  public static parseSingleItem(item: any): MediaItem | null {
    if (!item || !item.id) return null;

    const id = String(item.id);
    const title = item.desc || `TikTok_${id}`;
    const createTime = item.createTime || Math.floor(Date.now() / 1000);

    // Thông tin tác giả
    const authorRaw = item.author || {};
    const author = {
      id: String(authorRaw.id || ''),
      uniqueId: authorRaw.uniqueId || '',
      name: authorRaw.nickname || authorRaw.uniqueId || 'TikTok User',
      avatar: authorRaw.avatarThumb || authorRaw.avatarMedium || '',
      secUid: authorRaw.secUid || '',
    };

    // Thống kê tương tác
    const statsRaw = item.stats || item.statsV2 || {};
    const stats = {
      diggCount: Number(statsRaw.diggCount || 0),
      commentCount: Number(statsRaw.commentCount || 0),
      shareCount: Number(statsRaw.shareCount || 0),
      playCount: Number(statsRaw.playCount || 0),
    };

    // Phân loại Album ảnh vs Video
    const imagePost = item.imagePost;
    if (imagePost && Array.isArray(imagePost.images) && imagePost.images.length > 0) {
      const imageUrls: string[] = [];
      for (const img of imagePost.images) {
        const url = img.imageURL?.urlList?.[0] || img.displayImage?.urlList?.[0];
        if (url) {
          imageUrls.push(url);
        }
      }

      const musicRaw = item.music || {};
      const musicUrl = musicRaw.playUrl || '';
      const musicTitle = musicRaw.title || '';

      const coverUrl = imageUrls[0] || item.video?.cover || '';

      return {
        id,
        platform: 'tiktok',
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

    // Xử lý Video không watermark:
    // Trên TikTok, video.playAddr là link sạch (không có logo TikTok nhảy góc).
    // video.downloadAddr thường có logo mờ hoặc watermark.
    const videoRaw = item.video || {};
    const coverUrl = videoRaw.cover || videoRaw.originCover || '';
    const duration = Number(videoRaw.duration || 0);

    const downloadUrls: string[] = [];

    // Ưu tiên playAddr (sạch)
    if (videoRaw.playAddr) {
      downloadUrls.push(videoRaw.playAddr);
    }

    // Bitrate Info nếu có
    if (Array.isArray(videoRaw.bitrateInfo)) {
      for (const br of videoRaw.bitrateInfo) {
        const playApi = br.PlayAddr?.UrlList?.[0];
        if (playApi && !downloadUrls.includes(playApi)) {
          downloadUrls.push(playApi);
        }
      }
    }

    // Fallback downloadAddr nếu playAddr trống
    if (videoRaw.downloadAddr && !downloadUrls.includes(videoRaw.downloadAddr)) {
      downloadUrls.push(videoRaw.downloadAddr);
    }

    const bestUrl = downloadUrls[0] || '';

    return {
      id,
      platform: 'tiktok',
      type: 'video',
      title,
      coverUrl,
      duration,
      stats,
      author,
      videoDetails: {
        downloadUrls,
        bestUrl,
        width: videoRaw.width,
        height: videoRaw.height,
        bitrate: videoRaw.bitrate,
      },
      createTime,
      downloadStatus: 'idle',
      progress: 0,
    };
  }
}
