import assert from 'assert';
import { InstagramParser } from '../src/core/parsers/instagram-parser.ts';
import { XParser } from '../src/core/parsers/x-parser.ts';
import { YouTubeParser } from '../src/core/parsers/youtube-parser.ts';

console.log('=== KIỂM THỬ CÁC TÍNH NĂNG MỚI ĐƯỢC BỔ SUNG ===\n');

// 1. Test Instagram xdt_api__v1 GraphQL responses
console.log('1. Kiểm tra Instagram Modern xdt_api GraphQL:');
const mockXdtTimeline = {
  data: {
    xdt_api__v1__feed__user_timeline_graphql_connection: {
      page_info: { has_next_page: true, end_cursor: 'cursor_xdt_1' },
      edges: [
        {
          node: {
            id: '3300000000000000001',
            code: 'C_ModernReel1',
            media_type: 2,
            product_type: 'clips',
            caption: { text: 'Reel từ xdt timeline' },
            video_versions: [{ width: 1080, height: 1920, url: 'https://cdninstagram.com/xdt_reel.mp4' }],
            user: { username: 'test_user', full_name: 'Test Creator', pk: '111' },
          },
        },
      ],
    },
  },
};

const xdtResult = InstagramParser.parsePostResponse(mockXdtTimeline);
assert(xdtResult !== null, 'Phải parse được xdt_api timeline');
assert.strictEqual(xdtResult.items.length, 1);
assert.strictEqual(xdtResult.items[0].videoDetails?.bestUrl, 'https://cdninstagram.com/xdt_reel.mp4');
assert.strictEqual(xdtResult.items[0].sourceUrl, 'https://www.instagram.com/reel/C_ModernReel1/');
console.log('  ✓ Instagram: Bóc tách thành công xdt_api user timeline GraphQL');

// Test clips_items
const mockClipsItems = {
  clips_items: [
    {
      media: {
        id: '3300000000000000002',
        code: 'C_ClipsItem2',
        media_type: 2,
        caption: { text: 'Reel từ clips_items API' },
        video_versions: [{ width: 1080, height: 1920, url: 'https://cdninstagram.com/clips_item.mp4' }],
        user: { username: 'reels_master' },
      },
    },
  ],
  paging_info: { has_more: true, max_id: 'cursor_clips_2' },
};
const clipsResult = InstagramParser.parsePostResponse(mockClipsItems);
assert(clipsResult !== null, 'Phải parse được clips_items');
assert.strictEqual(clipsResult.items.length, 1);
assert.strictEqual(clipsResult.items[0].id, '3300000000000000002');
assert.strictEqual(clipsResult.items[0].videoDetails?.bestUrl, 'https://cdninstagram.com/clips_item.mp4');
console.log('  ✓ Instagram: Bóc tách thành công clips_items API');

