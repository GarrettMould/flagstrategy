# Installation Instructions

## Step 1: Install Node.js and npm

1. Go to https://nodejs.org/
2. Download the **LTS** (Long Term Support) version
3. Run the installer and follow the setup wizard
4. **Restart your terminal/command prompt** after installation

## Step 2: Verify Installation

Open a new terminal/command prompt and run:
```bash
node --version
npm --version
```

Both commands should show version numbers.

### If you get a PowerShell execution policy error:

If you see an error like "running scripts is disabled on this system", run this in PowerShell:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Or use **Command Prompt (cmd)** instead of PowerShell - it doesn't have this restriction.

## Step 3: Install Project Dependencies

Navigate to this project folder in your terminal and run:
```bash
npm install
```

This will install all dependencies including:
- React
- Next.js
- TypeScript
- Firebase
- And all other required packages

## Step 4: Run the Development Server

After installation completes, run:
```bash
npm run dev
```

The app will be available at http://localhost:3000


