import { MediaItem, ScanResponsePayload } from './parser.interface';

export class FacebookParser {
  /**
   * Làm sạch dữ liệu Facebook nếu là chuỗi (xóa tiền tố "for (;;);" hoặc parse NDJSON/JSON)
   */
  public static cleanRawData(data: any): any {
    if (typeof data !== 'string') {
      return data;
    }

    const trimmed = data.trim();
    // Xóa tiền tố chống JSON-hijacking: for (;;);
    const cleaned = trimmed.replace(/^for\s*\(\s*;\s*;\s*\)\s*;?/, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      // Trường hợp NDJSON (nhiều dòng JSON phân tách bởi xuống dòng, mỗi dòng có thể có tiền tố for (;;);)
      const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
      const parsedLines: any[] = [];
      for (const line of lines) {
        const lineClean = line.trim().replace(/^for\s*\(\s*;\s*;\s*\)\s*;?/, '').trim();
        if (lineClean) {
          try {
            parsedLines.push(JSON.parse(lineClean));
          } catch {
            // Bỏ qua dòng không hợp lệ
          }
        }
      }
      return parsedLines.length > 0 ? parsedLines : null;
    }
  }

  /**
   * Bóc tách toàn bộ dữ liệu từ JSON response của Facebook GraphQL Relay
   */
  public static parsePostResponse(rawData: any): ScanResponsePayload | null {
    const data = this.cleanRawData(rawData);
    if (!data || typeof data !== 'object') return null;

    const rawNodes: any[] = [];
    let hasMore = false;
    let maxCursor: string | undefined = undefined;

    // Trường hợp 1: Dữ liệu dạng mảng (batch GraphQL response hoặc NDJSON)
    if (Array.isArray(data)) {
      for (const batchItem of data) {
        const sub = this.extractNodesFromGraphQL(batchItem);
        rawNodes.push(...sub.nodes);
        if (sub.hasMore) hasMore = true;
        if (sub.maxCursor) maxCursor = sub.maxCursor;
      }
    } else {
      // Trường hợp 2: Single response object
      const sub = this.extractNodesFromGraphQL(data);
      rawNodes.push(...sub.nodes);
      hasMore = sub.hasMore;
      maxCursor = sub.maxCursor;
    }

    if (rawNodes.length === 0) {
      return {
        items: [],
        hasMore,
        maxCursor,
        platform: 'facebook',
      };
    }

    const items: MediaItem[] = [];
    let authorInfo: any = null;

    for (const raw of rawNodes) {
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
      platform: 'facebook',
    };
  }

  /**
   * Trích xuất các node story/video/attachment từ các dạng GraphQL response phổ biến của Facebook Comet
   */
  private static extractNodesFromGraphQL(data: any): { nodes: any[]; hasMore: boolean; maxCursor?: string } {
    const nodes: any[] = [];
    let hasMore = false;
    let maxCursor: string | undefined = undefined;

    if (!data || typeof data !== 'object') {
      return { nodes, hasMore, maxCursor };
    }

    // Helper kiểm tra connection object
    const inspectConnection = (conn: any) => {
      if (!conn) return;
      if (Array.isArray(conn.edges)) {
        for (const edge of conn.edges) {
          if (edge?.node) nodes.push(edge.node);
          else if (edge?.story) nodes.push(edge.story);
        }
      }
      if (conn.page_info) {
        hasMore = Boolean(conn.page_info.has_next_page);
        maxCursor = conn.page_info.end_cursor;
      }
    };

    // 1. CometModernFeedQuery / ProfileCometTimelineFeedQuery (Bảng tin / Dòng thời gian)
    const timeline =
      data.data?.node?.timeline_feed_units ||
      data.node?.timeline_feed_units ||
      data.data?.viewer?.news_feed ||
      data.viewer?.news_feed ||
      data.data?.user?.timeline_feed_units ||
      data.data?.page?.timeline_feed_units;
    if (timeline) inspectConnection(timeline);

    // 2. CometReelsViewerQuery / ProfileCometReelsTabRootQuery (Facebook Reels)
    const reelsFeed =
      data.data?.viewer?.reels_media_feed ||
      data.viewer?.reels_media_feed ||
      data.data?.node?.reels_media_feed ||
      data.data?.video_channel?.channel_feed;
    if (reelsFeed) inspectConnection(reelsFeed);

    // 3. CometVideoChannelFeedQuery / CometVideoChannelMediaTabQuery (Watch / Video Tab)
    const videoChannel =
      data.data?.video_channel?.channel_feed ||
      data.data?.node?.video_channel?.channel_feed ||
      data.node?.video_channel?.channel_feed;
    if (videoChannel) inspectConnection(videoChannel);

    // 4. CometMediaViewerQuery hoặc single story / video node
    if (data.data?.media || data.media) {
      nodes.push(data.data?.media || data.media);
    }
    if (data.data?.story || data.story) {
      nodes.push(data.data?.story || data.story);
    }
    if (data.data?.node?.comet_sections?.content?.story) {
      nodes.push(data.data.node.comet_sections.content.story);
    }

    // 5. Direct edges array
    if (Array.isArray(data.data?.edges)) {
      inspectConnection(data.data);
    } else if (Array.isArray(data.edges)) {
      inspectConnection(data);
    }

    return { nodes, hasMore, maxCursor };
  }

