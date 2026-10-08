import { MediaItem, ScanResponsePayload } from './parser.interface';

export class XParser {
  /**
   * Bóc tách toàn bộ dữ liệu từ JSON response GraphQL của X (Twitter)
   */
  public static parsePostResponse(data: any): ScanResponsePayload | null {
    if (!data || typeof data !== 'object') return null;

    const items: MediaItem[] = [];
    let authorInfo: any = null;
    let maxCursor: string | undefined = undefined;

    // Tìm kiếm các instructions trong response của X
    const instructions =
      data.data?.user?.result?.timeline_v2?.timeline?.instructions ||
      data.data?.user?.result?.timeline?.timeline?.instructions ||
      data.data?.threaded_conversation_with_injections_v2?.instructions ||
      [];

    for (const inst of instructions) {
      if (inst.type === 'TimelineAddEntries' && Array.isArray(inst.entries)) {
        for (const entry of inst.entries) {
          // Bóc tách cursor phân trang
          if (entry.entryId?.startsWith('cursor-bottom-')) {
            maxCursor = entry.content?.value || entry.content?.itemContent?.value;
            continue;
          }

          // Bóc tách Tweet
          const tweetResult =
            entry.content?.itemContent?.tweet_results?.result ||
            entry.content?.content?.tweetResult?.result;

          if (tweetResult) {
            try {
              const parsed = this.parseSingleTweet(tweetResult);
              if (parsed) {
                items.push(parsed);
                if (!authorInfo && parsed.author) {
                  authorInfo = parsed.author;
                }
              }
            } catch (err) {
              console.warn('Lỗi khi bóc tách Tweet:', err, entry);
            }
          }
        }
      }
    }

    return {
      items,
      author: authorInfo,
      hasMore: Boolean(maxCursor),
      maxCursor,
      platform: 'x',
    };
  }

  /**
   * Bóc tách 1 Tweet đơn lẻ từ GraphQL Result
   */
  public static parseSingleTweet(tweetResult: any): MediaItem | null {
    // Xử lý Tweet với các wrapper của X (TweetWithVisibilityResults)
    const tweet = tweetResult.tweet || (tweetResult.__typename === 'TweetWithVisibilityResults' ? tweetResult.tweet : tweetResult);
    if (!tweet) return null;

    const legacy = tweet.legacy;
    if (!legacy) return null;

    const id = legacy.id_str || tweet.rest_id;
    if (!id) return null;

    // Lấy tiêu đề đầy đủ (ưu tiên note_tweet bài viết dài của X Premium)
    const title =
      tweet.note_tweet?.note_tweet_results?.result?.text ||
      legacy.full_text ||
      `Tweet_${id}`;

    // Timestamp
    const createTime = legacy.created_at
      ? Math.floor(new Date(legacy.created_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    // Tác giả
    const userResult = tweet.core?.user_results?.result || tweet.core?.user_result?.result;
    const userLegacy = userResult?.legacy || {};
    
    // Nâng cấp avatar lên HD (thay thế _normal thành _400x400)
    let avatar = userLegacy.profile_image_url_https || '';
    if (avatar.includes('_normal.')) {
      avatar = avatar.replace('_normal.', '_400x400.');
    }

    const author = {
      id: tweet.core?.user_results?.result?.rest_id || legacy.user_id_str || '',
      uniqueId: userLegacy.screen_name || '',
      name: userLegacy.name || userLegacy.screen_name || 'X User',
      avatar,
      verified: Boolean(userResult?.is_blue_verified || userLegacy.verified),
    };

    // Thống kê tương tác
    const stats = {
      diggCount: Number(legacy.favorite_count || 0),
      commentCount: Number(legacy.reply_count || 0),
      shareCount: Number(legacy.retweet_count || 0),
      playCount: Number(tweet.views?.count || 0),
    };

    // Bóc tách Media (ảnh, video, gif)
    const mediaList = legacy.extended_entities?.media || legacy.entities?.media || [];
    if (!Array.isArray(mediaList) || mediaList.length === 0) {
      // Tweet chỉ chứa văn bản thông thường, bỏ qua
      return null;
    }

    // 1. Kiểm tra Video hoặc GIF
    const videoMedia = mediaList.find((m: any) => m.type === 'video' || m.type === 'animated_gif');
    if (videoMedia && videoMedia.video_info?.variants) {
      const variants = videoMedia.video_info.variants;
      // Lọc các luồng video MP4 và sắp xếp theo bitrate cao nhất
      const mp4Variants = variants
        .filter((v: any) => v.content_type === 'video/mp4' && v.url)
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

      const downloadUrls = mp4Variants.map((v: any) => v.url);
      const bestBitrate = mp4Variants[0]?.bitrate || 0;
      const duration = Math.round((videoMedia.video_info.duration_millis || 0) / 1000);
      const coverUrl = videoMedia.media_url_https || '';

      const qualityLabel = bestBitrate >= 2000000 ? '1080P' : (bestBitrate >= 800000 ? '720P' : 'HD');

      return {
        id,
        platform: 'x',
        type: 'video',
        title,
        coverUrl,
        duration,
        stats,
        author,
        videoDetails: {
          downloadUrls,
          bestUrl: downloadUrls[0] || '',
          bitrate: bestBitrate,
          qualityLabel,
        },
        createTime,
        downloadStatus: 'idle',
        progress: 0,
        qualityLabel,
        sourceUrl: `https://x.com/${author.uniqueId}/status/${id}`,
      };
    }

    // 2. Bài đăng chứa Ảnh (Photos)
    const photoList = mediaList.filter((m: any) => m.type === 'photo');
    if (photoList.length > 0) {
      // Thêm ?name=orig để tải ảnh gốc độ nét tối đa
      const imageUrls = photoList.map((p: any) => {
        const baseUrl = p.media_url_https || '';
        return baseUrl.includes('?') ? baseUrl : `${baseUrl}?name=orig`;
      });

      return {
        id,
        platform: 'x',
        type: 'album',
        title,
        coverUrl: imageUrls[0] || '',
        duration: 0,
        stats,
        author,
        albumDetails: {
          imageUrls,
        },
        createTime,
        downloadStatus: 'idle',
        progress: 0,
        qualityLabel: `Ảnh HD (${imageUrls.length})`,
        sourceUrl: `https://x.com/${author.uniqueId}/status/${id}`,
      };
    }

    return null;
  }
}
