# Implementation Plan

- [x] 1. Install dependencies and configure project





  - Install tirthajyoti-ghosh/expo-llm-mediapipe package for LLM functionality
  - Install react-native-mmkv for high-performance storage
  - Install uuid for message ID generation
  - Install @react-native-community/netinfo for network status detection
  - Configure TypeScript paths for service and component imports
  - _Requirements: 1.1, 6.2_

- [x] 2. Create core type definitions and constants





  - Define ChatMessage, ModelStatus, InferenceOptions, and other core types in types/ directory
  - Create constants file with app configuration (model settings, storage settings, UI settings)
  - Define system prompts and topic-specific prompt templates in constants/prompts.ts
  - Create theme constants for consistent styling
  - _Requirements: 3.1, 3.2, 5.4_

- [x] 3. Implement Model Manager service





  - [x] 3.1 Create ModelManager class with model availability checking


    - Implement isModelAvailable() to check if model exists in cache
    - Implement getModelStatus() to return current model state
    - Implement getModelPath() to return cached model file path
    - Use Expo FileSystem for model storage operations
    - _Requirements: 1.3, 1.4_
  
  - [x] 3.2 Implement model download functionality


    - Integrate expo-llm-mediapipe download API
    - Implement downloadModel() with progress callback support
    - Add download progress tracking (bytes downloaded, percentage, ETA)
    - Store model metadata in MMKV after successful download
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.3 Add model validation and error handling


    - Implement validateModel() with checksum verification
    - Add deleteModel() for cache cleanup
    - Handle insufficient storage errors with user-friendly messages
    - Implement retry logic for failed downloads
    - _Requirements: 1.5, 9.1, 9.3_

- [x] 4. Implement Message Store service





  - [x] 4.1 Create MessageStore class with MMKV integration


    - Initialize MMKV storage instance
    - Implement saveMessage() for persisting messages
    - Implement getMessages() with optional limit parameter
    - Create message indexing structure for efficient retrieval
    - _Requirements: 4.1, 4.4, 8.1_
  
  - [x] 4.2 Add conversation history management


    - Implement getMessagesByDateRange() for date-based queries
    - Implement searchMessages() for content search
    - Add session grouping logic for organizing conversations
    - Implement automatic cleanup of messages older than retention period
    - _Requirements: 4.4, 8.4_
  
  - [x] 4.3 Implement data export and statistics


    - Create exportMessages() to generate JSON export of conversation history
    - Implement getStatistics() for conversation metrics
    - Add deleteMessages() and clearAllMessages() for data management
    - _Requirements: 8.5_

- [ ] 5. Implement Settings Store service
  - Create SettingsStore class using MMKV
  - Implement getInferenceSettings() and updateInferenceSettings()
  - Implement getUIPreferences() and updateUIPreferences()
  - Add resetToDefaults() to restore default settings
  - Validate settings ranges (temperature 0-1, maxTokens > 0, etc.)
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 6. Implement Prompt Builder service
  - [ ] 6.1 Create base system prompt construction
    - Implement buildSystemPrompt() with Buddhist and Stoic principles
    - Include coaching personality and response style guidelines
    - Make prompt configurable with PromptOptions
    - _Requirements: 3.1, 3.2, 3.3, 3.5_
  
  - [ ] 6.2 Add topic-specific prompt enhancements
    - Implement addTopicEmphasis() for anxiety, stress, relationships, purpose topics
    - Create prompt templates for each MindfulnessTopic enum value
    - Add user context integration (time of day, recent topics, emotional state)
    - _Requirements: 5.4_
  
  - [ ] 6.3 Implement quick action prompts
    - Create getQuickActionPrompt() for breathing exercises, daily reflections, etc.
    - Define prompts for all QuickAction enum values
    - Implement formatConversationHistory() for context window preparation
    - _Requirements: 5.5_

