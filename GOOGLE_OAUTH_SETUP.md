# Google OAuth Setup Guide

This guide will help you set up Google OAuth for the Astraea AI Platform.

## Prerequisites

- A Google Cloud Platform account
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Astraea AI Platform")
5. Click "Create"

## Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type
3. Click "Create"
4. Fill in the required information:
   - App name: Astraea AI Platform
   - User support email: Your email
   - Developer contact information: Your email
5. Click "Save and Continue"
6. Skip the "Scopes" section (click "Save and Continue")
7. Add test users if needed (for development)
8. Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Configure the following:
   - **Name**: Astraea Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - Add your production domain when deploying
   - **Authorized redirect URIs**:
     - `http://localhost:3000` (for development)
     - Add your production domain when deploying
5. Click "Create"
6. Copy the **Client ID** (you'll need this for configuration)

## Step 5: Configure Backend

1. Navigate to the backend directory
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your Google Client ID:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   ```

## Step 6: Configure Frontend

1. Navigate to the frontend directory
2. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
3. Edit `.env.local` and add your Google Client ID:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   ```

## Step 7: Install Dependencies

### Backend
```bash
cd backend
source aivenv/bin/activate  # Activate virtual environment
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
yarn install
```

## Step 8: Run the Application

### Backend
```bash
cd backend
source aivenv/bin/activate
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
yarn dev
```

## Testing

1. Open your browser and navigate to `http://localhost:3000/login`
2. Click the "Sign in with Google" button
3. Select your Google account
4. Grant permissions
5. You should be redirected to the main application

## Troubleshooting

### "Invalid Client ID" Error
- Make sure the Client ID in both `.env` files matches exactly with the one from Google Cloud Console
- Ensure there are no extra spaces or quotes around the Client ID

### "Redirect URI Mismatch" Error
- Verify that `http://localhost:3000` is added to "Authorized JavaScript origins" in Google Cloud Console
- Make sure you're accessing the app from the exact URL configured

### "Access Blocked" Error
- Add your email as a test user in the OAuth consent screen
- If in production, submit your app for verification

## Security Notes

- Never commit `.env` or `.env.local` files to version control
- Use different Client IDs for development and production
- Regularly rotate your credentials
- In production, use HTTPS only

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Websites](https://developers.google.com/identity/sign-in/web)
