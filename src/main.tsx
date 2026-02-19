import { StrictMode, Component, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/** 本番で未捕捉エラーを表示するためのエラーバウンダリ */
class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ color: '#b91c1c' }}>エラーが発生しました</h1>
          <pre style={{ background: '#fef2f2', padding: '1rem', overflow: 'auto' }}>
            {this.state.error.message}
          </pre>
          <p style={{ color: '#666' }}>ブラウザの開発者ツール（F12）のコンソールで詳細を確認できます。</p>
        </div>
      )
    }
    return this.props.children
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:2rem;font-family:sans-serif">エラー: <code>id="root"</code> の要素が見つかりません。</div>'
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  )
}
