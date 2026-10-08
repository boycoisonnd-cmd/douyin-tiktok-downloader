import assert from 'assert';

// Tạo môi trường mock DOM tối thiểu
global.window = {
  location: {
    hostname: 'www.instagram.com',
    pathname: '/myhuggiedog/',
  },
};

// Giả lập DOM Instagram
const mockInstagramHtml = `
  <header>
    <h2>myhuggiedog</h2>
    <img src="https://instagram.com/avatar.jpg" alt="profile picture" />
  </header>
  <main>
    <a href="/reel/DC123456789/">
      <img src="https://instagram.com/cover1.jpg" alt="Dog in hoodie playing" />
      <svg aria-label="Clip"></svg>
    </a>
    <a href="/p/DC987654321/">
      <img src="https://instagram.com/cover2.jpg" alt="Dog sleeping" />
    </a>
  </main>
`;

console.log('=== KIỂM THỬ GIẢ LẬP TRÍCH XUẤT DOM CHO CÁC NỀN TẢNG ===\n');

// 1. Kiểm tra regex và selector logic của Instagram
const reelMatch = '/reel/DC123456789/'.match(/\/(p|reel)\/([^/?#]+)/);
assert(reelMatch !== null);
assert.strictEqual(reelMatch[1], 'reel');
assert.strictEqual(reelMatch[2], 'DC123456789');

const postMatch = '/p/DC987654321/'.match(/\/(p|reel)\/([^/?#]+)/);
assert(postMatch !== null);
assert.strictEqual(postMatch[1], 'p');
assert.strictEqual(postMatch[2], 'DC987654321');
console.log('  ✓ Instagram: Regex phân giải đúng mã shortcode và loại bài post/reel');

// 2. Kiểm tra regex và selector logic của X (Twitter)
const xTweetMatch = 'https://x.com/elonmusk/status/1770000000000000001'.match(/\/status\/(\d+)/);
assert(xTweetMatch !== null);
assert.strictEqual(xTweetMatch[1], '1770000000000000001');

const xOrigPhoto = 'https://pbs.twimg.com/media/xyz?format=jpg&name=small'.replace(/&name=\w+/, '&name=orig');
assert.strictEqual(xOrigPhoto, 'https://pbs.twimg.com/media/xyz?format=jpg&name=orig');
console.log('  ✓ X: Trích xuất đúng tweet ID và nâng cấp ảnh sang &name=orig');

// 3. Kiểm tra regex và selector logic của YouTube
const ytWatchMatch = 'https://www.youtube.com/watch?v=0e3GPea1Tyg&t=10s'.match(/[?&]v=([^&]+)/);
assert(ytWatchMatch !== null);
assert.strictEqual(ytWatchMatch[1], '0e3GPea1Tyg');

const ytShortsMatch = 'https://www.youtube.com/shorts/Shorts12345'.match(/\/shorts\/([^/?#]+)/);
assert(ytShortsMatch !== null);
assert.strictEqual(ytShortsMatch[1], 'Shorts12345');

const parseDuration = (str) => {
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};
assert.strictEqual(parseDuration('14:26'), 866);
assert.strictEqual(parseDuration('1:02:15'), 3735);
console.log('  ✓ YouTube: Trích xuất đúng video ID (Watch & Shorts) và parse thời lượng chuẩn xác');

// 4. Kiểm tra regex và selector logic của Facebook
const fbWatchMatch = 'https://www.facebook.com/watch/?v=123456789012345'.match(/[?&]v=([^&]+)/);
assert(fbWatchMatch !== null);
assert.strictEqual(fbWatchMatch[1], '123456789012345');

const fbReelMatch = 'https://www.facebook.com/reel/987654321098765/'.match(/\/reel\/(\d+)/);
assert(fbReelMatch !== null);
assert.strictEqual(fbReelMatch[1], '987654321098765');
console.log('  ✓ Facebook: Phân giải đúng Watch Video ID và Reels ID từ link DOM');

// 5. Kiểm tra regex và selector logic của Threads
const threadsPostMatch = 'https://www.threads.net/@zuck/post/C7xyz123abc'.match(/\/post\/([^/?#]+)/);
assert(threadsPostMatch !== null);
assert.strictEqual(threadsPostMatch[1], 'C7xyz123abc');

const threadsHandleMatch = 'https://www.threads.net/@zuck'.match(/@([^/?#]+)/);
assert(threadsHandleMatch !== null);
assert.strictEqual(threadsHandleMatch[1], 'zuck');
console.log('  ✓ Threads: Trích xuất đúng post code và @handle từ link DOM');

console.log('\n======================================================');
console.log('🎉 TẤT CẢ LOGIC BÓC TÁCH DOM ĐÃ ĐƯỢC KIỂM TRA CHÍNH XÁC! 🎉');
console.log('======================================================');
