# Error Handling Service

Centralized error handling and logging system for the Offline Mindfulness Coach app.

## Features

- **Error Categorization**: Automatically categorizes errors into Model, Inference, Storage, Network, or Unknown
- **User-Friendly Messages**: Converts technical errors into clear, actionable messages for users
- **Retry Logic**: Built-in exponential backoff retry mechanism
- **Error Logging**: In-memory logging for diagnostics and troubleshooting
- **Recovery Strategies**: Automatic determination of appropriate recovery actions

## Usage

### Basic Error Handling

```typescript
import { errorHandler, AppModelError } from '@/services/error';

try {
  // Some operation that might fail
  await downloadModel();
} catch (error) {
  // Create a typed error
  const appError = AppModelError.downloadFailed('Network timeout');
  
  // Handle the error
  const recovery = errorHandler.handle(appError);
  
  // Act on recovery strategy
  if (recovery.action === 'retry') {
    // Show retry UI
  }
}
```

### Using Specific Error Classes

```typescript
import { AppModelError, AppInferenceError, AppStorageError, AppNetworkError } from '@/services/error';

// Model errors
throw AppModelError.notFound();
throw AppModelError.corrupted();
throw AppModelError.insufficientStorage(500, 100); // required MB, available MB

// Inference errors
throw AppInferenceError.timeout(30000);
throw AppInferenceError.outOfMemory();
throw AppInferenceError.notInitialized();

// Storage errors
throw AppStorageError.writeFailed('messages', 'Permission denied');
throw AppStorageError.storageFull(100, 50);

// Network errors
throw AppNetworkError.offline();
throw AppNetworkError.timeout('https://api.example.com', 5000);
```

### Retry with Exponential Backoff

```typescript
import { errorHandler } from '@/services/error';

const result = await errorHandler.withRetry(
  async () => {
    // Operation that might fail
    return await fetchData();
  },
  {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  (attempt, error) => {
    console.log(`Retry attempt ${attempt}: ${error.message}`);
  }
);
```

### Using the React Hook

```typescript
import { useErrorHandler } from '@/hooks';
import { AppModelError } from '@/services/error';

function MyComponent() {
  const { error, recovery, handleError, clearError, retry } = useErrorHandler(() => {
    // Retry logic
    downloadModel();
  });

  const handleDownload = async () => {
    try {
      await downloadModel();
    } catch (err) {
      const appError = AppModelError.downloadFailed('Connection lost');
      handleError(appError);
    }
  };

  return (
    <View>
      {error && (
        <ErrorDisplay
          error={error}
          recovery={recovery}
          onRetry={retry}
          onDismiss={clearError}
        />
      )}
      <Button onPress={handleDownload}>Download Model</Button>
    </View>
  );
}
```

### Creating Custom Errors

```typescript
import { errorHandler, ErrorCategory } from '@/services/error';

// From a caught error
try {
  // Some operation
} catch (error) {
  const appError = errorHandler.createError(
    error,
    ErrorCategory.Storage,
    'CUSTOM_ERROR_CODE',
    { additionalContext: 'value' }
  );
  errorHandler.handle(appError);
}
```

### Accessing Error Logs

```typescript
import { errorHandler } from '@/services/error';

// Get recent errors
const recentErrors = errorHandler.getErrorLogs(10);

// Get error statistics
const stats = errorHandler.getStatistics();
console.log(`Total errors: ${stats.total}`);
console.log(`Model errors: ${stats.byCategory.model}`);
console.log(`Recoverable: ${stats.recoverable}`);

// Export logs
const logsJson = errorHandler.exportLogs();

// Clear logs
errorHandler.clearLogs();
```

## Error Categories

### Model Errors
- Model not found
- Model corrupted
- Download failed
- Insufficient storage
- Validation failed

### Inference Errors
- Timeout
- Out of memory
- Not initialized
- Invalid input
- General failure
- Cancelled

### Storage Errors
- Write failed
- Read failed
- Storage full
- Data corrupted
- Permission denied

### Network Errors
- Timeout
- Offline
- Server error
- Request failed

## Recovery Actions

The error handler automatically determines the appropriate recovery action:

- **retry**: Error is recoverable, retry the operation
- **fallback**: Use alternative approach
- **abort**: Error is not recoverable, stop operation
- **ignore**: Error can be safely ignored

## Best Practices

1. **Use Specific Error Classes**: Use `ModelError`, `InferenceError`, etc. instead of generic errors
2. **Provide Context**: Include relevant details in `technicalDetails` for debugging
3. **Handle Recovery**: Always check the recovery action and respond appropriately
4. **Log Errors**: The error handler logs automatically, but you can add custom logging
5. **User-Friendly Messages**: The error handler generates user messages, but you can customize them
6. **Test Error Paths**: Ensure error handling works correctly in all failure scenarios

## Integration with Existing Services

### Model Manager

```typescript
import { errorHandler, AppModelError } from '@/services/error';

class ModelManager {
  async downloadModel(onProgress: (progress: number) => void): Promise<void> {
    return errorHandler.withRetry(
      async () => {
        try {
          // Download logic
        } catch (error) {
          throw AppModelError.downloadFailed(error.message);
        }
      },
      { maxAttempts: 3 },
      (attempt) => {
        console.log(`Download retry attempt ${attempt}`);
      }
    );
  }
}
```

### LLM Service

```typescript
import { errorHandler, AppInferenceError } from '@/services/error';

class LLMService {
  async generateResponse(prompt: string): Promise<string> {
    if (!this.isInitialized) {
      throw AppInferenceError.notInitialized();
    }

    try {
      return await this.inference(prompt);
    } catch (error) {
      const appError = AppInferenceError.failed(error.message);
      errorHandler.handle(appError);
      throw appError;
    }
  }
}
```

### Message Store

```typescript
import { errorHandler, AppStorageError } from '@/services/error';

class MessageStore {
  async saveMessage(message: ChatMessage): Promise<void> {
    try {
      await this.storage.set(message.id, JSON.stringify(message));
    } catch (error) {
      throw AppStorageError.writeFailed(message.id, error.message);
    }
  }
}
```

## Configuration

The error handler uses sensible defaults, but you can customize retry behavior:

```typescript
const customRetryConfig = {
  maxAttempts: 5,        // Maximum retry attempts
  initialDelay: 2000,    // Initial delay in ms
  maxDelay: 30000,       // Maximum delay in ms
  backoffMultiplier: 3,  // Exponential backoff multiplier
};

await errorHandler.withRetry(operation, customRetryConfig);
```

## Debugging

In development mode (`__DEV__`), errors are logged to the console with full details:

```
[ErrorHandler] {
  category: 'model',
  code: 'MODEL_NOT_FOUND',
  message: 'Model not found in cache',
  userMessage: 'The AI model is not available. Please download it to continue.',
  recoverable: true,
  context: { ... },
  technicalDetails: { ... }
}
```

The `ErrorDisplay` component also shows technical details in development mode.
