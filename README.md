# Universal Social Media Video Downloader Pro (Chrome Extension Manifest V3)

Tiện ích mở rộng Google Chrome cao cấp hỗ trợ quét toàn bộ video / album ảnh từ **5 nền tảng mạng xã hội hàng đầu**:
1. 🎵 **Douyin** (Video 1080P/2K không watermark & Album ảnh 图集 kèm nhạc)
2. 🎬 **TikTok** (Video sạch logo playAddr & Album ảnh)
3. 📸 **Instagram** (Reels 1080P, Posts và Carousels hỗn hợp ảnh + video)
4. 🐦 **X (Twitter)** (Video MP4 bitrate cao nhất & Ảnh gốc `orig` chất lượng cao)
5. ▶️ **YouTube** (YouTube Videos và Shorts độ nét cao)

Tất cả video được tải hàng loạt trực tiếp vào thư mục trên máy tính của bạn thông qua **File System Access API**.

---

## ✨ Tính năng nổi bật

1. **Hỗ trợ trọn vẹn 5 nền tảng mạng xã hội**:
   - Tự động nhận diện thương hiệu, tên tác giả, avatar và tích xanh (verified) trên từng nền tảng.
   - Tự động tạo thư mục chuẩn hóa theo từng kênh:
     - `[DOUYIN]_TenKenh_ID/`
     - `[TIKTOK]_TenKenh_@handle/`
     - `[INSTAGRAM]_cristiano_@cristiano/`
     - `[X]_elonmusk_@elonmusk/`
     - `[YOUTUBE]_MrBeast_@MrBeast/`
2. **Giao diện Chrome Side Panel hiện đại**:
   - Ghim cố định ở cạnh phải trình duyệt, không bị gián đoạn hay tự động tắt như popup.
   - Nút **"Làm mới"** độc lập giúp xóa sạch danh sách cũ và chuyển đổi kênh mượt mà.
   - Tự động thông báo khi bạn chuyển tab sang một kênh/trang cá nhân mới.
3. **Bóc tách luồng gốc chất lượng cao nhất (No Watermark)**:
   - Douyin: Ưu tiên `bit_rate` cao nhất, đổi `playwm` thành `play`.
   - TikTok: Trích xuất trực tiếp `video.playAddr` sạch logo.
   - Instagram: Sắp xếp `video_versions` lấy độ phân giải cao nhất, xử lý Carousel hỗn hợp (vừa có ảnh vừa có clip).
   - X (Twitter): Phân tích GraphQL, lọc variants MP4 bitrate cao nhất và ảnh `?name=orig`.
   - YouTube: Hỗ trợ cả video thông thường và Shorts.
4. **Cơ chế DeclarativeNetRequest chống lỗi 403 Forbidden**:
   - Tự động sửa Header `Referer` và `Origin` tương ứng cho từng CDN:
     - `douyinvod.com`, `amemv.com` -> `Referer: https://www.douyin.com/`
     - `tiktokcdn.com` -> `Referer: https://www.tiktok.com/`
     - `cdninstagram.com`, `fbcdn.net` -> `Referer: https://www.instagram.com/`
     - `twimg.com` -> `Referer: https://x.com/`
     - `googlevideo.com` -> `Referer: https://www.youtube.com/`
5. **Ghi trực tiếp vào Ổ cứng qua Streams API**:
   - Không nạp toàn bộ file vào RAM (tránh crash trình duyệt khi tải hàng chục GB).
   - Tự động retry 3 lần có exponential backoff nếu mạng chập chờn.
   - Hỗ trợ chọn số luồng tải đồng thời (2, 3, 5, 8 luồng).
6. **Lưu trữ liên tục qua IndexedDB**:
   - Toàn bộ danh sách quét được lưu cục bộ an toàn, đóng mở Side Panel không bao giờ bị mất dữ liệu.

---

## 🚀 Hướng dẫn Cài đặt vào Chrome (Chỉ mất 30 giây)

1. Mở trình duyệt Google Chrome (hoặc Edge, Brave, Cốc Cốc).
2. Truy cập vào: `chrome://extensions/`
3. Bật công tắc **"Developer mode"** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
4. Bấm nút **"Load unpacked"** (Tải tiện ích đã giải nén).
5. Chọn thư mục `dist` trong dự án:
   ```
   c:\Users\ASUS\Desktop\douyin\dist
   ```
6. Tiện ích đã sẵn sàng hoạt động!

---

## 📖 Hướng dẫn Sử dụng

1. **Mở trang cá nhân / kênh bất kỳ**:
   - Douyin: `douyin.com/user/...`
   - TikTok: `tiktok.com/@...`
   - Instagram: `instagram.com/...`
   - X: `x.com/...` hoặc `x.com/.../media`
   - YouTube: `youtube.com/@...` hoặc `youtube.com/@.../videos`
2. **Mở Side Panel**: Click vào biểu tượng tiện ích trên thanh công cụ của trình duyệt.
3. **Bấm "Quét toàn bộ video"**: Extension sẽ tự động cuộn và bóc tách danh sách video/ảnh theo thời gian thực.
4. **Tải hàng loạt**: Chọn các video muốn tải, chọn số luồng tải và bấm **"Tải xuống"** -> Chọn thư mục bạn muốn lưu trên máy tính.
