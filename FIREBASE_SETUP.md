# Firebase Setup Instructions

This project uses Firebase Firestore to enable folder sharing functionality. Follow these steps to set up Firebase:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard (disable Google Analytics if not needed)

## 2. Enable Firestore Database

1. In the Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Start in **test mode** (or production mode with security rules - see below)
4. Choose a location closest to your users
5. Click **Enable**

## 3. Get Your Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select **Project settings**
3. Scroll down to "Your apps" section
4. Click the **Web icon** (</>) to add a web app
5. Register your app (you can skip hosting setup)
6. Copy the `firebaseConfig` object values

## 4. Set Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

Replace all values with the values from your Firebase config.

## 5. Update Firebase Configuration

The configuration is in `/src/app/firebase.ts`. If you haven't set up environment variables, you can temporarily hardcode your config there (but don't commit it to version control).

## 6. Firestore Security Rules (Recommended)

Once you've tested the basic functionality, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read shared folders (since they're meant to be shared)
    match /sharedFolders/{shareId} {
      allow read: if true;
      allow write: if request.auth != null; // Only authenticated users can create shares
      // Or for public sharing without auth:
      // allow write: if true;
    }
  }
}
```

**Important:** For production, you should implement proper authentication and security rules. The above is a basic setup.

## 7. Test the Setup

1. Start your development server: `npm run dev`
2. Create a folder in the sidebar
3. Click the share icon (appears on hover) next to a folder
4. The share link should be copied to your clipboard
5. Open the link in a new tab/incognito window to test sharing

## How It Works

- **Creating Share Links**: When you click the share button on a folder, all plays in that folder are uploaded to Firestore with a unique share ID
- **Accessing Shared Folders**: When someone visits a share link (`/shared/[shareId]`), the app fetches the folder data from Firestore and displays all plays
- **Data Structure**: Shared folders are stored in the `sharedFolders` collection with the share ID as the document ID

## Troubleshooting

- **"Failed to create share link"**: Check that your Firebase config is correct and Firestore is enabled
- **"Shared folder not found"**: The share link may have expired or been deleted, or there's an issue with the Firestore query
- **CORS errors**: Make sure your domain is added to Firebase authorized domains (if needed)

## Next Steps

For production:
1. Implement proper authentication
2. Add expiration dates for share links
3. Add share link management (revoke, view access, etc.)
4. Implement rate limiting
5. Add analytics for shared folder views
