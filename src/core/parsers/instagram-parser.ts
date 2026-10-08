import { MediaItem, ScanResponsePayload } from './parser.interface';

export class InstagramParser {
  /**
   * Bóc tách toàn bộ dữ liệu từ JSON response của Instagram (REST feed hoặc GraphQL)
   */
  public static parsePostResponse(data: any): ScanResponsePayload | null {
    if (!data || typeof data !== 'object') return null;

    // 1. Dạng REST feed thông thường (/api/v1/feed/user/ hoặc /api/v1/clips/user/)
    let rawItems: any[] = [];
    let hasMore = false;
    let maxCursor: string | undefined = undefined;

    if (Array.isArray(data.items)) {
      rawItems = data.items;
      hasMore = Boolean(data.more_available);
      maxCursor = data.next_max_id;
    }
    // 2. Dạng GraphQL (edge_owner_to_timeline_media)
    else if (data.data?.user?.edge_owner_to_timeline_media) {
      const timeline = data.data.user.edge_owner_to_timeline_media;
      rawItems = (timeline.edges || []).map((e: any) => e.node).filter(Boolean);
      hasMore = Boolean(timeline.page_info?.has_next_page);
      maxCursor = timeline.page_info?.end_cursor;
    }
    // 3. Dạng single item
    else if (data.items && typeof data.items === 'object') {
      rawItems = [data.items];
    }

    if (rawItems.length === 0) {
      return {
        items: [],
        hasMore,
        maxCursor,
        platform: 'instagram',
      };
    }

    const items: MediaItem[] = [];
    let authorInfo: any = null;

    for (const raw of rawItems) {
      try {
        const parsed = this.parseSingleItem(raw);
        if (parsed) {
          items.push(parsed);
          if (!authorInfo && parsed.author) {
            authorInfo = parsed.author;
          }
        }
      } catch (err) {
        console.warn('Lỗi khi bóc tách item Instagram:', err, raw);
      }
    }

    return {
      items,
      author: authorInfo,
      hasMore,
      maxCursor,
      platform: 'instagram',
    };
  }

  /**
   * Bóc tách 1 bài viết / Reel / Carousel của Instagram
   */
  public static parseSingleItem(raw: any): MediaItem | null {
    if (!raw) return null;

    const id = String(raw.id || raw.pk || raw.shortcode || '');
    if (!id) return null;

    // Title / Caption
    let title = '';
    if (raw.caption?.text) {
      title = raw.caption.text;
    } else if (raw.edge_media_to_caption?.edges?.[0]?.node?.text) {
      title = raw.edge_media_to_caption.edges[0].node.text;
    } else {
      title = `Instagram_${raw.code || id}`;
    }

    const createTime = raw.taken_at || raw.taken_at_timestamp || Math.floor(Date.now() / 1000);

    // Thông tin tác giả
    const userRaw = raw.user || raw.owner || {};
    const author = {
      id: String(userRaw.pk || userRaw.id || ''),
      uniqueId: userRaw.username || '',
      name: userRaw.full_name || userRaw.username || 'Instagram Creator',
      avatar: userRaw.profile_pic_url || '',
      verified: Boolean(userRaw.is_verified),
    };

    // Thống kê tương tác
    const stats = {
      diggCount: Number(raw.like_count || raw.edge_liked_by?.count || raw.edge_media_preview_like?.count || 0),
      commentCount: Number(raw.comment_count || raw.edge_media_to_comment?.count || 0),
      shareCount: 0,
      playCount: Number(raw.play_count || raw.view_count || raw.video_view_count || 0),
    };

    // Kiểm tra loại bài đăng: Carousel (Album)
    const isCarousel = raw.media_type === 8 || Boolean(raw.carousel_media) || raw.__typename === 'GraphSidecar' || Boolean(raw.edge_sidecar_to_children);

    if (isCarousel) {
      const carouselItems = raw.carousel_media || (raw.edge_sidecar_to_children?.edges || []).map((e: any) => e.node);
      const imageUrls: string[] = [];
      const mixedMedia: { type: 'image' | 'video'; url: string; coverUrl?: string }[] = [];

      if (Array.isArray(carouselItems)) {
        for (const sub of carouselItems) {
          const isSubVideo = sub.media_type === 2 || sub.is_video || Boolean(sub.video_versions);
          if (isSubVideo) {
            const videoUrl = sub.video_versions?.[0]?.url || sub.video_url;
            const coverUrl = sub.image_versions2?.candidates?.[0]?.url || sub.display_url;
            if (videoUrl) {
              mixedMedia.push({ type: 'video', url: videoUrl, coverUrl });
            }
          } else {
            const imgUrl = sub.image_versions2?.candidates?.[0]?.url || sub.display_url;
            if (imgUrl) {
              imageUrls.push(imgUrl);
              mixedMedia.push({ type: 'image', url: imgUrl });
            }
          }
        }
      }

      const coverUrl = imageUrls[0] || mixedMedia[0]?.coverUrl || raw.image_versions2?.candidates?.[0]?.url || raw.display_url || '';

      return {
        id,
        platform: 'instagram',
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
      };
    }

    // Video hoặc Reel (media_type === 2 hoặc có video_versions hoặc GraphVideo)
    const isVideo = raw.media_type === 2 || raw.is_video || Boolean(raw.video_versions) || raw.__typename === 'GraphVideo';

    if (isVideo) {
      const videoVersions = raw.video_versions || [];
      const downloadUrls: string[] = [];

      // Sắp xếp video_versions từ phân giải cao nhất
      if (Array.isArray(videoVersions) && videoVersions.length > 0) {
        const sorted = [...videoVersions].sort((a, b) => (b.width || 0) - (a.width || 0));
        for (const v of sorted) {
          if (v.url && !downloadUrls.includes(v.url)) {
            downloadUrls.push(v.url);
          }
        }
      } else if (raw.video_url) {
        downloadUrls.push(raw.video_url);
      }

      const coverUrl = raw.image_versions2?.candidates?.[0]?.url || raw.display_url || '';
      const duration = Number(raw.video_duration || 0);
      const isReel = raw.product_type === 'clips' || raw.is_dash_eligible;

      return {
        id,
        platform: 'instagram',
        type: 'video',
        title,
        coverUrl,
        duration,
        stats,
        author,
        videoDetails: {
          downloadUrls,
          bestUrl: downloadUrls[0] || '',
          qualityLabel: isReel ? 'Reels 1080P' : 'Video HD',
        },
        createTime,
        downloadStatus: 'idle',
        progress: 0,
        qualityLabel: isReel ? 'Reels' : '1080P',
      };
    }

    // Single Photo Post (media_type === 1)
    const photoUrl = raw.image_versions2?.candidates?.[0]?.url || raw.display_url || '';
    return {
      id,
      platform: 'instagram',
      type: 'album',
      title,
      coverUrl: photoUrl,
      duration: 0,
      stats,
      author,
      albumDetails: {
        imageUrls: photoUrl ? [photoUrl] : [],
      },
      createTime,
      downloadStatus: 'idle',
      progress: 0,
      qualityLabel: 'Ảnh HD',
    };
  }
}
