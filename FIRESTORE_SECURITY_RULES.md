# Firestore Security Rules

Since you started Firestore in **production mode**, you need to set up security rules before the app can write to the database.

## Quick Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `flagfootballplays-a7abc`
3. Click **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Replace the existing rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Shared folders - anyone can read, authenticated users can create
    match /sharedFolders/{shareId} {
      allow read: if true; // Anyone can read shared folders (via share links)
      allow write: if request.auth != null; // Only authenticated users can create share links
    }
    
    // User data - users can only read/write their own data
    match /users/{userId} {
      // Allow users to read and write their own user document
      // This allows account creation (when userId matches auth.uid)
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. Click **Publish** to save the rules

## What These Rules Do

### Shared Folders (`sharedFolders`)
- **`allow read: if true`** - Anyone with the share link can read/view the shared folder
- **`allow write: if request.auth != null`** - Only authenticated users can create share links

### User Data (`users`)
- **`allow read, write: if request.auth != null && request.auth.uid == userId`** - Users can only read and write their own user document
  - This allows users to create their account (when they sign up, a document is created with their user ID)
  - Users can save/load their plays and folders
  - Users cannot access other users' data

## Alternative: Allow Public Sharing (Less Secure)

If you want to allow anyone to create share links without authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sharedFolders/{shareId} {
      allow read: if true;
      allow write: if true; // Allow anyone to create shares (less secure)
    }
    
    // User data still requires authentication
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Note:** The recommended rules above require authentication for creating shares, which is more secure.

## Test the Rules

After publishing the rules:
1. Try sharing a folder from your app
2. If you see any permission errors, double-check the rules match the collection name (`sharedFolders`)
3. Check the browser console for any error messages
