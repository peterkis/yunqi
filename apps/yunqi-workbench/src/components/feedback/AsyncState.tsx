import type { ReactNode } from 'react';

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
    return <p role="status">正在加载</p>;
  }

  if (error !== null && error !== undefined) {
    return (
      <div role="alert">
        <p>加载失败</p>
        {onRetry ? (
          <button type="button" onClick={onRetry}>
            重试
          </button>
        ) : null}
      </div>
    );
  }

  if (data === null || data === undefined || isEmptyData(data)) {
    return <p>暂无数据</p>;
  }

  return <>{renderData(data)}</>;
}
