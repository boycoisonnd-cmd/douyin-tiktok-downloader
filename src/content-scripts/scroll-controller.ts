export type ScrollStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'captcha_detected';

export class ScrollController {
  private isScanning: boolean = false;
  private scrollTimer: any = null;
  private consecutiveSameHeightCount: number = 0;
  private lastScrollHeight: number = 0;
  private onStatusChange?: (status: ScrollStatus, message?: string) => void;
  private onScrollStep?: () => void;

  constructor(
    onStatusChange?: (status: ScrollStatus, message?: string) => void,
    onScrollStep?: () => void
  ) {
    this.onStatusChange = onStatusChange;
    this.onScrollStep = onScrollStep;
  }

  public start() {
    if (this.isScanning) return;
    this.isScanning = true;
    this.consecutiveSameHeightCount = 0;
    this.lastScrollHeight = document.documentElement.scrollHeight;
    this.onStatusChange?.('running', 'Đang tự động cuộn trang quét video...');
    this.scheduleNextScroll();
  }

  public stop(reason: string = 'Đã dừng quét') {
    this.isScanning = false;
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = null;
    }
    this.onStatusChange?.('stopped', reason);
  }

  public pause() {
    this.isScanning = false;
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = null;
    }
    this.onStatusChange?.('paused', 'Đã tạm dừng cuộn trang');
  }

  public getStatus(): ScrollStatus {
    return this.isScanning ? 'running' : 'idle';
  }

  private scheduleNextScroll() {
    if (!this.isScanning) return;

    // Thời gian chờ ngẫu nhiên: X, Instagram, Facebook và Threads dùng delay dài hơn để chống rate limit
    const host = window.location.hostname;
    const isStrictPlatform =
      host.includes('instagram.com') ||
      host.includes('x.com') ||
      host.includes('twitter.com') ||
      host.includes('facebook.com') ||
      host.includes('threads.net');
    const minDelay = isStrictPlatform ? 1400 : 900;
    const maxJitter = isStrictPlatform ? 1000 : 600;
    const randomDelay = Math.floor(Math.random() * maxJitter) + minDelay;

    this.scrollTimer = setTimeout(() => {
      this.performScrollStep();
    }, randomDelay);
  }

  private performScrollStep() {
    if (!this.isScanning) return;

    // 1. Kiểm tra CAPTCHA thực sự chặn màn hình
    if (this.detectCaptcha()) {
      this.stop('Phát hiện xác minh CAPTCHA! Vui lòng hoàn thành trên trang rồi bấm Quét tiếp.');
      this.onStatusChange?.('captcha_detected', 'Phát hiện xác minh bảo mật hoặc CAPTCHA!');
      return;
    }

    const currentScrollY = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    // Kiểm tra xem trang có mở rộng thêm chiều cao không
    if (scrollHeight === this.lastScrollHeight && (currentScrollY + clientHeight >= scrollHeight - 300)) {
      this.consecutiveSameHeightCount++;
      if (this.consecutiveSameHeightCount >= 6) {
        this.stop('Đã cuộn đến hết trang (không còn video mới).');
        return;
      }
    } else {
      this.consecutiveSameHeightCount = 0;
      this.lastScrollHeight = scrollHeight;
    }

    // Khoảng cách cuộn ngẫu nhiên (500px - 850px)
    const randomDistance = Math.floor(Math.random() * 350) + 500;
    
    window.scrollBy({
      top: randomDistance,
      left: 0,
      behavior: 'smooth',
    });

    // Kích hoạt callback quét DOM sau khi cuộn
    try {
      this.onScrollStep?.();
    } catch (e) {}

    this.scheduleNextScroll();
  }

  /**
   * Phát hiện popup CAPTCHA thực sự gây chặn thao tác
   */
  private detectCaptcha(): boolean {
    const blockingSelectors = [
      '#captcha-verify-image',
      '.captcha_verify_container',
      '.secsdk-captcha-drag-icon',
      '.verify-bar-close',
      '.tiktok-captcha-container',
      'iframe[src*="arkose"]',
      '[data-testid="checkpoint_title"]',
      '#checkpointProvider',
      '[data-pagelet="LoginBar"]',
      '[data-testid="royal_login_form"]',
      '.login_form_container',
      'form[action*="checkpoint"]',
    ];

    for (const selector of blockingSelectors) {
      const el = document.querySelector(selector);
      if (el && (el as HTMLElement).offsetParent !== null) {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.width > 150 && rect.height > 150) {
          return true;
        }
      }
    }
    return false;
  }
}
