import assert from 'assert';
import { sanitizeFileName, formatMediaFileName, formatAuthorFolderName } from '../src/utils/sanitize-filename.ts';
import { DouyinParser } from '../src/core/parsers/douyin-parser.ts';
import { TikTokParser } from '../src/core/parsers/tiktok-parser.ts';
import { InstagramParser } from '../src/core/parsers/instagram-parser.ts';
import { XParser } from '../src/core/parsers/x-parser.ts';
import { YouTubeParser } from '../src/core/parsers/youtube-parser.ts';

console.log('=== BẮT ĐẦU KIỂM THỬ ĐƠN VỊ CHO 5 NỀN TẢNG ===\n');

// 1. Test Sanitize Filename & Author Folder
console.log('1. Kiểm tra sanitizeFileName và tên thư mục:');
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

const igFolder = formatAuthorFolderName('instagram', 'cristiano', 'cristiano');
assert.strictEqual(igFolder, '[INSTAGRAM]_cristiano_cristiano');
const ytFolder = formatAuthorFolderName('youtube', 'MrBeast');
assert.strictEqual(ytFolder, '[YOUTUBE]_MrBeast');
const formattedFile = formatMediaFileName(1712345678, 'vid123', 'My Video: Test!', 'mp4');
assert(formattedFile.endsWith('.mp4'));
console.log('  ✓ Đã làm sạch tên file an toàn cho Windows:', clean);
console.log('  ✓ Đã kiểm tra formatMediaFileName:', formattedFile);
console.log('  ✓ Đã định dạng tên folder chuẩn cho 5 nền tảng');

// 2. Test Douyin Parser
console.log('\n2. Kiểm tra DouyinParser:');
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
        { download_url_list: ['https://p3.douyinpic.com/photo1.jpeg'] },
        { download_url_list: ['https://p3.douyinpic.com/photo2.jpeg'] },
      ],
      music: {
        title: 'Nhạc nền hot',
        play_url: { url_list: ['https://sf3-cdn-tos.douyinstatic.com/music.mp3'] },
      },
    },
  ],
};

const douyinResult = DouyinParser.parsePostResponse(mockDouyinData);
assert(douyinResult !== null);
assert.strictEqual(douyinResult.items.length, 2);
assert.strictEqual(douyinResult.items[0].videoDetails?.height, 1920);
assert(!douyinResult.items[0].videoDetails?.bestUrl.includes('playwm'));
console.log('  ✓ Douyin: Bóc tách thành công video 1080p & Album ảnh');

// 3. Test TikTok Parser
console.log('\n3. Kiểm tra TikTokParser:');
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
      stats: { diggCount: 88888, commentCount: 2222, shareCount: 1111 },
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
assert.strictEqual(tiktokResult.items[0].videoDetails?.bestUrl, 'https://v16-webapp.tiktok.com/clean_video.mp4');
console.log('  ✓ TikTok: Bóc tách thành công playAddr không watermark');

// 4. Test Instagram Parser (Reels & Carousels)
console.log('\n4. Kiểm tra InstagramParser:');
const mockInstagramData = {
  items: [
    {
      id: '3200000000000000001_123',
      code: 'CxYzA123',
      media_type: 2, // Video/Reel
      product_type: 'clips',
      caption: { text: 'Instagram Reel siêu cuốn hút' },
      taken_at: 1712345700,
      user: { pk: '123456', username: 'ig_travel', full_name: 'Travel Official', profile_pic_url: 'https://ig.com/avatar.jpg', is_verified: true },
      video_versions: [
        { width: 720, height: 1280, url: 'https://cdninstagram.com/reel_720.mp4' },
        { width: 1080, height: 1920, url: 'https://cdninstagram.com/reel_1080.mp4' },
      ],
      like_count: 55000,
      comment_count: 890,
    },
    {
      id: '3200000000000000002_123',
      code: 'CxYzA124',
      media_type: 8, // Carousel
      caption: { text: 'Bộ sưu tập Carousel mùa hè' },
      taken_at: 1712345710,
      user: { pk: '123456', username: 'ig_travel' },
      carousel_media: [
        { media_type: 1, image_versions2: { candidates: [{ url: 'https://cdninstagram.com/photo1.jpg' }] } },
        { media_type: 1, image_versions2: { candidates: [{ url: 'https://cdninstagram.com/photo2.jpg' }] } },
        { media_type: 2, video_versions: [{ url: 'https://cdninstagram.com/clip.mp4' }] },
      ],
      like_count: 12000,
    },
  ],
  more_available: true,
  next_max_id: 'cursor_ig_123',
};

