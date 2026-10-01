import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  // 値が変わったらエラー表示を解除する (ページ移動時など)
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
  resetKey?: string;
}

/** 画面の描画中にエラーが起きても、アプリ全体を真っ白にせずメッセージを出す */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState) {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('画面の表示中にエラーが発生しました:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="max-w-xl p-6 mx-auto mt-10 text-center bg-white/70 rounded-xl">
        <p className="font-semibold text-earth-900">この画面の表示中にエラーが発生しました。</p>
        <p className="mt-2 text-sm text-earth-600">再読み込みしても直らない場合は、管理者に連絡してください。</p>
        <p className="mt-2 font-mono text-xs text-red-600 break-all">{this.state.error.message}</p>
        <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 mt-4 text-sm text-white rounded-md bg-earth-600 hover:bg-earth-700">再読み込み</button>
      </div>
    );
  }
}

export default ErrorBoundary;
