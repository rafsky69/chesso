# Chesso ♟

A lightweight browser chess app built with vanilla JavaScript and Firebase.

## Included

- Full local chess board
- Legal move validation
- Check and checkmate
- Stalemate
- Castling
- En passant
- Promotion
- Move list
- Firebase Email/Password accounts
- Firestore user profiles
- Authenticated multiplayer room syncing
- Automatic white/black player assignment
- Persistent login sessions
- No npm, React, Vue, TypeScript, or build step

## Run locally

Because ES modules and Firebase are loaded by the browser, use a local web server instead of opening `index.html` directly.

### Option 1: Python

```bash
cd chesso
python3 -m http.server 8000
```

Open `http://localhost:8000`.

### Option 2: VS Code

Install the **Live Server** extension, right-click `index.html`, and choose **Open with Live Server**.

## Firebase setup

Firebase powers accounts and multiplayer rooms.

### 1. Create the project

Go to the Firebase Console and create a project.

### 2. Add a Web app

In Project settings, add a Web app. Firebase will give you a configuration object.

Open `firebase.js` and replace the values in `firebaseConfig` with the values Firebase gives you.

The web config is intended to be included in client code. Never put service-account private keys, passwords, or access tokens in the browser code.

### 3. Enable Email/Password accounts

Firebase Console → Authentication → Sign-in method → Email/Password → Enable.

Anonymous Authentication is no longer required by Chesso.

### 4. Create Firestore

Firebase Console → Firestore Database → Create database.

Use these development rules for the current MVP:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /games/{gameId} {
      allow create: if request.auth != null
        && request.resource.data.whitePlayer == request.auth.uid
        && request.resource.data.blackPlayer == null
        && request.resource.data.createdBy == request.auth.uid;

      allow read: if request.auth != null;

      allow update: if request.auth != null
        && (
          resource.data.whitePlayer == request.auth.uid
          || resource.data.blackPlayer == request.auth.uid
          || (
            resource.data.blackPlayer == null
            && request.resource.data.blackPlayer == request.auth.uid
            && request.resource.data.whitePlayer == resource.data.whitePlayer
          )
        );

      allow delete: if false;
    }
  }
}
```

These rules protect account documents and limit game writes to the assigned players. They do not make the chess engine server-authoritative yet, so a determined client could still manipulate a game document. A production version should validate moves on a trusted backend.

### 5. Test accounts

Reload the app. The top-right account button should say **Log in**.

Click it, switch to **Sign up**, and create an account with:

- Username
- Email
- Password (at least 6 characters)

Firebase keeps the session, so refreshing the page should keep you logged in.

### 6. Test multiplayer

1. Log in to account A.
2. Click **New game**.
3. Chesso creates a Firestore room and assigns account A as White.
4. Click **Copy room**.
5. Open the copied URL in another browser/profile and log in as account B.
6. Account B is automatically assigned Black.
7. Both players see the same board and move list through Firestore.

## GitHub Pages

This project is static, so it can also be deployed with GitHub Pages:

1. Open repository Settings.
2. Open Pages.
3. Set the source to the `main` branch and `/ (root)`.
4. Save.
5. Wait for GitHub Pages to publish the site.

Add the deployed GitHub Pages domain to Firebase Authentication → Settings → Authorized domains.

## Project structure

```text
chesso/
├── index.html      # App structure and account UI
├── style.css       # UI, board, and account styling
├── app.js          # UI, authentication, games, and room syncing
├── chess.js        # Chess rules and state engine
├── firebase.js     # Firebase initialization and account helpers
└── README.md       # Setup instructions
```

## Next upgrades

- Server-authoritative move validation
- Real chess clocks
- Draw offers and resignations stored in Firestore
- Game history per account
- Rematch
- FEN/PGN import/export
- Chess engine analysis
- Google/Apple sign-in
