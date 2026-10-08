export type PlatformType = 'douyin' | 'tiktok' | 'instagram' | 'x' | 'youtube' | 'facebook' | 'threads';
export type MediaType = 'video' | 'album';
export type DownloadStatus = 'idle' | 'queued' | 'downloading' | 'completed' | 'error';

export interface MediaAuthor {
  id: string;
  uniqueId?: string; // TikTok @handle, X @screen_name, Instagram username, YouTube @handle
  name: string;
  avatar: string;
  secUid?: string;
  verified?: boolean; // Tích xanh
}

export interface MediaStats {
  diggCount: number; // Likes / Thả tim / Tim
  commentCount: number; // Bình luận / Replies
  shareCount: number; // Chia sẻ / Retweets
  playCount?: number; // Lượt xem / Views
}

export interface VideoDetails {
  downloadUrls: string[]; // Sorted best to fallback
  bestUrl: string;
  width?: number;
  height?: number;
  bitrate?: number;
  ratio?: string;
  format?: string;
  qualityLabel?: string; // e.g. "1080P", "720P", "4K", "Shorts", "Reels"
  needsPlayerResolution?: boolean; // YouTube stream URL resolve on-demand
}

export interface AlbumDetails {
  imageUrls: string[];
  musicUrl?: string;
  musicTitle?: string;
  // Hỗ trợ Album hỗn hợp (Instagram/X có thể vừa chứa ảnh vừa chứa video trong cùng 1 bài post)
  mixedMedia?: {
    type: 'image' | 'video';
    url: string;
    coverUrl?: string;
  }[];
}

export interface MediaItem {
  id: string;
  platform: PlatformType;
  type: MediaType;
  title: string;
  coverUrl: string;
  duration: number; // in seconds
  stats: MediaStats;
  author: MediaAuthor;
  videoDetails?: VideoDetails;
  albumDetails?: AlbumDetails;
  createTime: number; // unix timestamp in seconds or ms
  qualityLabel?: string;
  sourceUrl?: string;
  
  // Download state
  downloadStatus: DownloadStatus;
  progress: number; // 0 - 100
  downloadSpeed?: string; // e.g. "2.4 MB/s"
  errorMessage?: string;
  savedPath?: string;
  selected?: boolean; // For batch selection
}

export interface ScanResponsePayload {
  items: MediaItem[];
  author?: MediaAuthor;
  hasMore: boolean;
  maxCursor?: number | string;
  platform: PlatformType;
}
