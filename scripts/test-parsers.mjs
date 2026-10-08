import assert from 'assert';
import { sanitizeFileName, formatMediaFileName } from '../src/utils/sanitize-filename.ts';
import { DouyinParser } from '../src/core/parsers/douyin-parser.ts';
import { TikTokParser } from '../src/core/parsers/tiktok-parser.ts';

console.log('--- BẮT ĐẦU KIỂM THỬ ĐƠN VỊ (UNIT TESTS) ---');

// 1. Test Sanitize Filename
console.log('1. Kiểm tra sanitizeFileName:');
const dirtyName = 'Video test: / \\ * ? < > | " [Siêu phẩm 2026]';
const clean = sanitizeFileName(dirtyName);
assert(!clean.includes(':'), 'Không được chứa dấu hai chấm');
assert(!clean.includes('/'), 'Không được chứa dấu xuyệt chéo');
assert(!clean.includes('\\'), 'Không được chứa dấu xuyệt ngược');
assert(!clean.includes('*'), 'Không được chứa dấu sao');
assert(!clean.includes('?'), 'Không được chứa dấu hỏi');
assert(!clean.includes('<'), 'Không được chứa dấu bé');
assert(!clean.includes('>'), 'Không được chứa dấu lớn');
assert(!clean.includes('|'), 'Không được chứa dấu gạch đứng');
assert(!clean.includes('"'), 'Không được chứa ngoặc kép');
console.log('  ✓ Đã làm sạch tên file an toàn cho Windows:', clean);

// 2. Test Douyin Parser với mock video và photo note
console.log('2. Kiểm tra DouyinParser:');
const mockDouyinData = {
  has_more: 1,
  max_cursor: 1712345678,
  aweme_list: [
    {
      aweme_id: '7345678901234567890',
      desc: 'Video thử nghiệm không logo 1080p',
      create_time: 1712345678,
      aweme_type: 4,
      author: {
        uid: '12345678',
        sec_uid: 'MS4wLjABAAAA...',
        nickname: 'Kênh Triệu View',
        avatar_thumb: { url_list: ['https://p3.douyinpic.com/avatar.jpeg'] },
      },
      statistics: {
        digg_count: 54321,
        comment_count: 1234,
        share_count: 567,
      },
      video: {
        duration: 45000,
        cover: { url_list: ['https://p3.douyinpic.com/cover.jpeg'] },
        bit_rate: [
          {
            bit_rate: 1500000,
            play_addr: {
              url_list: ['https://aweme.snssdk.com/aweme/v1/playwm/?video_id=v0200fg10000'],
              width: 720,
              height: 1280,
            },
          },
          {
            bit_rate: 3500000,
            play_addr: {
              url_list: ['https://v26-web.douyinvod.com/aweme/v1/play/?video_id=v0200fg10000_1080p'],
              width: 1080,
              height: 1920,
            },
          },
        ],
      },
    },
    {
      aweme_id: '7345678901234567891',
      desc: 'Album ảnh mùa xuân',
      create_time: 1712345680,
      aweme_type: 68,
      author: {
        uid: '12345678',
        nickname: 'Kênh Triệu View',
      },
      statistics: { digg_count: 999 },
      images: [
        {
          download_url_list: ['https://p3.douyinpic.com/photo1.jpeg'],
        },
        {
          download_url_list: ['https://p3.douyinpic.com/photo2.jpeg'],
        },
      ],
      music: {
        title: 'Nhạc nền hot',
        play_url: { url_list: ['https://sf3-cdn-tos.douyinstatic.com/music.mp3'] },
      },
    },
  ],
};

const douyinResult = DouyinParser.parsePostResponse(mockDouyinData);
assert(douyinResult !== null, 'Kết quả DouyinParser không được null');
assert.strictEqual(douyinResult.items.length, 2, 'Phải bóc tách đủ 2 items');

// Kiểm tra video item
const videoItem = douyinResult.items[0];
assert.strictEqual(videoItem.type, 'video');
assert.strictEqual(videoItem.videoDetails?.height, 1920, 'Phải chọn bitrate cao nhất 1080p');
assert(!videoItem.videoDetails?.bestUrl.includes('playwm'), 'Link không được dính tham số playwm');
console.log('  ✓ Video Douyin bóc tách thành công link 1080p sạch logo:', videoItem.videoDetails?.bestUrl);

// Kiểm tra album item
const albumItem = douyinResult.items[1];
assert.strictEqual(albumItem.type, 'album');
assert.strictEqual(albumItem.albumDetails?.imageUrls.length, 2, 'Album phải có 2 ảnh');
assert(albumItem.albumDetails?.musicUrl, 'Album phải có link nhạc nền');
console.log('  ✓ Album ảnh Douyin bóc tách thành công 2 ảnh + nhạc nền');

// 3. Test TikTok Parser
console.log('3. Kiểm tra TikTokParser:');
const mockTikTokData = {
  hasMore: true,
  cursor: '1712345699',
  itemList: [
    {
      id: '7399999999999999999',
      desc: 'TikTok viral video không watermark',
      createTime: 1712345690,
      author: {
        id: '998877',
        uniqueId: 'trending_creator',
        nickname: 'Trending Creator',
        avatarThumb: 'https://p16-sign.tiktokcdn.com/avatar.jpeg',
      },
      stats: {
        diggCount: 88888,
        commentCount: 2222,
        shareCount: 1111,
      },
      video: {
        duration: 30,
        cover: 'https://p16-sign.tiktokcdn.com/cover.jpeg',
        playAddr: 'https://v16-webapp.tiktok.com/clean_video.mp4',
        downloadAddr: 'https://v16-webapp.tiktok.com/watermarked_video.mp4',
      },
    },
  ],
};

const tiktokResult = TikTokParser.parsePostResponse(mockTikTokData);
assert(tiktokResult !== null);
assert.strictEqual(tiktokResult.items.length, 1);
assert.strictEqual(tiktokResult.items[0].videoDetails?.bestUrl, 'https://v16-webapp.tiktok.com/clean_video.mp4');
console.log('  ✓ TikTok bóc tách thành công link playAddr sạch logo:', tiktokResult.items[0].videoDetails?.bestUrl);

console.log('\n---> TẤT CẢ UNIT TESTS ĐỀU ĐẠT CHUẨN 100%! <---');