  /**
   * Bóc tách 1 Story / Video / Photo Album của Facebook
   */
  public static parseSingleItem(raw: any): MediaItem | null {
    if (!raw || typeof raw !== 'object') return null;

    // Mở bọc nếu node chứa comet_sections hoặc story con
    let story = raw;
    if (raw.comet_sections?.content?.story) {
      story = raw.comet_sections.content.story;
    } else if (raw.story) {
      story = raw.story;
    }

    // Tìm media đính kèm: video hoặc attachments
    const attachments = story.attachments || raw.attachments || [];
    const firstAttachment = Array.isArray(attachments) && attachments.length > 0 ? attachments[0] : null;

    // Tìm media object từ nhiều cấp
    const media =
      story.media ||
      raw.media ||
      firstAttachment?.media ||
      (firstAttachment?.target?.__typename === 'Video' ? firstAttachment.target : null) ||
      (raw.__typename === 'Video' || raw.__typename === 'Photo' ? raw : null);

    const id = String(
      media?.id ||
      story.id ||
      story.post_id ||
      raw.id ||
      raw.video_id ||
      ''
    );
    if (!id) return null;

    // Title / Caption
    let title = '';
    if (story.message?.text) {
      title = story.message.text;
    } else if (story.comet_sections?.content?.story?.message?.text) {
      title = story.comet_sections.content.story.message.text;
    } else if (firstAttachment?.title_with_entities?.text) {
      title = firstAttachment.title_with_entities.text;
    } else if (firstAttachment?.description?.text) {
      title = firstAttachment.description.text;
    } else if (media?.name) {
      title = media.name;
    } else {
      title = `Facebook_${id}`;
    }

    // Author
    const actors =
      story.actors ||
      story.comet_sections?.header?.story?.actors ||
      raw.actors ||
      [];
    const firstActor = Array.isArray(actors) && actors.length > 0 ? actors[0] : null;
    const author = {
      id: String(firstActor?.id || firstActor?.profile_url || ''),
      uniqueId: firstActor?.id || '',
      name: firstActor?.name || 'Facebook User',
      avatar: firstActor?.profile_picture?.uri || firstActor?.profile_photo?.url || '',
      verified: Boolean(firstActor?.is_verified),
    };

    // Stats
    const feedback = story.feedback || raw.feedback || media?.feedback || {};
    const diggCount = Number(
      feedback.comet_ufi_summary?.reaction_count?.count ||
      feedback.reaction_count?.count ||
      feedback.top_reactions?.count ||
      0
    );
    const commentCount = Number(
      feedback.comments_count_summary?.total_count ||
      feedback.comment_rendering_instance?.comments?.total_count ||
      feedback.comments?.total_count ||
      0
    );
    const shareCount = Number(
      feedback.share_count?.count ||
      story.share_count?.count ||
      0
    );
    const playCount = Number(
      media?.play_count ||
      media?.video_view_count ||
      story.video_view_count ||
      0
    );

    const stats = { diggCount, commentCount, shareCount, playCount };
    const createTime = Number(
      story.creation_time ||
      story.comet_sections?.header?.story?.story_header?.creation_time ||
      media?.creation_time ||
      Math.floor(Date.now() / 1000)
    );

    const sourceUrl =
      story.url ||
      story.permalink_url ||
      media?.url ||
      (id ? `https://www.facebook.com/${id}` : 'https://www.facebook.com');

    // 1. Kiểm tra nếu là VIDEO (Reels hoặc Video post)
    const isVideo =
      media?.__typename === 'Video' ||
      Boolean(media?.playable_url || media?.browser_native_hd_url || media?.browser_native_sd_url || media?.playable_url_quality_hd) ||
      Boolean(raw.playable_url || raw.browser_native_hd_url);

    if (isVideo) {
      const hdUrl =
        media?.browser_native_hd_url ||
        media?.playable_url_quality_hd ||
        raw.browser_native_hd_url ||
        raw.playable_url_quality_hd ||
        '';
      const sdUrl =
        media?.browser_native_sd_url ||
        media?.playable_url ||
        raw.browser_native_sd_url ||
        raw.playable_url ||
        '';

      const downloadUrls: string[] = [];
      if (hdUrl) downloadUrls.push(hdUrl);
      if (sdUrl && !downloadUrls.includes(sdUrl)) downloadUrls.push(sdUrl);
      if (downloadUrls.length === 0 && sourceUrl) downloadUrls.push(sourceUrl);

      const coverUrl =
        media?.preferred_thumbnail?.image?.uri ||
        media?.large_share_image?.uri ||
        media?.thumbnailImage?.uri ||
        media?.image?.uri ||
        firstAttachment?.media?.image?.uri ||
        '';

      const durationRaw =
        media?.playable_duration_in_ms ||
        media?.length_in_second ||
        raw.playable_duration_in_ms ||
        raw.length_in_second ||
        0;
      const duration = durationRaw > 1000 ? Math.round(durationRaw / 1000) : Number(durationRaw);

      const isReel = Boolean(
        story.is_reel ||
        raw.is_reel ||
        media?.is_reel ||
        sourceUrl.includes('/reel/')
      );

      return {
        id,
        platform: 'facebook',
        type: 'video',
        title,
        coverUrl,
        duration,
        stats,
        author,
        videoDetails: {
          downloadUrls,
          bestUrl: downloadUrls[0] || sourceUrl,
          width: media?.original_width || media?.width,
          height: media?.original_height || media?.height,
          qualityLabel: hdUrl ? (isReel ? 'Reels 1080P' : 'Video HD') : 'Video SD',
        },
        createTime,
        downloadStatus: 'idle',
        progress: 0,
        qualityLabel: isReel ? 'Reels' : (hdUrl ? 'HD' : 'SD'),
        sourceUrl,
      };
    }

    // 2. Kiểm tra nếu là ALBUM ẢNH (all_subattachments hoặc nhiều attachments)
    const subAttachments =
      firstAttachment?.all_subattachments?.nodes ||
      firstAttachment?.subattachments ||
      [];

    if (Array.isArray(subAttachments) && subAttachments.length > 0) {
      const imageUrls: string[] = [];
      const mixedMedia: { type: 'image' | 'video'; url: string; coverUrl?: string }[] = [];

      for (const sub of subAttachments) {
        const subMedia = sub.media || sub;
        const isSubVideo =
          subMedia?.__typename === 'Video' ||
          Boolean(subMedia?.playable_url || subMedia?.browser_native_hd_url);

        if (isSubVideo) {
          const vUrl = subMedia?.browser_native_hd_url || subMedia?.playable_url || '';
          const cUrl = subMedia?.image?.uri || subMedia?.preferred_thumbnail?.image?.uri || '';
          if (vUrl) {
            mixedMedia.push({ type: 'video', url: vUrl, coverUrl: cUrl });
          }
        } else {
          const imgUrl = subMedia?.image?.uri || subMedia?.photo_image?.uri || '';
          if (imgUrl) {
            imageUrls.push(imgUrl);
            mixedMedia.push({ type: 'image', url: imgUrl });
          }
        }
      }

      const coverUrl =
        imageUrls[0] ||
        mixedMedia[0]?.coverUrl ||
        firstAttachment?.media?.image?.uri ||
        '';

      return {
        id,
        platform: 'facebook',
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
        qualityLabel: `Album (${mixedMedia.length} mục)`,
        sourceUrl,
      };
    }

    // 3. Single Photo Post
    const photoUrl =
      media?.image?.uri ||
      media?.photo_image?.uri ||
      firstAttachment?.media?.image?.uri ||
      '';

    if (photoUrl) {
      return {
        id,
        platform: 'facebook',
        type: 'album',
        title,
        coverUrl: photoUrl,
        duration: 0,
        stats,
        author,
        albumDetails: {
          imageUrls: [photoUrl],
          mixedMedia: [{ type: 'image', url: photoUrl }],
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
