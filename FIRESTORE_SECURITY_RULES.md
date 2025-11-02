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
    // Allow anyone to read shared folders (since they're meant to be shared via links)
    match /sharedFolders/{shareId} {
      allow read: if true;
      allow write: if true; // Allow anyone to create share links
    }
  }
}
```

6. Click **Publish** to save the rules

## What These Rules Do

- **`allow read: if true`** - Anyone with the share link can read/view the shared folder
- **`allow write: if true`** - Anyone can create share links (needed for the share button to work)

## More Secure Option (Recommended for Production)

If you want more control, you can add authentication later:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sharedFolders/{shareId} {
      // Anyone can read shared folders
      allow read: if true;
      
      // Only authenticated users can create shares
      // Uncomment this when you add Firebase Authentication:
      // allow write: if request.auth != null;
      
      // Or for now, allow anyone to create shares:
      allow write: if true;
    }
  }
}
```

## Test the Rules

After publishing the rules:
1. Try sharing a folder from your app
2. If you see any permission errors, double-check the rules match the collection name (`sharedFolders`)
3. Check the browser console for any error messages
