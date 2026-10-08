import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SidePanel ErrorBoundary caught an error]:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-[#161823] text-gray-200 p-6 text-center select-none">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 shadow-lg shadow-red-500/10">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5">Đã xảy ra lỗi giao diện</h3>
          <p className="text-xs text-gray-400 max-w-[280px] leading-relaxed mb-4">
            {this.state.error?.message || 'Có lỗi khi hiển thị dữ liệu trang. Hãy bấm nút dưới đây để tải lại bảng điều khiển.'}
          </p>
          <button
            onClick={this.handleReload}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FE2C55] to-[#FF007A] text-white font-semibold text-xs rounded-lg shadow-md hover:opacity-95 cursor-pointer active:scale-95 transition-all"
          >
            <RotateCcw size={14} />
            <span>Tải lại giao diện</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
