/**
 * YouTube Direct Stream Resolver
 * Trích xuất đường dẫn video MP4 trực tiếp từ YouTube Player API (Innertube)
 */
export class YouTubeResolver {
  /**
   * Resolve link tải MP4 progressive (có sẵn cả hình và tiếng) cho YouTube video hoặc Shorts
   */
  public static async resolveDirectUrl(videoId: string): Promise<string> {
    if (!videoId) throw new Error('Video ID không hợp lệ');

    // 1. Client ANDROID_VR: Trả về link trực tiếp googlevideo.com không bị mã hóa cipher
    try {
      const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/15.0 Chrome/90.0.4430.210 Mobile VR Safari/537.36',
          'X-YouTube-Client-Name': '28',
          'X-YouTube-Client-Version': '1.35',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: 'ANDROID_VR',
              clientVersion: '1.35',
              deviceMake: 'Oculus',
              deviceModel: 'Quest 2',
              osName: 'Android',
              osVersion: '10',
              hl: 'en',
              gl: 'US',
            },
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const formats = data.streamingData?.formats || [];
        // Lọc định dạng progressive MP4 (itag 22: 720p, itag 18: 360p) có sẵn url trực tiếp
        const mp4Formats = formats
          .filter((f: any) => f.url && f.mimeType?.includes('video/mp4'))
          .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

        if (mp4Formats.length > 0 && mp4Formats[0].url) {
          return mp4Formats[0].url;
        }

        // Nếu formats không có, lấy từ adaptiveFormats
        const adaptiveMp4 = (data.streamingData?.adaptiveFormats || [])
          .filter((f: any) => f.url && f.mimeType?.includes('video/mp4'))
          .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

        if (adaptiveMp4.length > 0 && adaptiveMp4[0].url) {
          return adaptiveMp4[0].url;
        }
      }
    } catch (err) {
      console.warn('Lỗi khi resolve qua ANDROID_VR client:', err);
    }

    // 2. Fallback: Thử với client ANDROID có đầy đủ client headers
    try {
      const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.youtube/19.16.39 (Linux; U; Android 11) gzip',
          'X-YouTube-Client-Name': '3',
          'X-YouTube-Client-Version': '19.16.39',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '19.16.39',
              androidSdkVersion: 31,
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
      console.warn('Lỗi khi resolve qua ANDROID client:', err);
    }

    throw new Error('Không thể trích xuất stream MP4 trực tiếp của YouTube. Video có thể yêu cầu đăng nhập, hạn chế bản quyền hoặc giới hạn độ tuổi.');
  }
}