- [ ] 7. Implement LLM Service
  - [ ] 7.1 Create LLMService class with expo-llm-mediapipe integration
    - Implement initialize() to load model from cached path
    - Create wrapper for expo-llm-mediapipe inference API
    - Implement isReady() to check service initialization state
    - Add getCapabilities() to return model information
    - _Requirements: 6.2, 7.1_
  
  - [ ] 7.2 Implement streaming response generation
    - Create generateResponse() with token streaming callback
    - Implement token buffering for smooth UI updates (buffer 2-3 tokens)
    - Add context window management to fit within model token limits
    - Include system prompt in every inference request
    - _Requirements: 2.2, 4.2, 4.3, 7.3_
  
  - [ ] 7.3 Add inference control and error handling
    - Implement stopGeneration() to cancel ongoing inference
    - Add inference timeout handling (30 second default)
    - Implement retry logic for transient inference errors
    - Handle out-of-memory errors gracefully
    - _Requirements: 7.1, 9.2_

- [ ] 8. Create custom hooks for state management
  - [ ] 8.1 Implement useModelManager hook
    - Wrap ModelManager service with React state
    - Provide model status, download progress, and control functions
    - Handle model download lifecycle
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [ ] 8.2 Implement useMessageStore hook
    - Wrap MessageStore service with React state
    - Provide messages array and CRUD operations
    - Handle automatic message loading on mount
    - _Requirements: 4.1, 4.5_
  
  - [ ] 8.3 Implement useLLM hook
    - Wrap LLMService with React state
    - Manage inference state (idle, generating, error)
    - Provide generateResponse function with streaming support
    - _Requirements: 2.2, 7.1_
  
  - [ ] 8.4 Implement useChat hook
    - Combine useMessageStore and useLLM for complete chat functionality
    - Manage conversation state and message flow
    - Handle sending messages and receiving responses
    - Integrate PromptBuilder for system prompt construction
    - _Requirements: 2.1, 2.4, 4.2_

- [ ] 9. Build Model Download UI components
  - [ ] 9.1 Create ModelDownload component
    - Display download progress bar with percentage
    - Show download speed and estimated time remaining
    - Add cancel button for aborting download
    - Implement retry button for failed downloads
    - Use Gluestack-UI components for consistent styling
    - _Requirements: 1.2, 9.1_
  
  - [ ] 9.2 Create ModelStatus component
    - Display current model status (available, downloading, missing)
    - Show model metadata (size, version, last validated)
    - Add re-download option with confirmation dialog
    - _Requirements: 1.4, 1.5_

- [ ] 10. Build chat interface components
  - [ ] 10.1 Create ChatMessage component
    - Render message content with role-based styling (user right, assistant left)
    - Implement entrance animation using react-native-reanimated
    - Add optional timestamp display
    - Implement long-press gesture for message actions (copy, delete)
    - Use NativeWind for styling
    - _Requirements: 2.1, 2.6, 10.4_
  
  - [ ] 10.2 Create StreamingText component
    - Display text with character-by-character reveal animation
    - Show cursor animation during active streaming
    - Optimize rendering performance for long text
    - Make animation speed configurable
    - _Requirements: 2.2, 7.3_
  
  - [ ] 10.3 Create TypingIndicator component
    - Implement animated dots using react-native-reanimated
    - Add smooth fade in/out transitions
    - Minimize performance impact with native driver
    - _Requirements: 7.5_
  
  - [ ] 10.4 Create ChatInput component
    - Build multi-line text input with auto-grow behavior
    - Add send button with haptic feedback using gesture handler
    - Implement disabled state during inference
    - Add keyboard-aware scrolling
    - Style with Gluestack-UI and NativeWind
    - _Requirements: 2.3, 2.4, 10.1_
  
  - [ ] 10.5 Create QuickActions component
    - Build horizontal scrollable list of action buttons
    - Add icons and labels for each quick action
    - Implement haptic feedback on button press
    - Add entrance animation for component
    - _Requirements: 5.5_

- [ ] 11. Build main chat screen
  - [ ] 11.1 Create chat screen layout
    - Set up FlashList or FlatList for message rendering
    - Implement inverted list for bottom-to-top message flow
    - Add pull-to-refresh gesture for reloading history
    - Integrate ChatInput at bottom with keyboard avoidance
    - _Requirements: 2.1, 10.2_
  
  - [ ] 11.2 Integrate chat functionality
    - Connect useChat hook for message management
    - Implement message sending flow (user message → LLM response)
    - Add streaming response display with StreamingText
    - Show TypingIndicator during inference
    - Handle errors with user-friendly messages
    - _Requirements: 2.2, 2.4, 7.1, 9.2_
  
  - [ ] 11.3 Add QuickActions integration
    - Place QuickActions component above ChatInput
    - Handle quick action selection to send pre-defined prompts
    - Integrate with PromptBuilder for action-specific prompts
    - _Requirements: 5.5_
  
  - [ ] 11.4 Implement auto-scroll behavior
    - Scroll to bottom when new messages arrive
    - Debounce scroll during streaming for performance
    - Allow manual scrolling without auto-scroll interference
    - _Requirements: 2.1, 7.3_

