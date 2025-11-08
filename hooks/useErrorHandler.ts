/**
 * React hook for error handling
 */

import { useCallback, useState } from 'react';
import { errorHandler } from '@/services/error';
import { AppError, ErrorRecovery } from '@/types/error';

interface UseErrorHandlerReturn {
  error: AppError | null;
  recovery: ErrorRecovery | null;
  handleError: (error: AppError, context?: Record<string, any>) => ErrorRecovery;
  clearError: () => void;
  retry: () => void;
}

export function useErrorHandler(onRetry?: () => void): UseErrorHandlerReturn {
  const [error, setError] = useState<AppError | null>(null);
  const [recovery, setRecovery] = useState<ErrorRecovery | null>(null);

  const handleError = useCallback((error: AppError, context?: Record<string, any>) => {
    const recoveryStrategy = errorHandler.handle(error, context);
    setError(error);
    setRecovery(recoveryStrategy);
    return recoveryStrategy;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setRecovery(null);
  }, []);

  const retry = useCallback(() => {
    clearError();
    if (onRetry) {
      onRetry();
    }
  }, [clearError, onRetry]);

  return {
    error,
    recovery,
    handleError,
    clearError,
    retry,
  };
}
