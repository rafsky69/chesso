# Chesso ♟

A modern, minimalist online chess application built with vanilla JavaScript and Firebase.

## Features

- **Accounts**: Firebase Email/Password authentication with persistent login
- **Usernames**: Create an account with a username
- **Multiplayer**: Play with friends in real-time via Firestore
- **Room Links**: Share games with unique links
- **Legal Moves**: Complete chess rule implementation
  - Pawn movement & promotion
  - Knight, bishop, rook, queen movement
  - King movement
  - Captures
  - Check & checkmate
  - Stalemate
  - Castling
  - En passant
- **Move History**: Track all moves with algebraic notation
- **Game Controls**: Resign, offer draw, copy game link
- **Real Chess Pieces**: Uses 1200×1200 PNG chess piece images
- **Responsive Design**: Works on desktop and mobile
- **Modern Aesthetics**: Premium, minimal dark theme

## Technology

- Plain HTML, CSS, and modern vanilla JavaScript (ES modules)
- Firebase Web SDK from CDN (no build step required)
- No framework dependencies (React, Vue, Angular, etc.)
- Deployable as a static website

## Project Structure

```
chesso/
├── index.html          # App structure
├── style.css           # UI and board styling  
├── app.js              # Game UI, Firebase sync, multiplayer
├── chess.js            # Chess engine and rules
├── firebase.js         # Firebase initialization and auth
├── assets/
│   └── pieces/         # Chess piece PNG images (12 files)
│       ├── wK.png, wQ.png, wR.png, wB.png, wN.png, wP.png
│       └── bK.png, bQ.png, bR.png, bB.png, bN.png, bP.png
└── README.md           # This file
```

## Local Development

### Option 1: Python

```bash
cd chesso
python3 -m http.server 8000
```

Open `http://localhost:8000`

### Option 2: Node.js

```bash
cd chesso
npx http-server
```

### Option 3: VS Code Live Server

Install the **Live Server** extension, right-click `index.html`, and select **Open with Live Server**.

## Firebase Setup

Chesso works offline for local games. For multiplayer:

### 1. Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Create project**
3. Name it "chesso" and follow the setup

### 2. Add a Web App

1. In Project settings, click **Add app** → **Web**
2. Register the app
3. Copy the configuration (not needed — it's hardcoded in `firebase.js`)

### 3. Enable Email/Password Authentication

1. Go to **Authentication** → **Sign-in method**
2. Click **Email/Password** → Enable both "Email/password" and "Email link (passwordless sign-in)"
3. Save

### 4. Create Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Start in **production mode**
3. Set location (e.g., us-central1)

### 5. Set Firestore Security Rules

Replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }

    match /games/{gameId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (
        resource.data.whitePlayer == request.auth.uid ||
        resource.data.blackPlayer == request.auth.uid ||
        (resource.data.blackPlayer == null && request.auth != null)
      );
      allow delete: if false;
    }
  }
}
```

### 6. Add Authorized Domain

1. In **Authentication** → **Settings** → **Authorized domains**
2. Add your deployment domain (e.g., `mysite.github.io` for GitHub Pages)

## Firestore Schema

### Users Collection

```
users/{uid}
{
  username: string
  email: string
  createdAt: timestamp
}
```

### Games Collection

```
games/{gameId}
{
  board: [[piece], ...] // 8x8 board state
  turn: string          // 'w' or 'b'
  castling: {
    wK: boolean, wQ: boolean,
    bK: boolean, bQ: boolean
  }
  enPassant: [row, col] or null
  halfmove: number
  fullmove: number
  moves: [string]       // Algebraic notation
  
  whitePlayer: string   // User UID
  blackPlayer: string   // User UID or null
  createdBy: string
  createdAt: timestamp
  status: string        // 'waiting', 'active', 'resigned', 'draw', 'checkmate'
  drawOffered: string   // User UID who offered draw
  winner: string        // 'w', 'b', or null
}
```

## Multiplayer Instructions

1. **Create a game**: Click **New Game**
2. **Copy link**: Click **Copy Link** to share
3. **Join**: Open the shared link
4. **Play**: Creator plays White, second player plays Black
5. **Resign or offer draw**: Use the controls

Note: A third player cannot join a full game.

## Deployment

### GitHub Pages

1. Push to GitHub
2. Go to repository **Settings** → **Pages**
3. Set source to `main` branch, root directory
4. GitHub will deploy to `https://yourusername.github.io/chesso`

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## Security Notes

### Current Limitations

- Client-side move validation only (no server-authoritative validation)
- Firestore rules allow players to modify their own games
- Possible for a malicious client to cheat by sending invalid moves

### For Production

Consider adding:
- Cloud Functions to validate moves server-side
- Transactional game updates to prevent race conditions
- Rate limiting to prevent spam
- User reputation or ELO ratings
- Replay detection

## Code Quality

The implementation separates concerns:

- **chess.js**: Pure chess engine (no Firebase, no DOM)
- **firebase.js**: Firebase initialization and auth only
- **app.js**: UI state, game sync, multiplayer logic
- **style.css**: All styling (no inline styles)

## Accessibility

- Semantic HTML with real button and input elements
- Visible focus states on all interactive elements
- Keyboard accessible board navigation (where practical)
- ARIA labels for board and key regions
- Screen-reader friendly

## Known Limitations

- No engine hints or analysis
- No timed games
- No spectator mode
- No game history or statistics
- No chat or messaging
- No undo/takeback
- Third player cannot observe or join

## Future Enhancements

- Server-side move validation with Cloud Functions
- Game clocks/time controls
- Draw by repetition and 50-move rule
- Game history and statistics
- User ratings/ELO
- Tournaments
- Mobile app

## License

Public domain. Use freely for any purpose.

## Contributing

This is a complete rebuild from scratch. For suggestions or issues, open an issue or pull request.
