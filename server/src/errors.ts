export type ApiErrorCode =
  | 'E_AUTH_REQUIRED'
  | 'E_AUTH_CODE_INVALID'
  | 'E_AUTH_CODE_EXPIRED'
  | 'E_ACCOUNT_DELETING'
  | 'E_REFRESH_REUSED'
  | 'E_DEVICE_REVOKED'
  | 'E_PERMISSION_DENIED'
  | 'E_FILE_NOT_FOUND'
  | 'E_DOCUMENT_NOT_FOUND'
  | 'E_OBJECT_MISSING'
  | 'E_BASE_VERSION_CONFLICT'
  | 'E_CLIENT_MUTATION_REUSED'
  | 'E_FILE_TOO_LARGE'
  | 'E_HASH_MISMATCH'
  | 'E_RATE_LIMITED'
  | 'E_STORAGE_UNAVAILABLE'
  | 'E_DATABASE_UNAVAILABLE'
  | 'E_INTERNAL';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly retryable: boolean,
    readonly details: Record<string, unknown> | null = null,
  ) {
    super(message);
  }
}

export function errorBody(error: ApiError, requestId: string) {
  return {
    ok: false as const,
    errorCode: error.code,
    error: error.message,
    requestId,
    retryable: error.retryable,
    details: error.details,
  };
}
