import {
  Component,
  type ErrorInfo,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

export class ErrorBoundaryProvider extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Safe telemetry can be attached here later. Error details never enter UI.
  }

  private readonly reset = () => {
    this.setState({ hasError: false });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div role="alert">
          <p>工作台暂时无法显示</p>
          <button type="button" onClick={this.reset}>
            重新加载界面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
