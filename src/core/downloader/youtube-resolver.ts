/**
 * YouTube Direct Stream Resolver
 * Trích xuất đường dẫn video MP4 trực tiếp từ YouTube Player API
 */
export class YouTubeResolver {
  /**
   * Resolve link tải MP4 progressive (có sẵn cả hình và tiếng) cho YouTube video hoặc Shorts
   */
  public static async resolveDirectUrl(videoId: string): Promise<string> {
    if (!videoId) throw new Error('Video ID không hợp lệ');

    // Thử gọi qua Player API với Android Client (thường trả về URL trực tiếp không bị mã hóa cipher)
    try {
      const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '19.09.37',
              androidSdkVersion: 30,
              hl: 'en',
              gl: 'US',
            },
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const formats = data.streamingData?.formats || [];
        // Lọc định dạng progressive MP4 (itag 22: 720p, itag 18: 360p)
        const mp4Formats = formats
          .filter((f: any) => f.url && f.mimeType?.includes('video/mp4'))
          .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

        if (mp4Formats.length > 0 && mp4Formats[0].url) {
          return mp4Formats[0].url;
        }
      }
    } catch (err) {
      console.warn('Lỗi khi resolve qua Android client, thử tiếp client Web:', err);
    }

    // Fallback 2: Thử gọi với client WEB_EMBEDDED
    try {
      const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: 'WEB_EMBEDDED_PLAYER',
              clientVersion: '1.20240320.01.00',
              hl: 'en',
              gl: 'US',
            },
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const formats = data.streamingData?.formats || [];
        const mp4Formats = formats
          .filter((f: any) => f.url && f.mimeType?.includes('video/mp4'))
          .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

        if (mp4Formats.length > 0 && mp4Formats[0].url) {
          return mp4Formats[0].url;
        }
      }
    } catch (err) {
      console.warn('Lỗi khi resolve qua Web client:', err);
    }

    throw new Error('Không thể trích xuất stream MP4 trực tiếp của YouTube. Video có thể bị hạn chế bản quyền hoặc giới hạn độ tuổi.');
  }
}
