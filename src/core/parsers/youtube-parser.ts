import { MediaItem, ScanResponsePayload } from './parser.interface';

export class YouTubeParser {
  /**
   * Bóc tách dữ liệu từ API Browse của YouTube (/youtubei/v1/browse)
   */
  public static parsePostResponse(data: any): ScanResponsePayload | null {
    if (!data || typeof data !== 'object') return null;

    const items: MediaItem[] = [];
    let authorInfo: any = null;

    // 1. Lấy thông tin kênh từ header (đảm bảo luôn trả về chuỗi string, không trả về object)
    const headerRenderer =
      data.header?.c4TabbedHeaderRenderer ||
      data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel ||
      data.header?.pageHeaderViewModel;

    if (headerRenderer) {
      let channelName = '';
      if (typeof headerRenderer.title === 'string') {
        channelName = headerRenderer.title;
      } else if (typeof headerRenderer.title?.dynamicTextViewModel?.text?.content === 'string') {
        channelName = headerRenderer.title.dynamicTextViewModel.text.content;
      } else if (typeof headerRenderer.title?.runs?.[0]?.text === 'string') {
        channelName = headerRenderer.title.runs[0].text;
      } else if (typeof headerRenderer.title?.simpleText === 'string') {
        channelName = headerRenderer.title.simpleText;
      } else if (typeof headerRenderer.pageTitle === 'string') {
        channelName = headerRenderer.pageTitle;
      }

      let avatarUrl = '';
      const avatarCandidate =
        headerRenderer.avatar?.thumbnails?.[0]?.url ||
        headerRenderer.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources?.[0]?.url ||
        '';
      if (typeof avatarCandidate === 'string') {
        avatarUrl = avatarCandidate;
      }

      let channelId = '';
      if (typeof headerRenderer.channelId === 'string') {
        channelId = headerRenderer.channelId;
      }

      if (channelName) {
        authorInfo = {
          id: channelId,
          uniqueId: channelId,
          name: channelName,
          avatar: avatarUrl,
        };
      }
    }

    // 2. Tìm kiếm các renderers video hoặc shorts trong tabs / contents (có bảo vệ chống đệ quy sâu)
    const seen = new WeakSet();
    const parseRenderers = (obj: any, depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 15) return;
      if (seen.has(obj)) return;
      seen.add(obj);

      // Video thông thường (videoRenderer hoặc gridVideoRenderer hoặc compactVideoRenderer)
      if (obj.videoRenderer || obj.gridVideoRenderer || obj.compactVideoRenderer) {
        const v = obj.videoRenderer || obj.gridVideoRenderer || obj.compactVideoRenderer;
        const parsed = this.parseVideoRenderer(v, authorInfo);
        if (parsed) items.push(parsed);
      }
      // YouTube Shorts (reelItemRenderer)
      else if (obj.reelItemRenderer) {
        const r = obj.reelItemRenderer;
        const parsed = this.parseReelItemRenderer(r, authorInfo);
        if (parsed) items.push(parsed);
      }
      // Modern YouTube Video (lockupViewModel)
      else if (obj.lockupViewModel) {
        const parsed = this.parseLockupViewModel(obj.lockupViewModel, authorInfo);
        if (parsed) items.push(parsed);
      }
      // Modern YouTube Shorts (shortsLockupViewModel)
      else if (obj.shortsLockupViewModel) {
        const parsed = this.parseShortsLockupViewModel(obj.shortsLockupViewModel, authorInfo);
        if (parsed) items.push(parsed);
      }
      // Tiếp tục đệ quy quét sâu vào mảng
      else if (Array.isArray(obj)) {
        for (const item of obj) {
          parseRenderers(item, depth + 1);
        }
      } else {
        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            parseRenderers(obj[key], depth + 1);
          }
        }
      }
    };

    parseRenderers(data.contents || data.onResponseReceivedActions || data.items || data);

    const safeAuthor = authorInfo || items[0]?.author || {
      id: '',
      uniqueId: '',
      name: 'YouTube Channel',
      avatar: '',
    };
    if (typeof safeAuthor.name !== 'string') {
      safeAuthor.name = String(safeAuthor.name || 'YouTube Channel');
    }

    return {
      items,
      author: safeAuthor,
      hasMore: true,
      platform: 'youtube',
    };
  }

  /**
   * Bóc tách Modern Video (lockupViewModel)
   */
  private static parseLockupViewModel(v: any, fallbackAuthor?: any): MediaItem | null {
    const videoId =
      v.contentId ||
      v.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId ||
      v.onTap?.innertubeCommand?.watchEndpoint?.videoId;
    if (!videoId) return null;

    let title = `YouTube_${videoId}`;
    const rawTitle =
      v.metadata?.lockupMetadataViewModel?.title?.content ||
      v.metadata?.lockupMetadataViewModel?.title?.runs?.[0]?.text ||
      v.metadata?.lockupMetadataViewModel?.title?.simpleText;
    if (typeof rawTitle === 'string') {
      title = rawTitle;
    }

    const sources = v.image?.imageViewModel?.sources || [];
    const coverUrl = sources[sources.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const durationStr =
      v.overlayMetadata?.primaryText?.content ||
      v.metadata?.lockupMetadataViewModel?.badge?.badgeViewModel?.label ||
      '';
    const duration = this.parseDurationSeconds(durationStr);

    const authorName = typeof fallbackAuthor?.name === 'string' ? fallbackAuthor.name : 'YouTube Channel';

    return {
      id: videoId,
      platform: 'youtube',
      type: 'video',
      title,
      coverUrl,
      duration,
      stats: { diggCount: 0, commentCount: 0, shareCount: 0 },
      author: {
        id: typeof fallbackAuthor?.id === 'string' ? fallbackAuthor.id : '',
        uniqueId: typeof fallbackAuthor?.uniqueId === 'string' ? fallbackAuthor.uniqueId : '',
        name: authorName,
        avatar: typeof fallbackAuthor?.avatar === 'string' ? fallbackAuthor.avatar : '',
      },
      videoDetails: {
        downloadUrls: [`https://www.youtube.com/watch?v=${videoId}`],
        bestUrl: `https://www.youtube.com/watch?v=${videoId}`,
        qualityLabel: '1080P/720P',
        needsPlayerResolution: true,
      },
      createTime: Math.floor(Date.now() / 1000),
      downloadStatus: 'idle',
      progress: 0,
      qualityLabel: 'YouTube HD',
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }

  /**
   * Bóc tách Modern Shorts (shortsLockupViewModel)
   */
  private static parseShortsLockupViewModel(s: any, fallbackAuthor?: any): MediaItem | null {
    const videoId =
      s.entityId?.replace('shorts-shelf-item-', '') ||
      s.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId ||
      s.contentId;
    if (!videoId) return null;

    let title = `Shorts_${videoId}`;
    const rawTitle =
      s.overlayMetadata?.primaryText?.content ||
      s.metadata?.lockupMetadataViewModel?.title?.content ||
      s.metadata?.lockupMetadataViewModel?.title?.runs?.[0]?.text;
    if (typeof rawTitle === 'string') {
      title = rawTitle;
    }

    const sources = s.thumbnail?.sources || [];
    const coverUrl = sources[sources.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const authorName = typeof fallbackAuthor?.name === 'string' ? fallbackAuthor.name : 'YouTube Shorts';

    return {
      id: videoId,
      platform: 'youtube',
      type: 'video',
      title,
      coverUrl,
      duration: 60,
      stats: { diggCount: 0, commentCount: 0, shareCount: 0 },
      author: {
        id: typeof fallbackAuthor?.id === 'string' ? fallbackAuthor.id : '',
        uniqueId: typeof fallbackAuthor?.uniqueId === 'string' ? fallbackAuthor.uniqueId : '',
        name: authorName,
        avatar: typeof fallbackAuthor?.avatar === 'string' ? fallbackAuthor.avatar : '',
      },
      videoDetails: {
        downloadUrls: [`https://www.youtube.com/shorts/${videoId}`],
        bestUrl: `https://www.youtube.com/shorts/${videoId}`,
        qualityLabel: 'Shorts 1080P',
        needsPlayerResolution: true,
      },
      createTime: Math.floor(Date.now() / 1000),
      downloadStatus: 'idle',
      progress: 0,
      qualityLabel: 'Shorts',
      sourceUrl: `https://www.youtube.com/shorts/${videoId}`,
    };
  }

  /**
   * Bóc tách Video dài thông thường từ videoRenderer
   */
  private static parseVideoRenderer(v: any, fallbackAuthor?: any): MediaItem | null {
    const id = v.videoId;
    if (!id) return null;

    let title = `YouTube_${id}`;
    const rawTitle = v.title?.runs?.[0]?.text || v.title?.simpleText || (typeof v.title === 'string' ? v.title : null);
    if (typeof rawTitle === 'string') {
      title = rawTitle;
    }

    // Lấy thumbnail nét nhất
    const thumbs = v.thumbnail?.thumbnails || [];
    const coverUrl = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    // Thời lượng video (mm:ss -> giây)
    const lengthStr = v.lengthText?.simpleText || '';
    const duration = this.parseDurationSeconds(lengthStr);

    // Lượt xem
    const viewStr = v.viewCountText?.simpleText || '';
    const playCount = this.parseViewCount(viewStr);

    const authorName = typeof (v.ownerText?.runs?.[0]?.text || fallbackAuthor?.name) === 'string'
      ? (v.ownerText?.runs?.[0]?.text || fallbackAuthor?.name)
      : 'YouTube Creator';
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

    let title = `Shorts_${id}`;
    const rawTitle = r.headline?.simpleText || r.headline?.runs?.[0]?.text || (typeof r.headline === 'string' ? r.headline : null);
    if (typeof rawTitle === 'string') {
      title = rawTitle;
    }

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