const igResult = InstagramParser.parsePostResponse(mockInstagramData);
assert(igResult !== null);
assert.strictEqual(igResult.items.length, 2);
assert.strictEqual(igResult.items[0].platform, 'instagram');
assert.strictEqual(igResult.items[0].videoDetails?.bestUrl, 'https://cdninstagram.com/reel_1080.mp4');
assert.strictEqual(igResult.items[1].albumDetails?.mixedMedia?.length, 3);
console.log('  ✓ Instagram: Bóc tách thành công Reel 1080p và Carousel hỗn hợp 3 mục');

// 5. Test X (Twitter) Parser
console.log('\n5. Kiểm tra XParser:');
const mockXData = {
  data: {
    user: {
      result: {
        timeline_v2: {
          timeline: {
            instructions: [
              {
                type: 'TimelineAddEntries',
                entries: [
                  {
                    entryId: 'tweet-1770000000000000001',
                    content: {
                      itemContent: {
                        tweet_results: {
                          result: {
                            rest_id: '1770000000000000001',
                            core: {
                              user_results: {
                                result: {
                                  legacy: {
                                    name: 'Elon Musk',
                                    screen_name: 'elonmusk',
                                    profile_image_url_https: 'https://pbs.twimg.com/profile_images/123/avatar_normal.jpg',
                                    verified: true,
                                  },
                                },
                              },
                            },
                            legacy: {
                              id_str: '1770000000000000001',
                              full_text: 'Starship flight test launch video',
                              created_at: 'Sun Apr 07 14:00:00 +0000 2026',
                              favorite_count: 240000,
                              retweet_count: 35000,
                              extended_entities: {
                                media: [
                                  {
                                    type: 'video',
                                    media_url_https: 'https://pbs.twimg.com/media/thumb.jpg',
                                    video_info: {
                                      duration_millis: 45000,
                                      variants: [
                                        { bitrate: 832000, content_type: 'video/mp4', url: 'https://video.twimg.com/ext_tw_video/720p.mp4' },
                                        { bitrate: 2176000, content_type: 'video/mp4', url: 'https://video.twimg.com/ext_tw_video/1080p.mp4' },
                                        { content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/m3u8' },
                                      ],
                                    },
                                  },
                                ],
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    },
  },
};

const xResult = XParser.parsePostResponse(mockXData);
assert(xResult !== null);
assert.strictEqual(xResult.items.length, 1);
assert.strictEqual(xResult.items[0].platform, 'x');
assert.strictEqual(xResult.items[0].videoDetails?.bestUrl, 'https://video.twimg.com/ext_tw_video/1080p.mp4');
assert.strictEqual(xResult.items[0].author.uniqueId, 'elonmusk');
assert(xResult.items[0].author.avatar.includes('_400x400.jpg'), 'Avatar phải được nâng cấp lên HD 400x400');
console.log('  ✓ X (Twitter): Bóc tách thành công MP4 1080p từ variants và nâng cấp avatar HD');

// 6. Test YouTube Parser
console.log('\n6. Kiểm tra YouTubeParser:');
const mockYouTubeData = {
  header: {
    c4TabbedHeaderRenderer: {
      channelId: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
      title: 'MrBeast',
      avatar: { thumbnails: [{ url: 'https://yt3.googleusercontent.com/avatar.jpg' }] },
    },
  },
  contents: {
    twoColumnBrowseResultsRenderer: {
      tabs: [
        {
          tabRenderer: {
            content: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        {
                          gridVideoRenderer: {
                            videoId: '0e3GPea1Tyg',
                            title: { runs: [{ text: '$1 vs $1,000,000,000 Yacht!' }] },
                            thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/vi/0e3GPea1Tyg/maxresdefault.jpg' }] },
                            lengthText: { simpleText: '14:26' },
                            viewCountText: { simpleText: '150M views' },
                          },
                        },
                        {
                          reelItemRenderer: {
                            videoId: 'Shorts12345',
                            headline: { simpleText: 'Craziest Magic Trick Ever!' },
                            thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/vi/Shorts12345/hqdefault.jpg' }] },
                            viewCountText: { simpleText: '25M views' },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },
  },
};

const ytResult = YouTubeParser.parsePostResponse(mockYouTubeData);
assert(ytResult !== null);
assert.strictEqual(ytResult.items.length, 2);
assert.strictEqual(ytResult.items[0].platform, 'youtube');
assert.strictEqual(ytResult.items[0].duration, 866); // 14*60 + 26
assert.strictEqual(ytResult.items[0].stats.playCount, 150000000);
assert.strictEqual(ytResult.items[1].qualityLabel, 'Shorts');
console.log('  ✓ YouTube: Bóc tách thành công Video (14:26, 150M views) và Shorts');

console.log('\n======================================================');
console.log('🎉 TẤT CẢ UNIT TESTS CHO CẢ 5 NỀN TẢNG ĐỀU ĐẠT CHUẨN 100%! 🎉');
console.log('======================================================');
