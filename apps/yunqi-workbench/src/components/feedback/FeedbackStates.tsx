import { Button } from '../design/Button';
import { InfoCard } from '../design/InfoCard';

export interface LoadingStateProps {
  readonly message?: string;
}

export function LoadingState({
  message = '正在加载五运六气数据',
}: LoadingStateProps) {
  return (
    <div className="drilldown-feedback">
      <InfoCard label="加载中" compact>
        <div role="status"><p className="num">{message}</p></div>
      </InfoCard>
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
    <div className="drilldown-feedback">
      <InfoCard label="暂未完成" compact>
        <div role="alert">
          <p className="num">{message}</p>
          {onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
        </div>
      </InfoCard>
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
    <div className="drilldown-feedback drilldown-feedback--empty">
      <InfoCard label="待查看" compact>
        <div role="status"><p className="num">{message}</p></div>
      </InfoCard>
    </div>
  );
}
