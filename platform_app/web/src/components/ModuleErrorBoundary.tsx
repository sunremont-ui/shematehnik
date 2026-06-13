import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  moduleName: string;
  children: ReactNode;
  onError?: (message: string) => void;
}

interface State {
  message: string | null;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const msg = error instanceof Error ? error.message : String(error);
    this.props.onError?.(`${this.props.moduleName}: ${msg}`);
    console.error(`Module crashed: ${this.props.moduleName}`, error, info.componentStack);
  }

  render() {
    if (!this.state.message) return this.props.children;
    return (
      <div className="card" role="alert" style={{ display: "grid", gap: 10 }}>
        <div>
          <div className="muted" style={{ fontSize: 11 }}>MODULE ERROR</div>
          <h2 style={{ margin: "4px 0 0" }}>{this.props.moduleName}</h2>
        </div>
        <pre className="code" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{this.state.message}</pre>
        <button className="btn primary" onClick={() => this.setState({ message: null })}>Reload module</button>
      </div>
    );
  }
}
