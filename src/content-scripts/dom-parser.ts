import { MediaItem, PlatformType } from '../core/parsers/parser.interface';

export class DomMediaParser {
  /**
   * Quét và trích xuất danh sách media có sẵn trực tiếp trên DOM của trang web
   */
  public static scanCurrentPage(): { items: MediaItem[]; platform: PlatformType | null } {
    const host = window.location.hostname;

    if (host.includes('instagram.com')) {
      return { items: this.scanInstagram(), platform: 'instagram' };
    }
    if (host.includes('x.com') || host.includes('twitter.com')) {
      return { items: this.scanX(), platform: 'x' };
    }
    if (host.includes('youtube.com')) {
      return { items: this.scanYouTube(), platform: 'youtube' };
    }
    if (host.includes('tiktok.com')) {
      return { items: this.scanTikTok(), platform: 'tiktok' };
    }
    if (host.includes('douyin.com')) {
      return { items: this.scanDouyin(), platform: 'douyin' };
    }
    if (host.includes('facebook.com')) {
      return { items: this.scanFacebook(), platform: 'facebook' };
    }
    if (host.includes('threads.net')) {
      return { items: this.scanThreads(), platform: 'threads' };
    }

    return { items: [], platform: null };
  }

  /**
   * DOM Parser cho Instagram
   */
  private static scanInstagram(): MediaItem[] {
    const items: MediaItem[] = [];
    const seenIds = new Set<string>();

    // Trích xuất username từ URL hiện tại hoặc header
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const profileUsername = pathParts[0] && !['explore', 'reels', 'direct', 'p'].includes(pathParts[0]) ? pathParts[0] : '';
    const headerTitleEl = document.querySelector('header h2, header h1');
    const authorName = headerTitleEl?.textContent?.trim() || profileUsername || 'Instagram User';
    const avatarEl = document.querySelector('header img') as HTMLImageElement | null;
    const authorAvatar = avatarEl?.src || '';

    // Lấy tất cả link post / reel trong trang
    const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="/p/"], a[href*="/reel/"]');

    links.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const match = href.match(/\/(p|reel)\/([^/?#]+)/);
      if (!match) return;

      const postType = match[1];
      const shortcode = match[2];
      if (seenIds.has(shortcode)) return;
      seenIds.add(shortcode);

      const img = a.querySelector('img');
      const coverUrl = img?.src || '';
      const title = img?.alt || `Instagram_${shortcode}`;

      // Kiểm tra có phải video / reel
      const isReel = postType === 'reel' || Boolean(
        a.querySelector('svg[aria-label*="Clip"], svg[aria-label*="Reel"], svg[aria-label*="Video"], [data-testid="reels-clip-icon"]')
      );

      const postUrl = `https://www.instagram.com/${postType}/${shortcode}/`;

      if (isReel) {
        items.push({
          id: shortcode,
          platform: 'instagram',
          type: 'video',
          title,
          coverUrl,
          duration: 0,
          stats: { diggCount: 0, commentCount: 0, shareCount: 0 },
          author: {
            id: profileUsername,
            uniqueId: profileUsername,
            name: authorName,
            avatar: authorAvatar,
          },
          videoDetails: {
            downloadUrls: [postUrl],
            bestUrl: postUrl,
            qualityLabel: 'Reels HD',
          },
          createTime: Math.floor(Date.now() / 1000),
          downloadStatus: 'idle',
          progress: 0,
          qualityLabel: 'Reels',
          sourceUrl: postUrl,
        });
      } else {
        items.push({
          id: shortcode,
          platform: 'instagram',
          type: 'album',
          title,
          coverUrl,
          duration: 0,
          stats: { diggCount: 0, commentCount: 0, shareCount: 0 },
          author: {
            id: profileUsername,
            uniqueId: profileUsername,
            name: authorName,
            avatar: authorAvatar,
          },
          albumDetails: {
            imageUrls: coverUrl ? [coverUrl] : [],
          },
          createTime: Math.floor(Date.now() / 1000),
          downloadStatus: 'idle',
          progress: 0,
          qualityLabel: 'Ảnh/Album',
          sourceUrl: postUrl,
        });
      }
    });

    return items;
  }

