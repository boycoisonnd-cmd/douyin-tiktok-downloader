import { MediaItem, ScanResponsePayload } from './parser.interface';

export class YouTubeParser {
  /**
   * Bóc tách dữ liệu từ API Browse của YouTube (/youtubei/v1/browse)
   */
  public static parsePostResponse(data: any): ScanResponsePayload | null {
    if (!data || typeof data !== 'object') return null;

    const items: MediaItem[] = [];
    let authorInfo: any = null;

    // 1. Lấy thông tin kênh từ header
    const headerRenderer =
      data.header?.c4TabbedHeaderRenderer ||
      data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;

    if (headerRenderer) {
      const channelName =
        headerRenderer.title ||
        headerRenderer.title?.dynamicTextViewModel?.text?.content ||
        '';
      const avatarUrl =
        headerRenderer.avatar?.thumbnails?.[0]?.url ||
        headerRenderer.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources?.[0]?.url ||
        '';
      const channelId = headerRenderer.channelId || '';

      if (channelName) {
        authorInfo = {
          id: channelId,
          uniqueId: channelId,
          name: channelName,
          avatar: avatarUrl,
        };
      }
    }

    // 2. Tìm kiếm các renderers video hoặc shorts trong tabs / contents
    const parseRenderers = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      // Video thông thường (videoRenderer hoặc gridVideoRenderer)
      if (obj.videoRenderer || obj.gridVideoRenderer) {
        const v = obj.videoRenderer || obj.gridVideoRenderer;
        const parsed = this.parseVideoRenderer(v, authorInfo);
        if (parsed) items.push(parsed);
      }
      // YouTube Shorts (reelItemRenderer)
      else if (obj.reelItemRenderer) {
        const r = obj.reelItemRenderer;
        const parsed = this.parseReelItemRenderer(r, authorInfo);
        if (parsed) items.push(parsed);
      }
      // Tiếp tục đệ quy quét sâu vào mảng
      else if (Array.isArray(obj)) {
        for (const item of obj) {
          parseRenderers(item);
        }
      } else {
        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === 'object') {
            parseRenderers(obj[key]);
          }
        }
      }
    };

    parseRenderers(data.contents || data.onResponseReceivedActions);

    return {
      items,
      author: authorInfo || items[0]?.author,
      hasMore: true,
      platform: 'youtube',
    };
  }

  /**
   * Bóc tách Video dài thông thường từ videoRenderer
   */
  private static parseVideoRenderer(v: any, fallbackAuthor?: any): MediaItem | null {
    const id = v.videoId;
    if (!id) return null;

    const title =
      v.title?.runs?.[0]?.text ||
      v.title?.simpleText ||
      `YouTube_${id}`;

    // Lấy thumbnail nét nhất
    const thumbs = v.thumbnail?.thumbnails || [];
    const coverUrl = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    // Thời lượng video (mm:ss -> giây)
    const lengthStr = v.lengthText?.simpleText || '';
    const duration = this.parseDurationSeconds(lengthStr);

    // Lượt xem
    const viewStr = v.viewCountText?.simpleText || '';
    const playCount = this.parseViewCount(viewStr);

    const authorName = v.ownerText?.runs?.[0]?.text || fallbackAuthor?.name || 'YouTube Creator';
    const author = {
      id: v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || fallbackAuthor?.id || '',
      name: authorName,
      avatar: fallbackAuthor?.avatar || '',
    };

    return {
      id,
      platform: 'youtube',
      type: 'video',
      title,
      coverUrl,
      duration,
      stats: {
        diggCount: 0,
        commentCount: 0,
        shareCount: 0,
        playCount,
      },
      author,
      videoDetails: {
        downloadUrls: [`https://www.youtube.com/watch?v=${id}`],
        bestUrl: `https://www.youtube.com/watch?v=${id}`,
        qualityLabel: '1080P/720P',
        needsPlayerResolution: true,
      },
      createTime: Math.floor(Date.now() / 1000),
      downloadStatus: 'idle',
      progress: 0,
      qualityLabel: 'YouTube HD',
      sourceUrl: `https://www.youtube.com/watch?v=${id}`,
    };
  }

  /**
   * Bóc tách YouTube Shorts từ reelItemRenderer
   */
  private static parseReelItemRenderer(r: any, fallbackAuthor?: any): MediaItem | null {
    const id = r.videoId;
    if (!id) return null;

    const title =
      r.headline?.simpleText ||
      r.headline?.runs?.[0]?.text ||
      `Shorts_${id}`;

    const thumbs = r.thumbnail?.thumbnails || [];
    const coverUrl = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    const viewStr = r.viewCountText?.simpleText || '';
    const playCount = this.parseViewCount(viewStr);

    return {
      id,
      platform: 'youtube',
      type: 'video',
      title,
      coverUrl,
      duration: 60, // Mặc định Shorts < 60s
      stats: {
        diggCount: 0,
        commentCount: 0,
        shareCount: 0,
        playCount,
      },
      author: fallbackAuthor || {
        id: '',
        name: 'YouTube Shorts Creator',
        avatar: '',
      },
      videoDetails: {
        downloadUrls: [`https://www.youtube.com/shorts/${id}`],
        bestUrl: `https://www.youtube.com/shorts/${id}`,
        qualityLabel: 'Shorts 1080P',
        needsPlayerResolution: true,
      },
      createTime: Math.floor(Date.now() / 1000),
      downloadStatus: 'idle',
      progress: 0,
      qualityLabel: 'Shorts',
      sourceUrl: `https://www.youtube.com/shorts/${id}`,
    };
  }

  /**
   * Chuyển đổi "12:34" hoặc "1:02:34" thành số giây
   */
  private static parseDurationSeconds(str: string): number {
    if (!str) return 0;
    const parts = str.split(':').map(Number);
    if (parts.length === 2) {
      return (parts[0] * 60) + parts[1];
    } else if (parts.length === 3) {
      return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }
    return 0;
  }

  /**
   * Chuyển đổi chuỗi view "1.2M views" hoặc "150K lượt xem" thành số
   */
  private static parseViewCount(str: string): number {
    if (!str) return 0;
    const clean = str.replace(/[^0-9.KMBkmb]/g, '').toUpperCase();
    if (clean.endsWith('M')) {
      return Math.round(parseFloat(clean) * 1_000_000);
    }
    if (clean.endsWith('K')) {
      return Math.round(parseFloat(clean) * 1_000);
    }
    if (clean.endsWith('B')) {
      return Math.round(parseFloat(clean) * 1_000_000_000);
    }
    return parseInt(clean, 10) || 0;
  }
}
