import { MediaItem, ScanResponsePayload } from './parser.interface';

export class ThreadsParser {
  /**
   * Bóc tách toàn bộ dữ liệu từ JSON response của Threads GraphQL
   */
  public static parsePostResponse(data: any): ScanResponsePayload | null {
    if (!data || typeof data !== 'object') return null;

    const rawPosts: any[] = [];
    let hasMore = false;
    let maxCursor: string | undefined = undefined;

    // Helper trích xuất posts từ thread_items
    const extractFromThreadItems = (threadItems: any[]) => {
      if (!Array.isArray(threadItems)) return;
      for (const item of threadItems) {
        if (item?.post) {
          rawPosts.push(item.post);
        } else if (item?.id && (item.video_versions || item.image_versions2 || item.carousel_media)) {
          rawPosts.push(item);
        }
      }
    };

    // 1. Dạng feedData / edges (BarcelonaUserFeed, BarcelonaFeedQuery)
    const feedEdges =
      data.data?.feedData?.edges ||
      data.data?.user?.edge_user_to_threads?.edges ||
      data.feedData?.edges ||
      data.edges;

    if (Array.isArray(feedEdges)) {
      for (const edge of feedEdges) {
        const thread = edge.text_post_app_thread || edge.node?.text_post_app_thread || edge.node;
        if (thread?.thread_items) {
          extractFromThreadItems(thread.thread_items);
        } else if (thread?.post) {
          rawPosts.push(thread.post);
        } else if (edge.post) {
          rawPosts.push(edge.post);
        }
      }

      const pageInfo = data.data?.feedData?.page_info || data.data?.user?.edge_user_to_threads?.page_info;
      if (pageInfo) {
        hasMore = Boolean(pageInfo.has_next_page);
        maxCursor = pageInfo.end_cursor;
      }
    }

    // 2. Dạng mediaData (BarcelonaPostPageQuery - xem bài viết đơn)
    const mediaData = data.data?.mediaData || data.mediaData;
    if (mediaData?.thread_items) {
      extractFromThreadItems(mediaData.thread_items);
    } else if (mediaData?.post) {
      rawPosts.push(mediaData.post);
    }

    // 3. Dạng direct thread_items array
    if (Array.isArray(data.thread_items)) {
      extractFromThreadItems(data.thread_items);
    }

    // 4. Dạng threads array
    if (Array.isArray(data.threads)) {
      for (const t of data.threads) {
        if (t?.thread_items) extractFromThreadItems(t.thread_items);
        else if (t?.post) rawPosts.push(t.post);
      }
    }

    // 5. Dạng posts array hoặc single post
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.post) rawPosts.push(item.post);
        else rawPosts.push(item);
      }
    } else if (data.data?.post || data.post) {
      rawPosts.push(data.data?.post || data.post);
    }

    if (rawPosts.length === 0) {
      return {
        items: [],
        hasMore,
        maxCursor,
        platform: 'threads',
      };
    }

    const items: MediaItem[] = [];
    let authorInfo: any = null;

    for (const raw of rawPosts) {
      try {
        const parsed = this.parseSingleItem(raw);
        if (parsed) {
          items.push(parsed);
          if (!authorInfo && parsed.author) {
            authorInfo = parsed.author;
          }
        }
      } catch (err) {
        // Bỏ qua item lỗi
      }
    }

    return {
      items,
      author: authorInfo,
      hasMore,
      maxCursor,
      platform: 'threads',
    };
  }

  /**
   * Bóc tách 1 Post / Video / Carousel của Threads
   */
  public static parseSingleItem(raw: any): MediaItem | null {
    if (!raw || typeof raw !== 'object') return null;

    const id = String(raw.id || raw.pk || raw.code || '');
    if (!id) return null;
    const code = String(raw.code || id);

    // Caption / Title
    let title = '';
    if (raw.caption?.text) {
      title = raw.caption.text;
    } else if (typeof raw.caption === 'string') {
      title = raw.caption;
    } else {
      title = `Threads_${code}`;
    }

    const createTime = Number(raw.taken_at || Math.floor(Date.now() / 1000));

    // Author
    const user = raw.user || {};
    const username = user.username || '';
    const author = {
      id: String(user.pk || user.id || username || ''),
      uniqueId: username ? `@${username.replace(/^@/, '')}` : '',
      name: user.full_name || username || 'Threads Creator',
      avatar: user.profile_pic_url || '',
      verified: Boolean(user.is_verified),
    };

    // Stats
    const stats = {
      diggCount: Number(raw.like_count || 0),
      commentCount: Number(raw.reply_count || raw.direct_reply_count || 0),
      shareCount: Number(raw.reshare_count || 0),
      playCount: Number(raw.view_count || raw.play_count || 0),
    };

    const sourceUrl = username
      ? `https://www.threads.net/@${username.replace(/^@/, '')}/post/${code}`
      : `https://www.threads.net/post/${code}`;

    // 1. CAROUSEL MEDIA (Hỗn hợp ảnh và video)
    if (Array.isArray(raw.carousel_media) && raw.carousel_media.length > 0) {
      const imageUrls: string[] = [];
      const mixedMedia: { type: 'image' | 'video'; url: string; coverUrl?: string }[] = [];

      for (const item of raw.carousel_media) {
        const isVideo = Boolean(item.video_versions && item.video_versions.length > 0);
        if (isVideo) {
          const sortedVideos = [...item.video_versions].sort(
            (a, b) => ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0))
          );
          const vUrl = sortedVideos[0]?.url;
          const cUrl = item.image_versions2?.candidates?.[0]?.url;
          if (vUrl) {
            mixedMedia.push({ type: 'video', url: vUrl, coverUrl: cUrl });
          }
        } else {
          const imgUrl = item.image_versions2?.candidates?.[0]?.url;
          if (imgUrl) {
            imageUrls.push(imgUrl);
            mixedMedia.push({ type: 'image', url: imgUrl });
          }
        }
      }

      const coverUrl =
        imageUrls[0] ||
        mixedMedia[0]?.coverUrl ||
        raw.image_versions2?.candidates?.[0]?.url ||
        '';

      return {
        id,
        platform: 'threads',
        type: 'album',
        title,
        coverUrl,
        duration: 0,
        stats,
        author,
        albumDetails: {
          imageUrls,
          mixedMedia,
        },
        createTime,
        downloadStatus: 'idle',
        progress: 0,
        qualityLabel: `Carousel (${mixedMedia.length} mục)`,
        sourceUrl,
      };
    }

    // 2. VIDEO POST
    const videoVersions = raw.video_versions;
    if (Array.isArray(videoVersions) && videoVersions.length > 0) {
      const sortedVideos = [...videoVersions].sort(
        (a, b) => ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0))
      );

      const downloadUrls: string[] = [];
      for (const v of sortedVideos) {
        if (v.url && !downloadUrls.includes(v.url)) {
          downloadUrls.push(v.url);
        }
      }

      const bestVersion = sortedVideos[0];
      const coverUrl = raw.image_versions2?.candidates?.[0]?.url || '';
      const duration = Number(raw.video_duration || 0);

      const is1080p = (bestVersion?.height || 0) >= 1080 || (bestVersion?.width || 0) >= 1080;
      const qualityLabel = is1080p ? '1080P' : (bestVersion?.height ? `${bestVersion.height}P` : 'HD');

      return {
        id,
        platform: 'threads',
        type: 'video',
        title,
        coverUrl,
        duration,
        stats,
        author,
        videoDetails: {
          downloadUrls,
          bestUrl: downloadUrls[0] || sourceUrl,
          width: bestVersion?.width,
          height: bestVersion?.height,
          qualityLabel,
        },
        createTime,
        downloadStatus: 'idle',
        progress: 0,
        qualityLabel,
        sourceUrl,
      };
    }

    // 3. SINGLE PHOTO POST
    const singlePhoto = raw.image_versions2?.candidates?.[0]?.url;
    if (singlePhoto) {
      return {
        id,
        platform: 'threads',
        type: 'album',
        title,
        coverUrl: singlePhoto,
        duration: 0,
        stats,
        author,
        albumDetails: {
          imageUrls: [singlePhoto],
          mixedMedia: [{ type: 'image', url: singlePhoto }],
        },
        createTime,
        downloadStatus: 'idle',
        progress: 0,
        qualityLabel: 'Ảnh HD',
        sourceUrl,
      };
    }

    return null;
  }
}
