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
  readonly loadingMessage?: string;
  readonly errorMessage?: string;
  readonly emptyMessage?: string;
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
  loadingMessage = '正在加载',
  errorMessage = '加载失败',
  emptyMessage = '暂无数据',
  onRetry,
  renderData,
}: AsyncStateProps<T>) {
  if (isPending) {
    return <LoadingState message={loadingMessage} />;
  }

  if (error !== null && error !== undefined) {
    return (
      <ErrorState
        message={errorMessage}
        onRetry={onRetry}
        retryLabel="重试"
      />
    );
  }

  if (data === null || data === undefined || isEmptyData(data)) {
    return <EmptyState message={emptyMessage} />;
  }

  return <>{renderData(data)}</>;
}
