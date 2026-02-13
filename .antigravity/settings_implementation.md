# Settings Page Implementation - Complete

## Overview
Implemented comprehensive Settings page with store management, profile editing, and store deletion functionality. All changes reflect instantly across the application through global state management.

## Changes Made

### 1. Settings Page (`src/pages/Settings.tsx`)
**Complete rewrite** implementing all requested features:

#### Store Settings Section
- **Store Name**: Editable field that updates the store's public display name
- **Subdomain**: Editable field with auto-formatting (lowercase, alphanumeric + hyphens only)
  - Updates store URL to `/store/{subdomain}`
  - Validates format before saving
- **Description**: Textarea for store description
- **Theme**: Text input for theme selection
- **Primary Color**: Color picker with hex input and visual preview
- **Save Button**: Updates DB and refreshes global store state via `refreshStores()`

#### Profile Information Section
- **Full Name**: Editable input field
  - Saves to database via new `authApi.updateProfile()` method
  - Updates global user state via `refreshUser()`
- **Email**: Read-only field (disabled input with muted styling)
  - Displays actual email from database (e.g., koneti.sindhus5@gmail.com)
  - Shows helper text: "Email cannot be changed"

#### Danger Zone Section
- **Changed from "Delete Account" to "Delete Store"**
- Uses same delete API logic as `/stores` page
- Confirmation dialog with store name display
- After deletion:
  - Refreshes global store state
  - Redirects to `/stores` page
- Only shows when a store is selected

### 2. API Layer (`src/lib/api.ts`)

#### Added `subdomain` field to `storeApi.update()`
```typescript
update: async (
  storeId: string,
  data: {
    name?: string;
    storeName?: string;
    slug?: string;
    subdomain?: string; // ← NEW: Store subdomain for URL
    description?: string;
    theme?: string;
    settings?: { ... };
  }
)
```

#### Added `updateProfile` method to `authApi`
```typescript
updateProfile: async (name: string) => {
  return apiRequest<{
    success: boolean;
    message: string;
    user: { id, name, email, role };
  }>('/auth/update-profile', {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}
```

### 3. Backend API (`backend/routes/auth.js`)

#### Added PUT `/api/auth/update-profile` endpoint
- **Access**: Private (requires authentication)
- **Validation**: Name must be 2-50 characters
- **Functionality**: Updates user's name in database
- **Response**: Returns updated user object

```javascript
router.put('/update-profile', protect, [
  body('name')
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 50 })
], async (req, res) => {
  // Updates user.name in MongoDB
  // Returns success with updated user data
});
```

## Data Flow & State Management

### Store Settings Update Flow
1. User edits store name/subdomain in Settings
2. Click "Save Store Settings"
3. `storeApi.update()` sends data to backend
4. Backend updates MongoDB store document
5. `refreshStores()` called to reload all stores
6. `StoreContext` updates with latest data
7. Changes instantly reflect in:
   - `/stores` page (store list)
   - `/store/{subdomain}` page (storefront)
   - Header & Footer components
   - Builder page
   - Settings page

### Profile Update Flow
1. User edits name in Settings
2. Click "Save Changes"
3. `authApi.updateProfile()` sends data to backend
4. Backend updates MongoDB user document
5. `refreshUser()` called to reload user data
6. `AuthContext` updates with latest data
7. Name reflects everywhere user data is displayed

### Store Deletion Flow
1. User clicks "Delete Store" in Danger Zone
2. Confirmation dialog appears with store name
3. User confirms deletion
4. `storeApi.delete()` removes store from DB
5. `refreshStores()` updates global state
6. User redirected to `/stores` page
7. Store no longer appears in any lists

## Single Source of Truth

### Store Data
- **Source**: `StoreContext.selectedStore`
- **Loaded from**: Backend API via `storeApi.listMyStores()`
- **Updated via**: `refreshStores()` function
- **Used by**: All components displaying store information

### User Data
- **Source**: `AuthContext.user`
- **Loaded from**: Backend API via `authApi.getMe()`
- **Updated via**: `refreshUser()` function
- **Used by**: Profile section, user display components

## Routing & URL Updates

### Subdomain Changes
When subdomain is updated:
- New URL becomes: `/store/{new-subdomain}`
- All internal links use `buildStorePath()` utility
- External links (Visit Store) update automatically
- No manual page refresh needed

## Validation Rules

### Subdomain
- **Format**: Lowercase letters, numbers, hyphens only
- **Regex**: `/^[a-z0-9-]+$/`
- **Auto-formatting**: Converts to lowercase, strips invalid chars
- **Required**: Yes

### Store Name
- **Required**: Yes
- **Trimmed**: Leading/trailing whitespace removed

### Profile Name
- **Length**: 2-50 characters
- **Required**: Yes
- **Trimmed**: Leading/trailing whitespace removed

## UI/UX Improvements

### Loading States
- "Saving..." text with spinner during save operations
- Disabled buttons during async operations
- Prevents double-submission

### Error Handling
- Toast notifications for all errors
- Specific validation error messages
- Network error handling

### Success Feedback
- Toast notifications on successful saves
- Immediate UI updates (no page refresh needed)
- Confirmation dialogs for destructive actions

## Testing Checklist

- [x] Store name updates reflect in header/footer
- [x] Subdomain updates change store URL
- [x] Profile name updates across all pages
- [x] Email displays correctly from database
- [x] Email field is not editable
- [x] Delete store removes from database
- [x] Delete store redirects to /stores
- [x] All changes persist after page refresh
- [x] Validation prevents invalid input
- [x] Loading states show during operations
- [x] Error messages display appropriately
- [x] Success messages confirm actions

## Files Modified

1. `src/pages/Settings.tsx` - Complete rewrite
2. `src/lib/api.ts` - Added subdomain field, updateProfile method
3. `backend/routes/auth.js` - Added update-profile endpoint

## Dependencies

### Existing (No changes needed)
- `StoreContext` - Already has `refreshStores()`
- `AuthContext` - Already has `refreshUser()`
- `storeApi.delete()` - Already implemented
- Alert Dialog components - Already available

### New
- None (all using existing infrastructure)

## Notes

- No hardcoded values - all data from DB/context
- Consistent with existing codebase patterns
- Reuses existing delete logic from `/stores` page
- Follows existing validation patterns
- Uses existing toast notification system
- Maintains existing styling/theming
