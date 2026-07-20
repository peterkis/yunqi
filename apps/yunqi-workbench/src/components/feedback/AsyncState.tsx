import type { ReactNode } from 'react';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from './FeedbackStates';

export interface AsyncStateProps<T> {
  readonly data: T | null | undefined;
  readonly error: unknown;
  readonly isPending: boolean;
  readonly onRetry?: () => void;
  readonly renderData: (data: T) => ReactNode;
}

function isEmptyData<T>(data: T): boolean {
  return Array.isArray(data) && data.length === 0;
}

export function AsyncState<T>({
  data,
  error,
  isPending,
  onRetry,
  renderData,
}: AsyncStateProps<T>) {
  if (isPending) {
    return <LoadingState message="正在加载" />;
  }

  if (error !== null && error !== undefined) {
    return (
      <ErrorState
        message="加载失败"
        onRetry={onRetry}
        retryLabel="重试"
      />
    );
  }

  if (data === null || data === undefined || isEmptyData(data)) {
    return <EmptyState message="暂无数据" />;
  }

  return <>{renderData(data)}</>;
}
