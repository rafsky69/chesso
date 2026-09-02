import { initialState, pieceGlyph, legalMoves, makeMove, inCheck, gameStatus, notation } from './chess.js';
import { db, auth, firebaseReady, currentUser, register, login, logout, watchAuth, getUserProfile } from './firebase.js';
import { collection, addDoc, doc, setDoc, onSnapshot, serverTimestamp, runTransaction } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const boardEl = document.querySelector('#chessboard');
const moveList = document.querySelector('#move-list');
const messageEl = document.querySelector('#message');
const turnEl = document.querySelector('#turn');
const statusEl = document.querySelector('#game-status');
const roomEl = document.querySelector('#room-id');
const connectionEl = document.querySelector('#connection');
const accountButton = document.querySelector('#account-button');
const accountName = document.querySelector('#account-name');
const authPanel = document.querySelector('#auth-panel');
const authTitle = document.querySelector('#auth-title');
const authForm = document.querySelector('#auth-form');
const authSubmit = document.querySelector('#auth-submit');
const authSwitch = document.querySelector('#auth-switch');
const authClose = document.querySelector('#auth-close');
const authMessage = document.querySelector('#auth-message');
const usernameField = document.querySelector('#username-field');
const usernameInput = document.querySelector('#username-input');
const emailInput = document.querySelector('#email-input');
const passwordInput = document.querySelector('#password-input');
const newGameButton = document.querySelector('#new-game');

let state = initialState();
let selected = null;
let selectedMoves = [];
let gameId = null;
let unsubscribe = null;
let moves = [];
let playerColor = null;
let authMode = 'login';
let userProfile = null;

const files = ['a','b','c','d','e','f','g','h'];
const ranks = ['8','7','6','5','4','3','2','1'];

function render() {
  boardEl.innerHTML = '';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const sq = document.createElement('button');
    sq.className = `square ${(r + c) % 2 ? 'dark' : 'light'}`;
    if (selected?.[0] === r && selected?.[1] === c) sq.classList.add('selected');
    if (selectedMoves.some(m => m.to[0] === r && m.to[1] === c)) sq.classList.add(state.board[r][c] ? 'capture' : 'legal');
    const k = state.board[r][c];
    if (k) {
      const span = document.createElement('span');
      span.className = `piece ${k.color === 'w' ? 'white-piece' : 'black-piece'}`;
      span.textContent = pieceGlyph(k);
      sq.appendChild(span);
    }
    if (c === 7) {
      const rank = document.createElement('span');
      rank.className = 'coord rank';
      rank.textContent = ranks[r];
      sq.appendChild(rank);
    }
    if (r === 7) {
      const file = document.createElement('span');
      file.className = 'coord file';
      file.textContent = files[c];
      sq.appendChild(file);
    }
    if (k?.type === 'k' && inCheck(state, k.color)) sq.classList.add('in-check');
    sq.addEventListener('click', () => clickSquare(r, c));
    boardEl.appendChild(sq);
  }

  turnEl.textContent = state.turn === 'w' ? 'White' : 'Black';
  statusEl.textContent = gameStatus(state);
  if (gameStatus(state) === 'playing') {
    messageEl.textContent = `${state.turn === 'w' ? 'White' : 'Black'} to move.`;
  }
  renderMoves();
}

function renderMoves() {
  moveList.innerHTML = '';
  moves.forEach((m, i) => {
    const li = document.createElement('li');
    li.textContent = `${Math.floor(i / 2) + 1}${i % 2 === 0 ? '. ' : '... '}${m}`;
    moveList.appendChild(li);
  });
}

function clickSquare(r, c) {
  if (!auth?.currentUser) {
    showAuth('login');
    return;
  }
  if (playerColor && state.turn !== playerColor) return;

  const p = state.board[r][c];
  if (selected) {
    const move = selectedMoves.find(m => m.to[0] === r && m.to[1] === c);
    if (move) {
      let promotion = 'q';
      if (promotionSquare(move, state)) {
        const choice = prompt('Promote to: q, r, b or n', 'q')?.toLowerCase();
        if (['q', 'r', 'b', 'n'].includes(choice)) promotion = choice;
      }
      const text = notation(state, move);
      const next = makeMove(state, move, promotion);
      if (next) {
        state = next;
        moves.push(text);
        selected = null;
        selectedMoves = [];
        render();
        saveGame();
      }
      return;
    }
  }

  if (p?.color === state.turn && (!playerColor || p.color === playerColor)) {
    selected = [r, c];
    selectedMoves = legalMoves(state, selected);
    render();
  } else {
    selected = null;
    selectedMoves = [];
    render();
  }
}

