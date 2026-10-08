export type PlatformType = 'douyin' | 'tiktok';
export type MediaType = 'video' | 'album';
export type DownloadStatus = 'idle' | 'queued' | 'downloading' | 'completed' | 'error';

export interface MediaAuthor {
  id: string;
  uniqueId?: string; // TikTok @handle hoặc Douyin unique_id
  name: string;
  avatar: string;
  secUid?: string;
}

export interface MediaStats {
  diggCount: number;
  commentCount: number;
  shareCount: number;
  playCount?: number;
}

export interface VideoDetails {
  downloadUrls: string[]; // Sorted best to fallback
  bestUrl: string;
  width?: number;
  height?: number;
  bitrate?: number;
  ratio?: string;
  format?: string;
}

export interface AlbumDetails {
  imageUrls: string[];
  musicUrl?: string;
  musicTitle?: string;
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
