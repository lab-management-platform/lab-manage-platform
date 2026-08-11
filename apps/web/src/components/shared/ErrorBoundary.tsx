import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

// React 19 + Bundler moduleResolution 下 Component 类类型不可直接访问,用运行时断言
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactComponent = (React as any).Component;

export class ErrorBoundary extends ReactComponent<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }): void {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, message: "" });
    window.location.hash = "#/dashboard";
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <main className="login-shell">
          <section className="login-panel">
            <h1>页面渲染出错</h1>
            <p style={{ color: "#c62828", marginBottom: "1rem" }}>{this.state.message}</p>
            <button className="primary" type="button" onClick={this.handleReset}>
              返回工作台
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