- [ ] 12. Create settings screen
  - [ ] 12.1 Build inference settings panel
    - Add sliders for temperature (0-1) and maxTokens (128-2048)
    - Display current values with labels
    - Implement real-time settings updates using SettingsStore
    - Add reset to defaults button
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 12.2 Build UI preferences panel
    - Add theme selector (light/dark/auto)
    - Add font size selector (small/medium/large)
    - Add toggles for haptic feedback, timestamps, animations
    - _Requirements: 10.1, 10.4, 10.5_
  
  - [ ] 12.3 Add model management section
    - Display model status and metadata
    - Add button to re-download model with confirmation
    - Show storage usage information
    - Add option to delete model cache
    - _Requirements: 1.4, 1.5_

- [ ] 13. Implement app initialization flow
  - [ ] 13.1 Create app startup logic
    - Check model availability on app launch
    - Show model download screen if model is missing
    - Load conversation history from MessageStore
    - Initialize LLMService with cached model
    - _Requirements: 1.3, 1.4, 4.5_
  
  - [ ] 13.2 Handle first-time user experience
    - Automatically trigger model download on first launch
    - Show welcome message explaining the app
    - Guide user through initial setup
    - _Requirements: 1.1, 1.2_
  
  - [ ] 13.3 Implement offline detection
    - Use @react-native-community/netinfo to detect connectivity
    - Show offline indicator when network is unavailable
    - Ensure all features work without network after model download
    - _Requirements: 6.1, 6.4_

- [ ] 14. Add navigation and routing
  - Update drawer navigation to include chat and settings screens
  - Set chat screen as default route
  - Add navigation between chat and settings
  - Implement proper screen transitions with animations
  - _Requirements: 2.1_

- [ ] 15. Implement error handling and logging
  - Create ErrorHandler utility class
  - Implement error categorization (model, inference, storage, network)
  - Add user-friendly error messages for each error type
  - Implement error logging for diagnostics
  - Add retry mechanisms with exponential backoff
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 16. Add performance optimizations
  - Implement message component memoization
  - Add token buffering for streaming display
  - Use native driver for all animations
  - Implement virtualized list for long conversations
  - Optimize MMKV read/write operations with batching
  - _Requirements: 7.2, 7.3, 7.4_

- [ ] 17. Polish UI and animations
  - [ ] 17.1 Implement message animations
    - Add entrance animations for new messages
    - Create smooth transitions for streaming text
    - Add haptic feedback for user interactions
    - _Requirements: 2.6, 10.1_
  
  - [ ] 17.2 Apply consistent theming
    - Define color scheme aligned with mindfulness aesthetics
    - Apply consistent typography across all screens
    - Ensure proper contrast and accessibility
    - _Requirements: 10.3_
  
  - [ ] 17.3 Add micro-interactions
    - Implement button press animations
    - Add loading states for async operations
    - Create smooth screen transitions
    - _Requirements: 10.5_

- [ ] 18. Testing and validation
  - [ ] 18.1 Test model download flow
    - Verify download progress accuracy
    - Test cancellation and retry functionality
    - Validate model caching and persistence
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 18.2 Test chat functionality
    - Verify message sending and receiving
    - Test streaming response display
    - Validate conversation history persistence
    - Test quick actions and settings integration
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 18.3 Test offline functionality
    - Verify app works without network connectivity
    - Test model persistence across app restarts
    - Validate message storage without network
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 18.4 Test error scenarios
    - Simulate insufficient storage
    - Test model corruption handling
    - Verify inference error recovery
    - Test network failure during download
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ] 18.5 Performance testing
    - Measure time to first token
    - Verify 60fps during animations
    - Test with long conversation histories
    - Monitor memory usage during inference
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
