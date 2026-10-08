# Douyin & TikTok Video Downloader Pro (Chrome Extension Manifest V3)

Tiện ích mở rộng Google Chrome cao cấp hỗ trợ quét toàn bộ video / album ảnh từ kênh Douyin và TikTok, tải hàng loạt video chất lượng cao **không dính logo watermark** trực tiếp vào thư mục trên máy tính thông qua **File System Access API**.

---

## ✨ Tính năng nổi bật

1. **Giao diện Chrome Side Panel hiện đại**:
   - Ghim cố định ở cạnh phải trình duyệt, không bị tắt khi click ra ngoài như popup thông thường.
   - Thống kê chi tiết kênh tác giả: Avatar, Tên kênh, Tổng số video quét được, Tỷ lệ hoàn thành.
2. **Bóc tách Video gốc không Watermark (Evil0ctal Algorithm)**:
   - Tự động ưu tiên luồng bitrate cao nhất (1080p/2K) trong `video.bit_rate`.
   - Loại bỏ tham số watermark `playwm` -> `play`.
   - Hỗ trợ bài đăng Album ảnh (`aweme_type == 68`): Tải toàn bộ ảnh HD và nhạc nền `.mp3`.
   - Hỗ trợ TikTok: Lấy trực tiếp luồng `video.playAddr` sạch logo.
3. **Cơ chế Bắt API & Cuộn thông minh (Jitter Anti-Bot)**:
   - Chạy trực tiếp trên trình duyệt của bạn với Cookie / IP gia đình thật, không lo bị chặn CAPTCHA hay Cloudflare.
   - Cuộn tự động với khoảng cách và thời gian ngẫu nhiên (1200ms - 2200ms) mô phỏng người dùng thật.
   - Tự động phát hiện và cảnh báo khi có CAPTCHA trượt hình.
4. **Tải trực tiếp vào Ổ cứng qua File System Access API**:
   - Khi bấm **"Tải xuống"**, trình duyệt sẽ mở cửa sổ Windows Explorer / Finder để bạn chọn thư mục lưu trữ bất kỳ trên máy tính.
   - Tự động tạo thư mục theo tên kênh: `[DOUYIN] TenKenh_ID/`.
   - Lưu trữ dạng Stream trực tiếp vào đĩa cứng (không nạp toàn bộ vào RAM, không lo đơ/lag trình duyệt khi tải hàng chục GB).
5. **Declarative Net Request chống lỗi 403 Forbidden**:
   - Tự động gán Header `Referer: https://www.douyin.com/` khi tải video từ CDN Bytedance (`*.douyinvod.com`).
6. **Lưu trữ State liên tục với IndexedDB**:
   - Toàn bộ video đã quét được tự động lưu vào IndexedDB. Đóng mở Side Panel không bao giờ bị mất danh sách.

---

## 🚀 Hướng dẫn Cài đặt vào Chrome (Chỉ mất 30 giây)

1. Mở trình duyệt Google Chrome (hoặc Microsoft Edge, Brave, Cốc Cốc).
2. Truy cập vào đường dẫn: `chrome://extensions/`
3. Bật công tắc **"Developer mode"** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
4. Bấm vào nút **"Load unpacked"** (Tải tiện ích đã giải nén).
5. Chọn thư mục `dist` trong thư mục dự án:
   ```
   c:\Users\ASUS\Desktop\douyin\dist
   ```
6. Tiện ích **Douyin & TikTok Video Downloader Pro** sẽ xuất hiện trên thanh công cụ!

---

## 📖 Hướng dẫn Sử dụng

1. **Mở kênh Douyin hoặc TikTok**:
   - Truy cập vào trang cá nhân của tác giả trên Douyin (`https://www.douyin.com/user/...`) hoặc TikTok (`https://www.tiktok.com/@...`).
2. **Mở Side Panel**:
   - Click vào icon tiện ích trên thanh công cụ của Chrome để mở bảng điều khiển ở cạnh phải màn hình.
3. **Quét video**:
   - Bấm nút **"Quét toàn bộ video"** (nút màu đỏ nổi bật).
   - Trang web sẽ tự động cuộn xuống mượt mà và các video được bắt trọn vẹn theo thời gian thực.
   - Bấm **"Tạm dừng"** bất cứ lúc nào nếu bạn muốn dừng quét.
4. **Chọn và Tải hàng loạt**:
   - Sử dụng bộ lọc danh mục (Tất cả / Chỉ Video / Chỉ Ảnh) hoặc ô tìm kiếm tiêu đề.
   - Tích chọn các video cần tải (hoặc bấm "Chọn hết").
   - Chọn số luồng tải đồng thời (ví dụ: 3 luồng hoặc 5 luồng).
   - Bấm nút **"Tải xuống (X mục)"**.
   - Cửa sổ Windows Explorer sẽ hiện lên: Chọn thư mục bạn muốn lưu file trên ổ cứng -> Bấm **Select Folder** (Chọn thư mục) và xác nhận cấp quyền ghi.
   - Toàn bộ video sẽ được tải về ổ cứng với tên chuẩn: `[YYYY-MM-DD]_[ID]_[Tieu_de].mp4`.
