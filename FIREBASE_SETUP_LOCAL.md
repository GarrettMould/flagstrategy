# Firebase Setup for Local Development

If you're getting an "API key not valid" error, follow these steps:

## Step 1: Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the **gear icon** (⚙️) next to "Project Overview"
4. Click **Project Settings**
5. Scroll down to **"Your apps"** section
6. If you don't have a web app yet:
   - Click the **</>** (Web) icon
   - Register your app with a nickname (e.g., "Flag Strategy Web")
   - Click **Register app**
7. Copy the config object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

## Step 2: Create .env.local File

1. In your project root directory, create a file named `.env.local`
2. Copy the contents from `.env.local.example`
3. Replace the placeholder values with your actual Firebase config values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy... (your actual apiKey)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXX (optional, only if you have Analytics)
```

## Step 3: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started** (if you haven't enabled it)
3. Go to **Sign-in method** tab
4. Click on **Email/Password**
5. Enable it and click **Save**

## Step 4: Set Up Firestore

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select a location (choose the closest to you)
5. Click **Enable**

## Step 5: Set Firestore Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Shared folders - anyone can read, anyone can write
    match /sharedFolders/{shareId} {
      allow read: if true;
      allow write: if true;
    }
    
    // User data - users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

## Step 6: Restart Your Development Server

1. Stop your current dev server (Ctrl+C)
2. Delete `.next` folder (if it exists): `rm -rf .next` (Mac/Linux) or `rmdir /s .next` (Windows)
3. Start the dev server again: `npm run dev`

## Troubleshooting

### Still getting API key error?

1. **Double-check your .env.local file:**
   - Make sure there are no quotes around the values
   - Make sure there are no spaces before/after the `=` sign
   - Make sure the file is named exactly `.env.local` (not `.env.local.txt`)

2. **Verify the API key is correct:**
   - Go back to Firebase Console → Project Settings
   - Make sure you copied the entire API key (they're usually long)

3. **Check if API key restrictions are enabled:**
   - In Firebase Console → Project Settings → General
   - Scroll to "API Keys" section
   - If you see restrictions, you may need to:
     - Either remove restrictions for development
     - Or add your localhost domain to allowed domains

4. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### API Key Restrictions (Advanced)

If your API key has restrictions:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **Credentials**
4. Find your API key
5. Under "Application restrictions", add:
   - `http://localhost:3000` (for local development)
   - Your production domain (for deployment)

## Need Help?

If you're still having issues:
1. Check the browser console for more detailed error messages
2. Verify all environment variables are set correctly
3. Make sure you've enabled Email/Password authentication in Firebase
4. Make sure Firestore is enabled and rules are published

