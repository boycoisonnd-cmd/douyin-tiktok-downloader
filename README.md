# Universal Social Media Video Downloader Pro (Chrome Extension Manifest V3)

> **Tiện ích mở rộng Google Chrome cao cấp (Manifest V3) tải hàng loạt video & album ảnh không watermark trực tiếp vào ổ cứng từ 7 nền tảng mạng xã hội hàng đầu.**

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](manifest.json)
[![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)](manifest.json)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-7%20Supported-orange.svg)](#-7-nền-tảng-hỗ-trợ)

---

## 🌟 7 Nền tảng Hỗ trợ

| Nền tảng | Định dạng bóc tách | Chất lượng tối đa | Tính năng đặc biệt |
| :--- | :--- | :--- | :--- |
| 🎵 **Douyin** | Video MP4, Album ảnh 图集, Nhạc nền | 1080P / 2K | Bóc tách link gốc không logo (`playwm` ➔ `play`) |
| 🎬 **TikTok** | Video MP4, Album ảnh | 1080P HD | Lấy trực tiếp `playAddr` sạch watermark |
| 📸 **Instagram** | Reels, Video Posts, Carousel hỗn hợp | 1080P Full HD | Sắp xếp `video_versions` cao nhất, bóc tách album ảnh + clip |
| 🐦 **X (Twitter)** | Video MP4, Album ảnh | 1080P Bitrate cao | Lọc variants MP4 bitrate cao nhất & ảnh gốc `?name=orig` |
| ▶️ **YouTube** | Video dài, Shorts | Full HD / 1080P | Hỗ trợ phân giải stream qua Innertube API |
| 📘 **Facebook** | Reels, Watch, Video bài đăng, Album ảnh | HD 1080P / SD | Xử lý GraphQL Relay, tiền tố `for (;;);` & stream NDJSON |
| 🧵 **Threads** | Video ngắn, Posts, Carousel hỗn hợp | 1080P HD | Bóc tách Barcelona GraphQL, chuẩn hóa `@handle` |

---

## ✨ Tính năng Nổi bật

1. **Giao diện Chrome Side Panel hiện đại**:
   - Ghim cố định ở cạnh phải trình duyệt, không bị gián đoạn hay tự động tắt như popup thông thường.
   - Nút **"Làm mới"** độc lập giúp xóa sạch danh sách cũ và chuyển đổi kênh mượt mà.
   - Tự động nhận diện khi bạn chuyển tab sang một kênh/trang cá nhân mới.

2. **Tự động phân loại thư mục lưu trữ**:
   - Tự động tạo thư mục chuẩn hóa theo từng kênh:
     - `[DOUYIN]_TenKenh_ID/`
     - `[TIKTOK]_TenKenh_@handle/`
     - `[INSTAGRAM]_cristiano_@cristiano/`
     - `[X]_elonmusk_@elonmusk/`
     - `[YOUTUBE]_MrBeast_@MrBeast/`
     - `[FACEBOOK]_TenFanpage_ID/`
     - `[THREADS]_TenTacGia_@handle/`

3. **Ghi trực tiếp vào Ổ cứng qua File System Access API & Streams API**:
   - Ghi dữ liệu trực tiếp dạng stream xuống ổ cứng, **không nạp toàn bộ file vào RAM** (tránh crash trình duyệt khi tải hàng chục GB).
   - Tự động retry tối đa 3 lần có exponential backoff nếu mạng bị ngắt quãng.
   - Tùy chỉnh số luồng tải đồng thời linh hoạt (2, 3, 5, 8 luồng).

4. **Cơ chế DeclarativeNetRequest chống lỗi 403 Forbidden**:
   - Tự động điều chỉnh `Referer` và `Origin` tương ứng cho từng CDN:
     - `douyinvod.com`, `amemv.com` ➔ `Referer: https://www.douyin.com/`
     - `tiktokcdn.com` ➔ `Referer: https://www.tiktok.com/`
     - `cdninstagram.com`, `fbcdn.net` ➔ `Referer: https://www.instagram.com/`
     - `fbsbx.com`, `video*.fbcdn.net` ➔ `Referer: https://www.facebook.com/`
     - `threads.net` ➔ `Referer: https://www.threads.net/`
     - `twimg.com` ➔ `Referer: https://x.com/`
     - `googlevideo.com` ➔ `Referer: https://www.youtube.com/`

5. **Lưu trữ liên tục qua IndexedDB**:
   - Toàn bộ danh sách quét được lưu cục bộ an toàn, đóng mở Side Panel không bao giờ bị mất dữ liệu.

---

## 🛠️ Công nghệ Sử dụng

- **Core**: Chrome Extensions Manifest V3, TypeScript 5, Vite 6, `@crxjs/vite-plugin`
- **Frontend**: React 18, TailwindCSS 3, Lucide Icons, Zustand (State Management)
- **Storage & Stream**: File System Access API, ReadableStream, IndexedDB (`idb`)
- **Concurrency**: `p-limit`

---

## 🚀 Hướng dẫn Cài đặt vào Chrome (Chỉ mất 30 giây)

1. **Tải mã nguồn về máy**:
   ```bash
   git clone https://github.com/boycoisonnd-cmd/douyin-tiktok-downloader.git
   cd douyin-tiktok-downloader
   ```

2. **Cài đặt thư viện & Biên dịch**:
   ```bash
   npm install
   npm run build
   ```

3. **Cài đặt vào Chrome**:
   - Mở trình duyệt Google Chrome (hoặc Edge, Brave, Cốc Cốc).
   - Truy cập địa chỉ: `chrome://extensions/`
   - Bật công tắc **"Developer mode"** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
   - Bấm nút **"Load unpacked"** (Tải tiện ích đã giải nén).
   - Chọn thư mục `dist` trong dự án (`douyin-tiktok-downloader/dist`).

---

## 📖 Hướng dẫn Sử dụng

1. **Mở trang cá nhân / kênh bất kỳ**:
   - Douyin: `douyin.com/user/...`
   - TikTok: `tiktok.com/@...`
   - Instagram: `instagram.com/...`
   - X: `x.com/...` hoặc `x.com/.../media`
   - YouTube: `youtube.com/@...` hoặc `youtube.com/@.../videos`
   - Facebook: `facebook.com/...` (Profile, Page, Watch, Reels)
   - Threads: `threads.net/@...` (Profile, Posts)

2. **Mở Side Panel**: Click vào biểu tượng tiện ích trên thanh công cụ của trình duyệt.

3. **Bấm "Quét toàn bộ video"**: Extension sẽ tự động cuộn trang và bóc tách danh sách video/ảnh theo thời gian thực.

4. **Tải hàng loạt**: Chọn các video/ảnh muốn tải, chọn số luồng tải và bấm **"Tải xuống"** ➔ Chọn thư mục bạn muốn lưu trên máy tính.

---

## 🧪 Kiểm thử (Unit Tests)

Dự án có sẵn bộ kiểm thử đơn vị cho toàn bộ 7 nền tảng:
```bash
# Kiểm thử bóc tách 7 nền tảng
npm test

# Kiểm thử bóc tách DOM fallback
node scripts/test-dom-parser.mjs

# Kiểm thử tính năng nâng cao
npx tsx scripts/test-new-features.mjs
```

---

## 📄 Giấy phép (License)

Dự án được phát hành dưới giấy phép [MIT](LICENSE).
