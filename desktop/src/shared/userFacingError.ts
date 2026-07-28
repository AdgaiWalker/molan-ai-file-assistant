const IPC_ERROR_PREFIX = /^Error invoking remote method '[^']+': Error:\s*/;

export function userFacingError(error: unknown, fallback: string): string {
  const raw = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : '';
  const message = raw.replace(IPC_ERROR_PREFIX, '').trim();
  if (!message || message === 'fetch failed' || /^E_[A-Z0-9_]+$/.test(message)) {
    return fallback;
  }
  return message;
}
