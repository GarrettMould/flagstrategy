# Vercel Environment Variables Setup

## Required Environment Variables for Login to Work

You need to set these environment variables in your Vercel project settings:

### Step 1: Go to Vercel Project Settings

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add These Variables

Add each of these variables (use the same values from your `.env.local` file):

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB2H02PIXKOLcFtnMK7vssKiEATOPOIHtg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=flagfootballplays-a7abc.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=flagfootballplays-a7abc
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=flagfootballplays-a7abc.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=49967410641
NEXT_PUBLIC_FIREBASE_APP_ID=1:49967410641:web:d3e625771dedca257584f0
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-PCMNNDJV99
NEXT_PUBLIC_SHARE_DOMAIN=https://your-vercel-url.vercel.app
```

**Important Notes:**
- Replace `your-vercel-url.vercel.app` with your actual Vercel deployment URL
- Make sure to select **Production**, **Preview**, and **Development** for each variable
- After adding variables, you MUST redeploy for them to take effect

### Step 3: Configure Firebase Authorized Domains

For Google Sign-In to work, you need to add your Vercel domain to Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add your Vercel domain (e.g., `your-project.vercel.app`)
6. Also add your custom domain if you have one

### Step 4: Redeploy

After setting environment variables:

1. Go to your Vercel project
2. Click **Deployments**
3. Click the **three dots** (⋯) on the latest deployment
4. Click **Redeploy**

Or push a new commit to trigger a new deployment.

## Troubleshooting

### Login still doesn't work?

1. **Check browser console** - Look for Firebase errors
2. **Verify environment variables are set:**
   - Go to Vercel → Settings → Environment Variables
   - Make sure all variables are there
   - Make sure they're enabled for Production/Preview/Development

3. **Check Firebase Console:**
   - Make sure Email/Password authentication is enabled
   - Make sure Google Sign-In is enabled (if using Google login)
   - Check Authorized domains includes your Vercel URL

4. **Common errors:**
   - "API key not valid" → Environment variable not set or wrong value
   - "auth/unauthorized-domain" → Domain not in Firebase authorized domains
   - "auth/operation-not-allowed" → Authentication method not enabled in Firebase

### How to verify environment variables are loaded

Add this temporarily to your code to check:

```typescript
console.log('Firebase Config:', {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Missing',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Set' : 'Missing',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Set' : 'Missing',
});
```

Check the browser console on Vercel - if any show "Missing", the environment variable isn't set correctly.

