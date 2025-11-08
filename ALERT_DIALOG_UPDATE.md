# Alert Dialog Update

## Changes Made

Replaced the native React Native `Alert` component with the stylized gluestack-ui `AlertDialog` component in the chat history screen.

### Before
```tsx
Alert.alert(
  'Delete Chat',
  `Are you sure you want to delete "${session.title}"?`,
  [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        await deleteChat(session.id);
      },
    },
  ]
);
```

### After
```tsx
<AlertDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
  <AlertDialogBackdrop />
  <AlertDialogContent>
    <AlertDialogHeader>
      <Text style={styles.dialogTitle}>Delete Chat</Text>
    </AlertDialogHeader>
    <AlertDialogBody>
      <Text style={styles.dialogText}>
        Are you sure you want to delete "{sessionToDelete?.title}"? 
        This action cannot be undone.
      </Text>
    </AlertDialogBody>
    <AlertDialogFooter>
      <Button variant="outline" action="secondary" onPress={handleCancel}>
        <ButtonText>Cancel</ButtonText>
      </Button>
      <Button action="negative" onPress={confirmDelete}>
        <ButtonText>Delete</ButtonText>
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Benefits

1. **Consistent Design**: Matches the app's design system using gluestack-ui components
2. **Better UX**: Animated backdrop and content with smooth transitions
3. **More Customizable**: Full control over styling and layout
4. **Accessible**: Built-in accessibility features from gluestack-ui
5. **Modern Look**: Professional dialog with proper spacing and typography

## Components Used

- `AlertDialog` - Main dialog container
- `AlertDialogBackdrop` - Semi-transparent overlay
- `AlertDialogContent` - Dialog content box with animations
- `AlertDialogHeader` - Header section with title
- `AlertDialogBody` - Body section with message
- `AlertDialogFooter` - Footer section with action buttons
- `Button` - Styled button component with variants
- `ButtonText` - Button text component

## State Management

Added two new state variables:
- `deleteDialogOpen` - Controls dialog visibility
- `sessionToDelete` - Stores the session to be deleted

This allows for proper dialog state management and prevents race conditions.
