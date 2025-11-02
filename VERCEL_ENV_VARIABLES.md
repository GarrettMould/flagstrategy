# Vercel Environment Variables Setup

This guide shows you what environment variables to add in Vercel and where to find them in Firebase.

## Where to Add Environment Variables in Vercel

1. Go to your project on [vercel.com](https://vercel.com)
2. Click on your project: **flagstrategy** (or whatever you named it)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New** for each variable below

## Required Environment Variables

Add these variables with the values from your Firebase project:

### 1. `NEXT_PUBLIC_FIREBASE_API_KEY`
- **Value:** `AIzaSyB2H02PIXKOLcFtnMK7vssKiEATOPOIHtg`
- **Where to find in Firebase:** 
  - Firebase Console → Project Settings (gear icon) → General tab
  - Scroll to "Your apps" → Click on your web app
  - Look for `apiKey` in the config object

### 2. `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- **Value:** `flagfootballplays-a7abc.firebaseapp.com`
- **Where to find in Firebase:**
  - Same location as above, look for `authDomain`

### 3. `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- **Value:** `flagfootballplays-a7abc`
- **Where to find in Firebase:**
  - Same location as above, look for `projectId`
  - OR: It's in your project name/URL

### 4. `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- **Value:** `flagfootballplays-a7abc.firebasestorage.app`
- **Where to find in Firebase:**
  - Same location as above, look for `storageBucket`

### 5. `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- **Value:** `49967410641`
- **Where to find in Firebase:**
  - Same location as above, look for `messagingSenderId`

### 6. `NEXT_PUBLIC_FIREBASE_APP_ID`
- **Value:** `1:49967410641:web:d3e625771dedca257584f0`
- **Where to find in Firebase:**
  - Same location as above, look for `appId`

### 7. `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (Optional)
- **Value:** `G-PCMNNDJV99`
- **Where to find in Firebase:**
  - Same location as above, look for `measurementId`
  - This is only needed if you're using Google Analytics

### 8. `NEXT_PUBLIC_SHARE_DOMAIN` (Set after deployment)
- **Value:** Your Vercel URL (e.g., `https://flagstrategy.vercel.app`)
- **Where to find:**
  - After your first deployment, Vercel will give you a URL
  - Copy that URL and use it as the value
  - This ensures share links use your production domain instead of localhost

## Quick Copy-Paste Values

Here are all the values ready to copy:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB2H02PIXKOLcFtnMK7vssKiEATOPOIHtg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=flagfootballplays-a7abc.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=flagfootballplays-a7abc
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=flagfootballplays-a7abc.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=49967410641
NEXT_PUBLIC_FIREBASE_APP_ID=1:49967410641:web:d3e625771dedca257584f0
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-PCMNNDJV99
```

**Note:** Don't add `NEXT_PUBLIC_SHARE_DOMAIN` yet - wait until after deployment to get your Vercel URL.

## After Adding Variables

1. Make sure all variables are set for **Production**, **Preview**, and **Development** (you can check/uncheck these when adding each variable)
2. Click **Save** for each variable
3. Go to **Deployments** tab
4. Click the **three dots** (⋯) on your latest deployment
5. Click **Redeploy**
6. Wait for the deployment to complete

## Verify It Works

After redeploying:
1. Visit your deployed site
2. Create a folder
3. Try clicking the three-dots menu → "Copy Link"
4. The share link should work and use your Vercel domain!