function promotionSquare(move, s) {
  const p = s.board[move.from[0]][move.from[1]];
  return p?.type === 'p' && (move.to[0] === 0 || move.to[0] === 7);
}

async function saveGame() {
  if (!firebaseReady || !auth?.currentUser) {
    messageEl.textContent = 'Log in to create a synced game.';
    return;
  }

  try {
    if (!gameId) {
      const ref = await addDoc(collection(db, 'games'), {
        board: state.board,
        turn: state.turn,
        castling: state.castling,
        enPassant: state.enPassant,
        halfmove: state.halfmove,
        fullmove: state.fullmove,
        moves,
        status: gameStatus(state),
        whitePlayer: auth.currentUser.uid,
        blackPlayer: null,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid
      });
      gameId = ref.id;
      playerColor = 'w';
      roomEl.textContent = gameId.slice(0, 8);
      history.replaceState({}, '', `${location.pathname}?game=${gameId}`);
      messageEl.textContent = 'Room created. Copy the room link and send it to your opponent.';
    } else {
      await setDoc(doc(db, 'games', gameId), {
        board: state.board,
        turn: state.turn,
        castling: state.castling,
        enPassant: state.enPassant,
        halfmove: state.halfmove,
        fullmove: state.fullmove,
        moves,
        status: gameStatus(state)
      }, { merge: true });
    }
  } catch (e) {
    console.error(e);
    messageEl.textContent = 'Could not save the game.';
  }
}

async function joinGame(id) {
  if (!auth?.currentUser) {
    showAuth('login');
    messageEl.textContent = 'Log in to join this room.';
    return;
  }

  try {
    await runTransaction(db, async (transaction) => {
      const ref = doc(db, 'games', id);
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error('This room does not exist.');
      const data = snap.data();
      if (data.whitePlayer === auth.currentUser.uid) {
        playerColor = 'w';
        return;
      }
      if (data.blackPlayer && data.blackPlayer !== auth.currentUser.uid) {
        throw new Error('This room already has two players.');
      }
      transaction.update(ref, { blackPlayer: auth.currentUser.uid });
      playerColor = 'b';
    });
    gameId = id;
    roomEl.textContent = gameId.slice(0, 8);
    subscribeToGame();
  } catch (e) {
    console.error(e);
    messageEl.textContent = e.message || 'Could not join the room.';
  }
}

function subscribeToGame() {
  if (!gameId) return;
  if (unsubscribe) unsubscribe();
  unsubscribe = onSnapshot(doc(db, 'games', gameId), async (snap) => {
    if (!snap.exists()) {
      messageEl.textContent = 'This room no longer exists.';
      return;
    }
    const d = snap.data();
    if (auth?.currentUser?.uid === d.whitePlayer) playerColor = 'w';
    else if (auth?.currentUser?.uid === d.blackPlayer) playerColor = 'b';
    state = {
      board: d.board,
      turn: d.turn,
      castling: d.castling || '',
      enPassant: d.enPassant || '-',
      halfmove: d.halfmove || 0,
      fullmove: d.fullmove || 1,
      history: []
    };
    moves = d.moves || [];
    updatePlayerLabels(d);
    render();
  });
}

function updatePlayerLabels(d) {
  document.querySelector('#white-name').textContent = d.whitePlayer ? (d.whitePlayer === auth?.currentUser?.uid ? (userProfile?.username || 'You') : 'White') : 'Waiting';
  document.querySelector('#black-name').textContent = d.blackPlayer ? (d.blackPlayer === auth?.currentUser?.uid ? (userProfile?.username || 'You') : 'Black') : 'Waiting';
  document.querySelector('#white-status').textContent = playerColor === 'w' ? 'You' : (d.whitePlayer ? 'Opponent' : 'Waiting');
  document.querySelector('#black-status').textContent = playerColor === 'b' ? 'You' : (d.blackPlayer ? 'Opponent' : 'Waiting');
}

