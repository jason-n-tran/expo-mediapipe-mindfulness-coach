# Testing Chat History Feature

## How to Test

### 1. Create Multiple Chats
1. Open the app - you should see a blank chat screen
2. Send a message (e.g., "Hello, this is chat 1")
3. Wait for the AI response
4. Tap the **+ icon** in the top-right to create a new chat
5. You should now see a blank chat screen
6. Send a different message (e.g., "Hello, this is chat 2")
7. Create a third chat and send another message

### 2. View Chat History
1. Tap the **clock icon** in the top-right (or open the drawer and select "History")
2. You should see a list of all your chats
3. Each chat should show:
   - Auto-generated title from the first message
   - Preview of the conversation
   - Date/time last updated
   - Message count
   - "Active" badge on the current chat

### 3. Switch Between Chats
1. From the history screen, tap on any chat
2. You should be taken to that specific chat
3. Verify the messages shown match that chat's history
4. The messages should be different from other chats

### 4. Delete a Chat
1. From the history screen, tap the trash icon on any chat
2. Confirm the deletion
3. The chat should be removed from the list
4. If you deleted the active chat, you'll need to select another or create a new one

## Expected Behavior

- **Each chat is completely separate** - messages don't mix between chats
- **Switching chats is instant** - you should immediately see the correct messages
- **New chat button** creates a blank chat every time
- **Chat titles** are auto-generated from the first user message
- **Active chat** is highlighted in the history list
- **All chats persist** across app restarts

## Debug Console Logs

Watch the console for these logs to verify correct behavior:

```
[ChatScreen] Session change detected: { newSessionId, activeSessionId, ... }
[ChatScreen] Switching to session: <session-id>
[useMessageStore] Loading messages for session: <session-id>
[ChatScreen] Messages changed for session: <session-id>
[ChatScreen] Messages count: <number>
```

## Troubleshooting

If chats aren't switching:
1. Check console logs to see if session IDs are changing
2. Verify that `activeSessionId` updates when you tap a chat
3. Make sure `useMessageStore` is reloading with the new session ID

If messages are mixing between chats:
1. Check that each message has the correct `sessionId` field
2. Verify the filter in `useMessageStore` is working
3. Look at the console logs showing message session IDs