// 2. Test X (Twitter) Pinned Tweets & Retweets & Threads
console.log('\n2. Kiểm tra X (Twitter) Pinned Tweet, Retweet và Modules:');
const mockXPinnedAndRetweet = {
  data: {
    user: {
      result: {
        timeline_v2: {
          timeline: {
            instructions: [
              {
                type: 'TimelinePinEntry',
                entry: {
                  entryId: 'pinned-1880000001',
                  content: {
                    itemContent: {
                      tweet_results: {
                        result: {
                          rest_id: '1880000001',
                          core: {
                            user_results: {
                              result: {
                                legacy: { name: 'VIP Host', screen_name: 'vip_host' },
                              },
                            },
                          },
                          legacy: {
                            id_str: '1880000001',
                            full_text: 'Pinned Video Tweet',
                            extended_entities: {
                              media: [
                                {
                                  type: 'video',
                                  media_url_https: 'https://pbs.twimg.com/thumb_pinned.jpg',
                                  video_info: {
                                    variants: [{ bitrate: 2000000, content_type: 'video/mp4', url: 'https://video.twimg.com/pinned.mp4' }],
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
              },
              {
                type: 'TimelineAddEntries',
                entries: [
                  // Tweet chứa Retweet có video
                  {
                    entryId: 'tweet-1880000002',
                    content: {
                      itemContent: {
                        tweet_results: {
                          result: {
                            rest_id: '1880000002',
                            core: {
                              user_results: {
                                result: {
                                  legacy: { name: 'Retweeter', screen_name: 'retweeter' },
                                },
                              },
                            },
                            legacy: {
                              id_str: '1880000002',
                              full_text: 'RT @original: Watch this cool video',
                              retweeted_status_result: {
                                result: {
                                  legacy: {
                                    extended_entities: {
                                      media: [
                                        {
                                          type: 'video',
                                          media_url_https: 'https://pbs.twimg.com/thumb_rt.jpg',
                                          video_info: {
                                            variants: [{ bitrate: 3000000, content_type: 'video/mp4', url: 'https://video.twimg.com/retweeted.mp4' }],
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

const xAdvanceResult = XParser.parsePostResponse(mockXPinnedAndRetweet);
assert(xAdvanceResult !== null);
assert.strictEqual(xAdvanceResult.items.length, 2, 'Phải bóc tách được cả 2 tweets (1 ghim + 1 retweet)');
assert.strictEqual(xAdvanceResult.items[0].videoDetails?.bestUrl, 'https://video.twimg.com/pinned.mp4');
assert.strictEqual(xAdvanceResult.items[1].videoDetails?.bestUrl, 'https://video.twimg.com/retweeted.mp4');
console.log('  ✓ X: Bóc tách thành công cả Tweet ghim (PinEntry) và video từ Retweet');

// 3. Test YouTube lockupViewModel & shortsLockupViewModel
console.log('\n3. Kiểm tra YouTube Modern Lockup View Models:');
const mockYouTubeModern = {
  contents: {
    sectionListRenderer: {
      contents: [
        {
          itemSectionRenderer: {
            contents: [
              {
                lockupViewModel: {
                  contentId: 'modernVid999',
                  metadata: {
                    lockupMetadataViewModel: {
                      title: { content: 'Video YouTube Giao diện 2026' },
                    },
                  },
                  image: {
                    imageViewModel: {
                      sources: [{ url: 'https://i.ytimg.com/vi/modernVid999/hqdefault.jpg' }],
                    },
                  },
                  overlayMetadata: {
                    primaryText: { content: '10:30' },
                  },
                },
              },
              {
                shortsLockupViewModel: {
                  entityId: 'shorts-shelf-item-shorts777',
                  overlayMetadata: {
                    primaryText: { content: 'Shorts triệu view cực hay' },
                  },
                  thumbnail: {
                    sources: [{ url: 'https://i.ytimg.com/vi/shorts777/hqdefault.jpg' }],
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
};

const ytModernResult = YouTubeParser.parsePostResponse(mockYouTubeModern);
assert(ytModernResult !== null);
assert.strictEqual(ytModernResult.items.length, 2);
assert.strictEqual(ytModernResult.items[0].id, 'modernVid999');
assert.strictEqual(ytModernResult.items[0].duration, 630); // 10*60 + 30
assert.strictEqual(ytModernResult.items[1].id, 'shorts777');
assert.strictEqual(ytModernResult.items[1].qualityLabel, 'Shorts');
console.log('  ✓ YouTube: Bóc tách thành công lockupViewModel & shortsLockupViewModel');

// 4. Test YouTube Channel với pageHeaderViewModel (Nghề Công Sở bug)
console.log('\n4. Kiểm tra YouTube Channel pageHeaderViewModel (fix crash React child object):');
const mockYouTubeChannelPage = {
  header: {
    pageHeaderRenderer: {
      content: {
        pageHeaderViewModel: {
          title: {
            dynamicTextViewModel: {
              text: {
                content: 'Nghề Công Sở',
              },
            },
          },
          image: {
            decoratedAvatarViewModel: {
              avatar: {
                avatarViewModel: {
                  image: {
                    sources: [{ url: 'https://yt3.googleusercontent.com/avatar_ncs.jpg' }],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  contents: {
    twoColumnBrowseResultsRenderer: {
      tabs: [],
    },
  },
};

const ytChannelResult = YouTubeParser.parsePostResponse(mockYouTubeChannelPage);
assert(ytChannelResult !== null);
assert.strictEqual(typeof ytChannelResult.author.name, 'string');
assert.strictEqual(ytChannelResult.author.name, 'Nghề Công Sở');
assert.strictEqual(typeof ytChannelResult.author.avatar, 'string');
console.log('  ✓ YouTube: Author name trích xuất chuẩn string "Nghề Công Sở" (ngăn chặn crash React)');

console.log('\n======================================================');
console.log('🎉 TOÀN BỘ LOGIC PARSER MỚI ĐÃ ĐƯỢC TEST VÀ HOẠT ĐỘNG CHUẨN XÁC! 🎉');
console.log('======================================================');