  /**
   * DOM Parser cho X (Twitter)
   */
  private static scanX(): MediaItem[] {
    const items: MediaItem[] = [];
    const seenIds = new Set<string>();

    const articles = document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]');

    articles.forEach((article) => {
      // Tìm link bài viết để lấy tweet ID
      const statusLink = article.querySelector<HTMLAnchorElement>('a[href*="/status/"]');
      if (!statusLink) return;

      const href = statusLink.getAttribute('href') || '';
      const match = href.match(/\/status\/(\d+)/);
      if (!match) return;

      const tweetId = match[1];
      if (seenIds.has(tweetId)) return;
      seenIds.add(tweetId);

      // Tác giả
      const userEl = article.querySelector('[data-testid="User-Name"]');
      const authorName = userEl?.querySelector('span')?.textContent?.trim() || 'X User';
      const handleEl = userEl?.querySelector('a[href^="/"]');
      const uniqueId = handleEl?.getAttribute('href')?.replace('/', '') || '';
      const avatarEl = article.querySelector<HTMLImageElement>('[data-testid="Tweet-User-Avatar"] img');
      const authorAvatar = avatarEl?.src || '';

      // Nội dung tweet
      const tweetText = article.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || `Tweet_${tweetId}`;

      // 1. Kiểm tra Video
      const videoEl = article.querySelector<HTMLVideoElement>('video');
      const videoComponent = article.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]');

      if (videoEl || videoComponent) {
        const coverUrl = videoEl?.poster || '';
        const sourceUrl = `https://x.com/${uniqueId}/status/${tweetId}`;
        const downloadUrls = videoEl?.src && !videoEl.src.startsWith('blob:') ? [videoEl.src] : [sourceUrl];

        items.push({
          id: tweetId,
          platform: 'x',
          type: 'video',
          title: tweetText,
          coverUrl,
          duration: 0,
          stats: { diggCount: 0, commentCount: 0, shareCount: 0 },
          author: {
            id: uniqueId,
            uniqueId,
            name: authorName,
            avatar: authorAvatar,
          },
          videoDetails: {
            downloadUrls,
            bestUrl: downloadUrls[0] || sourceUrl,
            qualityLabel: 'HD',
          },
          createTime: Math.floor(Date.now() / 1000),
          downloadStatus: 'idle',
          progress: 0,
          qualityLabel: 'Video HD',
          sourceUrl,
        });
        return;
      }

      // 2. Kiểm tra Hình ảnh (Photos)
      const photoImgs = article.querySelectorAll<HTMLImageElement>('[data-testid="tweetPhoto"] img');
      if (photoImgs.length > 0) {
        const imageUrls: string[] = [];
        photoImgs.forEach((img) => {
          let src = img.src || '';
          if (src) {
            // Đổi kích thước sang orig để ảnh nét nhất
            src = src.replace(/&name=\w+/, '&name=orig');
            if (!src.includes('name=') && !src.includes('?')) {
              src += '?name=orig';
            }
            imageUrls.push(src);
          }
        });

        const coverUrl = imageUrls[0] || '';
        const sourceUrl = `https://x.com/${uniqueId}/status/${tweetId}`;

        items.push({
          id: tweetId,
          platform: 'x',
          type: 'album',
          title: tweetText,
          coverUrl,
          duration: 0,
          stats: { diggCount: 0, commentCount: 0, shareCount: 0 },
          author: {
            id: uniqueId,
            uniqueId,
            name: authorName,
            avatar: authorAvatar,
          },
          albumDetails: {
            imageUrls,
          },
          createTime: Math.floor(Date.now() / 1000),
          downloadStatus: 'idle',
          progress: 0,
          qualityLabel: `Ảnh HD (${imageUrls.length})`,
          sourceUrl,
        });
      }
    });

    return items;
  }

  /**
   * DOM Parser cho YouTube (hỗ trợ cả Video dài, Shorts/Reels, video nổi bật và danh sách phát)
   */
  private static scanYouTube(): MediaItem[] {
    const items: MediaItem[] = [];
    const seenIds = new Set<string>();

    // Thông tin kênh từ trang hiện tại
    const channelNameEl = document.querySelector(
      'yt-page-header-view-model h1, h1.dynamic-text-view-model-wiz__h1, ytd-channel-name #text, #channel-header #text, #channel-name'
    );
    const pathMatch = window.location.pathname.match(/\/(@[^/?#]+)/) ||
                      window.location.pathname.match(/\/(channel\/[^/?#]+)/) ||
                      window.location.pathname.match(/\/(c\/[^/?#]+)/);
    const channelHandle = pathMatch ? pathMatch[1] : '';
    const channelName = channelNameEl?.textContent?.trim() || channelHandle || 'YouTube Channel';
    const avatarEl = document.querySelector(
      'yt-page-header-view-model img, #avatar img, ytd-channel-avatar-editor img, #channel-header img'
    ) as HTMLImageElement | null;
    const channelAvatar = avatarEl?.src || '';

    // Tìm tất cả các liên kết video và shorts trong trang
    const allLinks = document.querySelectorAll<HTMLAnchorElement>('a[href*="/watch?v="], a[href*="/shorts/"]');

    allLinks.forEach((a) => {
      const href = a.getAttribute('href') || '';
      let videoId = '';
      let isShorts = false;

      const watchMatch = href.match(/[?&]v=([^&]+)/);
      const shortsMatch = href.match(/\/shorts\/([^/?#]+)/);

      if (watchMatch) {
        videoId = watchMatch[1];
      } else if (shortsMatch) {
        videoId = shortsMatch[1];
        isShorts = true;
      }

      if (!videoId || seenIds.has(videoId)) return;
      seenIds.add(videoId);

      // Tìm container cha để lấy tiêu đề và thumbnail nét nhất
      const card = a.closest<HTMLElement>(
        'ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-reel-item-renderer, yt-lockup-view-model, ytd-compact-video-renderer, ytd-channel-video-player-renderer, ytd-playlist-video-renderer'
      ) || a.parentElement;

      // Tiêu đề
      const titleEl = card?.querySelector('#video-title, .shortsLockupViewModelHostTitle, yt-formatted-string#video-title, h3');
      let title = titleEl?.textContent?.trim() || a.getAttribute('title') || a.getAttribute('aria-label') || '';
      if (!title || title.length < 2) {
        title = isShorts ? `Shorts_${videoId}` : `Video_${videoId}`;
      }

      // Thumbnail
      const imgEl = card?.querySelector<HTMLImageElement>('img[src*="ytimg.com"], img[src*="googlevideo"], img');
      const coverUrl = imgEl?.src || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      // Thời lượng
      const durationEl = card?.querySelector('ytd-thumbnail-overlay-time-status-renderer, .badge-shape-wiz__text');
      const durationStr = durationEl?.textContent?.trim() || '';
      const duration = isShorts ? 60 : (this.parseDuration(durationStr) || 0);

      const sourceUrl = isShorts ? `https://www.youtube.com/shorts/${videoId}` : `https://www.youtube.com/watch?v=${videoId}`;

      items.push({
        id: videoId,
        platform: 'youtube',
        type: 'video',
        title,
        coverUrl,
        duration,
        stats: { diggCount: 0, commentCount: 0, shareCount: 0 },
        author: {
          id: channelHandle,
          uniqueId: channelHandle,
          name: channelName,
          avatar: channelAvatar,
        },
        videoDetails: {
          downloadUrls: [sourceUrl],
          bestUrl: sourceUrl,
          qualityLabel: isShorts ? 'Shorts 1080P' : '1080P/720P',
          needsPlayerResolution: true,
        },
        createTime: Math.floor(Date.now() / 1000),
        downloadStatus: 'idle',
        progress: 0,
        qualityLabel: isShorts ? 'Shorts' : 'YouTube HD',
        sourceUrl,
      });
    });

    return items;
  }

  /**
   * DOM Parser cho TikTok
   */
  private static scanTikTok(): MediaItem[] {
    const items: MediaItem[] = [];
    const seenIds = new Set<string>();

    const pathHandle = window.location.pathname.match(/\/@([^/?#]+)/)?.[1] || '';
    const authorName = document.querySelector('[data-e2e="user-title"]')?.textContent?.trim() || pathHandle || 'TikTok User';
    const avatarEl = document.querySelector('[data-e2e="user-avatar"] img') as HTMLImageElement | null;
    const authorAvatar = avatarEl?.src || '';

    const postLinks = document.querySelectorAll<HTMLAnchorElement>('[data-e2e="user-post-item"] a[href*="/video/"], a[href*="/video/"]');

    postLinks.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const match = href.match(/\/video\/(\d+)/);
      if (!match) return;

      const videoId = match[1];
      if (seenIds.has(videoId)) return;
      seenIds.add(videoId);

      const img = a.querySelector('img');
      const coverUrl = img?.src || '';
      const title = img?.alt || a.getAttribute('title') || `TikTok_${videoId}`;

      items.push({
        id: videoId,
        platform: 'tiktok',
        type: 'video',
        title,
        coverUrl,
        duration: 0,
        stats: { diggCount: 0, commentCount: 0, shareCount: 0 },
        author: {
          id: pathHandle,
          uniqueId: pathHandle,
          name: authorName,
          avatar: authorAvatar,
        },
        videoDetails: {
          downloadUrls: [`https://www.tiktok.com/@${pathHandle}/video/${videoId}`],
          bestUrl: `https://www.tiktok.com/@${pathHandle}/video/${videoId}`,
          qualityLabel: '1080P',
        },
        createTime: Math.floor(Date.now() / 1000),
        downloadStatus: 'idle',
        progress: 0,
        qualityLabel: 'TikTok HD',
        sourceUrl: `https://www.tiktok.com/@${pathHandle}/video/${videoId}`,
      });
    });

    return items;
  }

  /**
   * DOM Parser cho Douyin
   */
  private static scanDouyin(): MediaItem[] {
    const items: MediaItem[] = [];
    const seenIds = new Set<string>();

    const authorName = document.querySelector('.author-name, .Nu6AoaPq, [data-e2e="user-title"]')?.textContent?.trim() || 'Douyin User';
    const avatarEl = document.querySelector('.avatar-container img, .fLwL_C2Z img') as HTMLImageElement | null;
    const authorAvatar = avatarEl?.src || '';

    const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="/video/"], a[href*="/note/"]');

    links.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const match = href.match(/\/(video|note)\/(\d+)/);
      if (!match) return;

      const typeStr = match[1];
      const videoId = match[2];
      if (seenIds.has(videoId)) return;
      seenIds.add(videoId);

      const img = a.querySelector('img');
      const coverUrl = img?.src || '';
      const title = img?.alt || a.getAttribute('title') || `Douyin_${videoId}`;

      items.push({
        id: videoId,
        platform: 'douyin',
        type: typeStr === 'note' ? 'album' : 'video',
        title,
        coverUrl,
        duration: 0,
        stats: { diggCount: 0, commentCount: 0, shareCount: 0 },
        author: {
          id: '',
          name: authorName,
          avatar: authorAvatar,
        },
        videoDetails: {
          downloadUrls: [`https://www.douyin.com/video/${videoId}`],
          bestUrl: `https://www.douyin.com/video/${videoId}`,
          qualityLabel: '1080P',
        },
        createTime: Math.floor(Date.now() / 1000),
        downloadStatus: 'idle',
        progress: 0,
        qualityLabel: typeStr === 'note' ? 'Album' : '1080P',
        sourceUrl: `https://www.douyin.com/${typeStr}/${videoId}`,
      });
    });

    return items;
  }

  /**
   * DOM Parser cho Facebook
   */
  private static scanFacebook(): MediaItem[] {
    const items: MediaItem[] = [];
    const seenIds = new Set<string>();

    const authorNameEl = document.querySelector('h1[dir="auto"], div[role="main"] h1, h1');
    const authorName = authorNameEl?.textContent?.trim() || 'Facebook User';
    const avatarEl = document.querySelector('svg image, img[src*="fbcdn"]') as HTMLImageElement | null;
    const authorAvatar = avatarEl?.src || '';

    const videoLinks = document.querySelectorAll<HTMLAnchorElement>(
      'a[href*="/watch/?v="], a[href*="/videos/"], a[href*="/reel/"], a[href*="/watch?v="]'
    );

    videoLinks.forEach((a) => {
      const href = a.getAttribute('href') || '';
      let videoId = '';
      let isReel = false;

      const watchMatch = href.match(/[?&]v=([^&]+)/);
      const videoMatch = href.match(/\/videos\/(\d+)/);
      const reelMatch = href.match(/\/reel\/(\d+)/);

      if (watchMatch) {
        videoId = watchMatch[1];
      } else if (videoMatch) {
        videoId = videoMatch[1];
      } else if (reelMatch) {
        videoId = reelMatch[1];
        isReel = true;
      }

      if (!videoId || seenIds.has(videoId)) return;
      seenIds.add(videoId);

      const img = a.querySelector('img');
      const coverUrl = img?.src || '';
      const title = img?.alt || a.getAttribute('aria-label') || `Facebook_${videoId}`;
      const postUrl = isReel ? `https://www.facebook.com/reel/${videoId}/` : `https://www.facebook.com/watch/?v=${videoId}`;

      items.push({
        id: videoId,
        platform: 'facebook',
        type: 'video',
        title,
        coverUrl,
        duration: 0,
        stats: { diggCount: 0, commentCount: 0, shareCount: 0 },
        author: {
          id: videoId,
          name: authorName,
          avatar: authorAvatar,
        },
        videoDetails: {
          downloadUrls: [postUrl],
          bestUrl: postUrl,
          qualityLabel: isReel ? 'Reels' : 'HD',
        },
        createTime: Math.floor(Date.now() / 1000),
        downloadStatus: 'idle',
        progress: 0,
        qualityLabel: isReel ? 'Reels' : 'Facebook Video',
        sourceUrl: postUrl,
      });
    });

    return items;
  }

  /**
   * DOM Parser cho Threads
   */
  private static scanThreads(): MediaItem[] {
    const items: MediaItem[] = [];
    const seenIds = new Set<string>();

    const pathMatch = window.location.pathname.match(/@([^/?#]+)/);
    const pathHandle = pathMatch ? pathMatch[1] : '';
    const authorNameEl = document.querySelector('header h1, h1');
    const authorName = authorNameEl?.textContent?.trim() || pathHandle || 'Threads User';
    const avatarEl = document.querySelector('header img') as HTMLImageElement | null;
    const authorAvatar = avatarEl?.src || '';

    const postLinks = document.querySelectorAll<HTMLAnchorElement>('a[href*="/post/"]');

    postLinks.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const match = href.match(/\/post\/([^/?#]+)/);
      if (!match) return;

      const code = match[1];
      if (seenIds.has(code)) return;
      seenIds.add(code);

      const img = a.querySelector('img');
      const coverUrl = img?.src || '';
      const title = img?.alt || a.getAttribute('aria-label') || `Threads_${code}`;
      const hasVideo = Boolean(a.querySelector('video') || a.querySelector('svg[aria-label*="Video"], svg[aria-label*="video"]'));
      const postUrl = pathHandle ? `https://www.threads.net/@${pathHandle}/post/${code}` : `https://www.threads.net/post/${code}`;

      if (hasVideo) {
        items.push({
          id: code,
          platform: 'threads',
          type: 'video',
          title,
          coverUrl,
          duration: 0,
          stats: { diggCount: 0, commentCount: 0, shareCount: 0 },
          author: {
            id: pathHandle,
            uniqueId: pathHandle ? `@${pathHandle}` : '',
            name: authorName,
            avatar: authorAvatar,
          },
          videoDetails: {
            downloadUrls: [postUrl],
            bestUrl: postUrl,
            qualityLabel: '1080P',
          },
          createTime: Math.floor(Date.now() / 1000),
          downloadStatus: 'idle',
          progress: 0,
          qualityLabel: 'Threads Video',
          sourceUrl: postUrl,
        });
      } else {
        items.push({
          id: code,
          platform: 'threads',
          type: 'album',
          title,
          coverUrl,
          duration: 0,
          stats: { diggCount: 0, commentCount: 0, shareCount: 0 },
          author: {
            id: pathHandle,
            uniqueId: pathHandle ? `@${pathHandle}` : '',
            name: authorName,
            avatar: authorAvatar,
          },
          albumDetails: {
            imageUrls: coverUrl ? [coverUrl] : [],
          },
          createTime: Math.floor(Date.now() / 1000),
          downloadStatus: 'idle',
          progress: 0,
          qualityLabel: 'Ảnh Threads',
          sourceUrl: postUrl,
        });
      }
    });

    return items;
  }

  private static parseDuration(str: string): number {
    if (!str) return 0;
    const parts = str.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }
}
