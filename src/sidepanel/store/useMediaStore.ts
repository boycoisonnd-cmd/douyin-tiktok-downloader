import { create } from 'zustand';
import { openDB, IDBPDatabase } from 'idb';
import { MediaItem, MediaAuthor, PlatformType } from '../../core/parsers/parser.interface';
import { QueueStatus } from '../../core/downloader/queue-manager';

const DB_NAME = 'douyin_downloader_db';
const STORE_NAME = 'media_items';
const META_STORE = 'meta_info';

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    },
  });
}

interface MediaState {
  items: MediaItem[];
  selectedIds: Set<string>;
  author: MediaAuthor | null;
  platform: PlatformType | null;
  isScanning: boolean;
  scanStatusText: string;
  hasMore: boolean;
  filterType: 'all' | 'video' | 'album';
  searchQuery: string;
  concurrency: number;
  queueStatus: QueueStatus | null;

  detectedTab: {
    channelName?: string;
    channelAvatar?: string;
    channelId?: string;
    platform?: PlatformType;
    url?: string;
  } | null;

  // Actions
  addItems: (newItems: MediaItem[], author?: MediaAuthor, platform?: PlatformType) => void;
  updateItemProgress: (id: string, progress: number, speed?: string, status?: any, error?: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: (select: boolean) => void;
  setFilterType: (type: 'all' | 'video' | 'album') => void;
  setSearchQuery: (query: string) => void;
  setConcurrency: (limit: number) => void;
  setScanning: (scanning: boolean, statusText?: string) => void;
  setQueueStatus: (status: QueueStatus | null) => void;
  setDetectedTab: (tab: any) => void;
  resetForNewChannel: (newAuthor?: MediaAuthor, newPlatform?: PlatformType) => Promise<void>;
  resetPendingDownloads: () => void;
  clearAll: () => Promise<void>;
  loadSavedData: () => Promise<void>;
}

export const useMediaStore = create<MediaState>((set) => ({
  items: [],
  selectedIds: new Set(),
  author: null,
  platform: null,
  isScanning: false,
  scanStatusText: 'Sẵn sàng quét',
  hasMore: true,
  filterType: 'all',
  searchQuery: '',
  concurrency: 3,
  queueStatus: null,
  detectedTab: null,

  addItems: (newItems, author, platform) => {
    set((state) => {
      // 1. Kiểm tra xem có phải kênh mới khác với kênh đang lưu không
      const isDifferentAuthor = Boolean(
        author && state.author && (
          (author.id && state.author.id && author.id.toLowerCase() !== state.author.id.toLowerCase()) ||
          (author.uniqueId && state.author.uniqueId && author.uniqueId.toLowerCase() !== state.author.uniqueId.toLowerCase())
        )
      );

      let existingMap: Map<string, MediaItem>;
      let currentSelected: Set<string>;

      if (isDifferentAuthor) {
        // Tự động xóa danh sách kênh cũ khi quét sang kênh mới!
        existingMap = new Map();
        currentSelected = new Set();
      } else {
        existingMap = new Map(state.items.map((i) => [i.id, i]));
        currentSelected = new Set(state.selectedIds);
      }

      const newlyAdded: MediaItem[] = [];
      const itemsToSave: MediaItem[] = [];

      for (const item of newItems) {
        if (!existingMap.has(item.id)) {
          existingMap.set(item.id, item);
          newlyAdded.push(item);
          itemsToSave.push(item);
        } else {
          // Nếu item đã có từ DOM scan nhưng item mới có dữ liệu phân giải cao hơn từ network API:
          const existing = existingMap.get(item.id)!;
          if (
            (item.videoDetails?.downloadUrls && item.videoDetails.downloadUrls.length > 0 && !item.videoDetails.downloadUrls[0].includes('instagram.com/')) ||
            (item.albumDetails?.imageUrls && item.albumDetails.imageUrls.length > (existing.albumDetails?.imageUrls?.length || 0))
          ) {
            const mergedItem: MediaItem = {
              ...existing,
              ...item,
              downloadStatus: existing.downloadStatus !== 'idle' ? existing.downloadStatus : item.downloadStatus,
              progress: existing.progress || item.progress,
            };
            existingMap.set(item.id, mergedItem);
            itemsToSave.push(mergedItem);
          }
        }
      }

      const updatedItems = Array.from(existingMap.values());
      const updatedAuthor = author || state.author;
      const updatedPlatform = platform || state.platform;

      // Tự động chọn các video mới thêm
      newlyAdded.forEach((i) => currentSelected.add(i.id));

      // Lưu bất đồng bộ vào IndexedDB trong 1 transaction nguyên tử
      getDB().then(async (db) => {
        const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
        if (isDifferentAuthor) {
          await tx.objectStore(STORE_NAME).clear();
        }
        for (const item of itemsToSave) {
          tx.objectStore(STORE_NAME).put(item);
        }
        if (updatedAuthor) {
          tx.objectStore(META_STORE).put(updatedAuthor, 'author');
        }
        if (updatedPlatform) {
          tx.objectStore(META_STORE).put(updatedPlatform, 'platform');
        }
        await tx.done;
      }).catch(console.error);

      return {
        items: updatedItems,
        author: updatedAuthor,
        platform: updatedPlatform,
        selectedIds: currentSelected,
        scanStatusText: isDifferentAuthor && updatedAuthor?.name
          ? `Đã chuyển sang kênh: ${updatedAuthor.name}`
          : state.scanStatusText,
      };
    });
  },

  setDetectedTab: (detectedTab) => set({ detectedTab }),

  resetForNewChannel: async (newAuthor, newPlatform) => {
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
      await tx.objectStore(STORE_NAME).clear();
      if (newAuthor) {
        await tx.objectStore(META_STORE).put(newAuthor, 'author');
      } else {
        await tx.objectStore(META_STORE).delete('author');
      }
      if (newPlatform) {
        await tx.objectStore(META_STORE).put(newPlatform, 'platform');
      } else {
        await tx.objectStore(META_STORE).delete('platform');
      }
      await tx.done;
    } catch (e) {
      console.error(e);
    }

    set({
      items: [],
      selectedIds: new Set(),
      author: newAuthor || null,
      platform: newPlatform || null,
      isScanning: false,
      scanStatusText: newAuthor?.name
        ? `Đã làm mới, sẵn sàng quét kênh: ${newAuthor.name}`
        : 'Đã làm mới danh sách, sẵn sàng quét kênh mới',
      queueStatus: null,
    });
  },

  updateItemProgress: (id, progress, speed, status, error) => {
    set((state) => {
      const items = state.items.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            progress,
            downloadSpeed: speed !== undefined ? speed : item.downloadSpeed,
            downloadStatus: status || item.downloadStatus,
            errorMessage: error,
          };
        }
        return item;
      });
      return { items };
    });
  },

  toggleSelect: (id) => {
    set((state) => {
      const selectedIds = new Set(state.selectedIds);
      if (selectedIds.has(id)) {
        selectedIds.delete(id);
      } else {
        selectedIds.add(id);
      }
      return { selectedIds };
    });
  },

  selectAll: (select) => {
    set((state) => {
      if (select) {
        return { selectedIds: new Set(state.items.map((i) => i.id)) };
      } else {
        return { selectedIds: new Set() };
      }
    });
  },

  setFilterType: (filterType) => set({ filterType }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setConcurrency: (concurrency) => set({ concurrency }),
  setScanning: (isScanning, scanStatusText) =>
    set((state) => ({
      isScanning,
      scanStatusText: scanStatusText !== undefined ? scanStatusText : state.scanStatusText,
    })),
  setQueueStatus: (queueStatus) => set({ queueStatus }),

  resetPendingDownloads: () => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.downloadStatus === 'queued' || item.downloadStatus === 'downloading') {
          return {
            ...item,
            downloadStatus: 'idle',
            progress: 0,
            downloadSpeed: '',
            errorMessage: undefined,
          };
        }
        return item;
      }),
      queueStatus: null,
    }));
  },

  clearAll: async () => {
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
      await tx.objectStore(STORE_NAME).clear();
      await tx.objectStore(META_STORE).clear();
      await tx.done;
    } catch (e) {
      console.error(e);
    }
    set({
      items: [],
      selectedIds: new Set(),
      author: null,
      platform: null,
      isScanning: false,
      scanStatusText: 'Đã xóa dữ liệu quét',
      queueStatus: null,
    });
  },

  loadSavedData: async () => {
    try {
      const db = await getDB();
      const items = await db.getAll(STORE_NAME);
      const author = await db.get(META_STORE, 'author');
      const platform = await db.get(META_STORE, 'platform');

      if (items && items.length > 0) {
        set({
          items,
          author: author || null,
          platform: platform || null,
          selectedIds: new Set(items.map((i) => i.id)),
          scanStatusText: `Đã khôi phục ${items.length} video từ phiên trước`,
        });
      }
    } catch (err) {
      console.warn('Không thể nạp dữ liệu từ IndexedDB:', err);
    }
  },
}));
