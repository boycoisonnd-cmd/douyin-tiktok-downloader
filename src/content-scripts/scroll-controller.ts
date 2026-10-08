export type ScrollStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'captcha_detected';

export class ScrollController {
  private isScanning: boolean = false;
  private scrollTimer: any = null;
  private consecutiveSameHeightCount: number = 0;
  private lastScrollHeight: number = 0;
  private onStatusChange?: (status: ScrollStatus, message?: string) => void;

  constructor(onStatusChange?: (status: ScrollStatus, message?: string) => void) {
    this.onStatusChange = onStatusChange;
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

    // Thời gian chờ ngẫu nhiên giữa các lần cuộn (1200ms - 2200ms) để giống người dùng thật
    const randomDelay = Math.floor(Math.random() * 1000) + 1200;

    this.scrollTimer = setTimeout(() => {
      this.performScrollStep();
    }, randomDelay);
  }

  private performScrollStep() {
    if (!this.isScanning) return;

    // 1. Kiểm tra CAPTCHA
    if (this.detectCaptcha()) {
      this.stop('Phát hiện xác minh CAPTCHA! Vui lòng hoàn thành xác minh trên trang rồi bấm Quét tiếp.');
      this.onStatusChange?.('captcha_detected', 'Phát hiện xác minh CAPTCHA trên màn hình!');
      return;
    }

    const currentScrollY = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    // Kiểm tra xem trang có mở rộng thêm chiều cao không
    if (scrollHeight === this.lastScrollHeight && (currentScrollY + clientHeight >= scrollHeight - 300)) {
      this.consecutiveSameHeightCount++;
      if (this.consecutiveSameHeightCount >= 5) {
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

    this.scheduleNextScroll();
  }

  /**
   * Phát hiện popup CAPTCHA / trượt hình của Douyin hoặc TikTok
   */
  private detectCaptcha(): boolean {
    const captchaSelectors = [
      '#captcha-verify-image',
      '.captcha_verify_container',
      '.secsdk-captcha-drag-icon',
      '[id*="captcha"]',
      '.verify-bar-close',
      '.tiktok-captcha-container',
    ];

    for (const selector of captchaSelectors) {
      const el = document.querySelector(selector);
      if (el && (el as HTMLElement).offsetParent !== null) {
        return true;
      }
    }
    return false;
  }
}
