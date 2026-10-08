/**
 * Làm sạch tên file và thư mục đảm bảo an toàn tuyệt đối trên Windows, macOS và Linux.
 * Loại bỏ các ký tự cấm: \ / : * ? " < > | và các ký tự điều khiển.
 */
export function sanitizeFileName(name: string, maxLength: number = 80): string {
  if (!name || typeof name !== 'string') {
    return 'untitled';
  }

  let cleaned = name
    // Xóa ký tự điều khiển ASCII và ký tự vô hình
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    // Thay thế ký tự cấm của Windows/macOS thành gạch dưới
    .replace(/[\\/:*?"<>|]/g, '_')
    // Thay thế nhiều dấu cách hoặc gạch dưới liên tiếp
    .replace(/[\s_]+/g, ' ')
    .trim();

  // Tránh các tên file dành riêng của hệ thống Windows
  const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (reservedNames.test(cleaned)) {
    cleaned = `_${cleaned}`;
  }

  // Cắt ngắn nếu vượt quá độ dài quy định
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength).trim();
  }

  return cleaned || 'media_item';
}

/**
 * Định dạng tên file video theo chuẩn: [YYYY-MM-DD]_[ID]_[Tieu_de].mp4
 */
export function formatMediaFileName(
  createTime: number,
  id: string,
  title: string,
  extension: string = 'mp4'
): string {
  const date = new Date(createTime > 10000000000 ? createTime : createTime * 1000);
  const year = date.getFullYear() || 2026;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const cleanTitle = sanitizeFileName(title, 60);
  const cleanId = sanitizeFileName(id, 20);

  return `${dateStr}_${cleanId}_${cleanTitle}.${extension}`;
}

/**
 * Định dạng tên thư mục cho kênh tác giả: [PLATFORM]_[Tên_kênh]_[ID/Handle]
 * Hỗ trợ: Douyin, TikTok, Instagram, X, YouTube, Facebook, Threads
 */
export function formatAuthorFolderName(platform: string, authorName: string, authorId?: string): string {
  const cleanPlatform = platform.toUpperCase();
  const cleanName = sanitizeFileName(authorName, 40);
  const cleanId = authorId ? `_${sanitizeFileName(authorId, 25)}` : '';
  return `[${cleanPlatform}]_${cleanName}${cleanId}`;
}
