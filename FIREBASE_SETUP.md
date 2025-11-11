# Firebase Setup for Vercel Deployment

## Authorized Domains Issue

If you're getting `Firebase: Error (auth/unauthorized-domain)` on your Vercel deployment, you need to add your Vercel domain to Firebase's authorized domains list.

### Steps to Fix:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `flagfootballplays-a7abc`
3. Navigate to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add your Vercel domain (e.g., `your-app.vercel.app` or your custom domain)
6. Click **Add**

### Common Vercel Domains:
- `your-app.vercel.app` (default Vercel domain)
- `your-app-git-main.vercel.app` (preview deployments)
- Your custom domain if you've configured one

### Note:
- You may need to add multiple domains if you have:
  - Production domain
  - Preview/development domains
  - Custom domains

The `authDomain` in `firebase.ts` is set to `flagfootballplays-a7abc.firebaseapp.com`, but Firebase also needs the actual domain where your app is hosted to be in the authorized domains list.
