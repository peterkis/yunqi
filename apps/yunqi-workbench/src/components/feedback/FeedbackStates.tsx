export interface LoadingStateProps {
  readonly message?: string;
}

export function LoadingState({
  message = '正在加载五运六气数据',
}: LoadingStateProps) {
  return (
    <div className="feedback-state feedback-state--loading" role="status">
      <span className="feedback-state__mark" aria-hidden="true">
        候
      </span>
      <p>{message}</p>
    </div>
  );
}

export interface ErrorStateProps {
  readonly message?: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
}

export function ErrorState({
  message = '暂时无法取得五运六气数据',
  onRetry,
  retryLabel = '重新尝试',
}: ErrorStateProps) {
  return (
    <div className="feedback-state feedback-state--error" role="alert">
      <span className="feedback-state__mark" aria-hidden="true">
        止
      </span>
      <div>
        <p>{message}</p>
        {onRetry ? (
          <button type="button" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface EmptyStateProps {
  readonly message?: string;
}

export function EmptyState({
  message = '当前没有可展示的五运六气数据',
}: EmptyStateProps) {
  return (
    <div className="feedback-state feedback-state--empty" role="status">
      <span className="feedback-state__mark" aria-hidden="true">
        空
      </span>
      <p>{message}</p>
    </div>
  );
}

