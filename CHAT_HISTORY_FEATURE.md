# Chat History Feature

## Overview
The app now supports multiple separate chat sessions with full history management.

## Features

### 1. Multiple Chat Sessions
- Each chat conversation is stored in its own session
- Sessions are automatically created and managed
- Messages are isolated per session

### 2. New Chat Button
- Located in the top-right of the chat screen (+ icon)
- Creates a new blank chat session
- Automatically switches to the new session

### 3. Chat History Screen
- Access via the clock icon in the top-right or from the drawer menu
- Shows all past chat sessions sorted by most recent
- Displays:
  - Chat title (auto-generated from first message)
  - Preview of the conversation
  - Last updated date
  - Message count
  - Active session indicator

### 4. Session Management
- Tap any chat in history to continue that conversation
- Delete chats with the trash icon
- Pull to refresh the history list

### 5. Auto-Generated Titles
- Chat titles are automatically created from the first user message
- Falls back to "Chat [date]" if no message exists

## Technical Implementation

### New Files
- `services/storage/ChatHistoryStore.ts` - Manages chat sessions
- `hooks/useChatHistory.ts` - React hook for chat history
- `app/(drawer)/chat-history.tsx` - Chat history screen

### Modified Files
- `hooks/useChat.ts` - Added session support
- `hooks/useMessageStore.ts` - Added session filtering
- `app/(drawer)/chat.tsx` - Added session switching and header buttons
- `app/(drawer)/_layout.tsx` - Added chat history to drawer
- `app/(drawer)/index.tsx` - Clears session on app start

## Usage

1. **Start a new chat**: Tap the + icon in the top-right
2. **View history**: Tap the clock icon or open the drawer menu
3. **Continue a chat**: Tap any chat in the history list
4. **Delete a chat**: Tap the trash icon on any chat in history

## Data Storage
- All chats are stored locally using MMKV
- Sessions persist across app restarts
- Messages are linked to sessions via `sessionId`
