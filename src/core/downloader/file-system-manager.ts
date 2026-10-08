import { formatAuthorFolderName, sanitizeFileName } from '../../utils/sanitize-filename';

export class FileSystemManager {
  private static rootDirHandle: any = null;

  /**
   * Mở hộp thoại hệ điều hành để người dùng chọn thư mục lưu trữ
   */
  public static async selectDirectory(): Promise<any> {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('Trình duyệt không hỗ trợ File System Access API. Hãy sử dụng Chrome hoặc Edge phiên bản mới.');
    }

    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      this.rootDirHandle = handle;
      return handle;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Người dùng đã hủy chọn thư mục.');
      }
      throw err;
    }
  }

  /**
   * Lấy handle thư mục gốc hiện tại (hoặc yêu cầu chọn nếu chưa có)
   */
  public static async getOrSelectRootDir(): Promise<any> {
    if (this.rootDirHandle) {
      // Kiểm tra quyền truy cập readwrite
      const hasPermission = await this.verifyPermission(this.rootDirHandle, true);
      if (hasPermission) {
        return this.rootDirHandle;
      }
    }
    return await this.selectDirectory();
  }

  /**
   * Tạo hoặc lấy thư mục con dành riêng cho kênh tác giả
   */
  public static async getAuthorFolder(
    platform: string,
    authorName: string,
    authorId?: string
  ): Promise<any> {
    const root = await this.getOrSelectRootDir();
    const folderName = formatAuthorFolderName(platform, authorName, authorId);
    return await root.getDirectoryHandle(folderName, { create: true });
  }

  /**
   * Tạo thư mục con cho Album ảnh
   */
  public static async getAlbumFolder(parentDir: any, albumFolderName: string): Promise<any> {
    const safeName = sanitizeFileName(albumFolderName, 60);
    return await parentDir.getDirectoryHandle(safeName, { create: true });
  }

  /**
   * Tạo file stream để ghi đĩa
   */
  public static async createWritableStream(dirHandle: any, fileName: string): Promise<any> {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    return await fileHandle.createWritable();
  }

  /**
   * Xác thực quyền truy cập thư mục
   */
  private static async verifyPermission(fileHandle: any, readWrite: boolean): Promise<boolean> {
    const options: any = {};
    if (readWrite) {
      options.mode = 'readwrite';
    }
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await fileHandle.requestPermission(options)) === 'granted') {
      return true;
    }
    return false;
  }
}