function newGame() {
  if (!auth?.currentUser) {
    showAuth('login');
    return;
  }
  if (unsubscribe) unsubscribe();
  gameId = null;
  moves = [];
  playerColor = null;
  state = initialState();
  selected = null;
  selectedMoves = [];
  roomEl.textContent = 'New';
  history.replaceState({}, '', location.pathname);
  render();
  saveGame();
}

function showAuth(mode = 'login') {
  authMode = mode;
  authPanel.classList.remove('hidden');
  authTitle.textContent = mode === 'login' ? 'Log in' : 'Create account';
  authSubmit.textContent = mode === 'login' ? 'Log in' : 'Create account';
  usernameField.classList.toggle('hidden', mode !== 'register');
  usernameInput.required = mode === 'register';
  authSwitch.textContent = mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in';
  authMessage.textContent = '';
  if (mode === 'login') passwordInput.autocomplete = 'current-password';
  else passwordInput.autocomplete = 'new-password';
  emailInput.focus();
}

function hideAuth() {
  authPanel.classList.add('hidden');
  authMessage.textContent = '';
}

function friendlyAuthError(error) {
  const messages = {
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'That email is already registered.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/network-request-failed': 'Network error. Check your connection.'
  };
  return messages[error.code] || error.message || 'Authentication failed.';
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  authMessage.textContent = 'Working...';
  authSubmit.disabled = true;
  try {
    if (authMode === 'login') {
      await login(emailInput.value, passwordInput.value);
    } else {
      await register(emailInput.value, passwordInput.value, usernameInput.value);
    }
    hideAuth();
  } catch (error) {
    authMessage.textContent = friendlyAuthError(error);
  } finally {
    authSubmit.disabled = false;
  }
}

async function updateAccountUI(user) {
  if (user) {
    userProfile = await getUserProfile(user.uid).catch(() => null);
    accountName.textContent = userProfile?.username || user.displayName || user.email?.split('@')[0] || 'Account';
    accountButton.textContent = 'Log out';
    newGameButton.disabled = false;
  } else {
    userProfile = null;
    accountName.textContent = 'Guest';
    accountButton.textContent = 'Log in';
    newGameButton.disabled = false;
    playerColor = null;
  }
}

accountButton.addEventListener('click', async () => {
  if (auth?.currentUser) {
    await logout();
    if (unsubscribe) unsubscribe();
    gameId = null;
    playerColor = null;
    roomEl.textContent = 'Local';
    messageEl.textContent = 'Logged out. Log in to play synced games.';
    return;
  }
  showAuth('login');
});

authForm.addEventListener('submit', handleAuthSubmit);
authSwitch.addEventListener('click', () => showAuth(authMode === 'login' ? 'register' : 'login'));
authClose.addEventListener('click', hideAuth);
document.querySelector('#new-game').addEventListener('click', newGame);
document.querySelector('#resign').addEventListener('click', () => {
  if (!auth?.currentUser) return showAuth('login');
  messageEl.textContent = `${state.turn === 'w' ? 'White' : 'Black'} resigned.`;
  statusEl.textContent = 'Game over';
});
document.querySelector('#draw').addEventListener('click', () => {
  if (!auth?.currentUser) return showAuth('login');
  messageEl.textContent = 'Draw offer sent locally.';
});
document.querySelector('#copy-room').addEventListener('click', async () => {
  if (gameId) {
    await navigator.clipboard.writeText(`${location.origin}${location.pathname}?game=${gameId}`);
    messageEl.textContent = 'Room link copied.';
  } else messageEl.textContent = 'Create a synced game first.';
});

if (firebaseReady) {
  connectionEl.textContent = 'Firebase connected';
  watchAuth(async (user) => {
    await updateAccountUI(user);
    const incoming = new URLSearchParams(location.search).get('game');
    if (user && incoming && !gameId) {
      gameId = incoming;
      roomEl.textContent = gameId.slice(0, 8);
      await joinGame(gameId);
    }
    render();
  });
} else {
  connectionEl.textContent = 'Local mode';
}

render();
