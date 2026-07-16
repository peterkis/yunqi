export interface ServerConfig {
  host: string;
  port: number;
}

export function readServerConfig(
  env: NodeJS.ProcessEnv,
): ServerConfig {
  const portText = env.PORT ?? '3000';
  if (!/^\d+$/.test(portText)) {
    throw new RangeError('PORT 必须是 0 到 65535 的整数');
  }

  const port = Number(portText);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new RangeError('PORT 必须是 0 到 65535 的整数');
  }

  return {
    host: env.HOST?.trim() || '0.0.0.0',
    port,
  };
}
