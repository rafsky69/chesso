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
- Firebase Anonymous Auth + Firestore room syncing
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

The app works in local mode without Firebase. Firebase is only needed for synced rooms.

### 1. Create the project

Go to the Firebase Console and create a project.

### 2. Add a Web app

In Project settings, add a Web app. Firebase will give you a configuration object.

Open `firebase.js` and replace the placeholder values in `firebaseConfig` with the values Firebase gives you.

The web config is intended to be included in client code. The important security layer is your Firebase Authentication configuration and Firestore Security Rules, not hiding the web config.

### 3. Enable Anonymous Authentication

Firebase Console → Authentication → Sign-in method → Anonymous → Enable.

### 4. Create Firestore

Firebase Console → Firestore Database → Create database.

For development, choose a development setup, then replace the rules with something like:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read, create, update: if request.auth != null;
      allow delete: if false;
    }
  }
}
```

For a public production game, tighten these rules further and add a real player/room authorization model. Do not ship a wide-open Firestore database and then discover the internet can edit every game. Civilization has suffered enough from this pattern.

### 5. Test

Start the local server again and reload the page. The status pill should say **Firebase connected**.

Create a game and press **Copy room**. Opening the copied URL in another browser session loads the same Firestore game document.

## GitHub Pages

This project is static, so it can also be deployed with GitHub Pages:

1. Open repository Settings.
2. Open Pages.
3. Set the source to the `main` branch and `/ (root)`.
4. Save.
5. Wait for GitHub Pages to publish the site.

Firebase's web configuration can be used from the deployed site, but make sure your Firebase Authentication authorized domains include the GitHub Pages domain.

## Project structure

```text
chesso/
├── index.html      # App structure
├── style.css       # UI and board styling
├── app.js          # UI, interactions, room syncing
├── chess.js        # Chess rules and state engine
├── firebase.js     # Firebase initialization
└── README.md       # Setup instructions
```

## Next sensible upgrades

- Proper multiplayer color assignment
- Server-authoritative moves
- Clocks
- Draw offers and resignations stored in Firestore
- User accounts and profiles
- Game history
- Rematch
- FEN/PGN import/export
- Chess engine analysis
