import { initialState, legalMoves, makeMove, allLegalMoves, inCheck, gameStatus, notation, pieceToImage } from './chess.js';
import { auth, db, firebaseReady, signup, login, logout, getCurrentUser, onAuthChange } from './firebase.js';
import { collection, addDoc, doc, setDoc, getDoc, onSnapshot, updateDoc, serverTimestamp, query, where } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

let gameState = initialState();
let selectedSquare = null;
let selectedMoves = [];
let currentGameId = null;
let currentUser = null;
let currentPlayerColor = null;
let gameUnsubscribe = null;
let lastMove = null;
let authMode = 'login';

const boardEl = document.getElementById('chessboard');
const messageEl = document.getElementById('message');
const turnEl = document.getElementById('turn');
const statusEl = document.getElementById('game-status');
const moveCountEl = document.getElementById('move-count');
const moveListEl = document.getElementById('move-list');
const connectionEl = document.getElementById('connection');
const authPanel = document.getElementById('auth-panel');
const authModal = document.getElementById('auth-modal');
const authButton = document.getElementById('auth-button');
const newGameBtns = [document.getElementById('new-game-btn'), document.getElementById('new-game-control')];
const copyLinkBtn = document.getElementById('copy-link');
const offerDrawBtn = document.getElementById('offer-draw');
const resignBtn = document.getElementById('resign');
const authSubmitBtn = document.getElementById('auth-submit');
const toggleSignupBtn = document.getElementById('toggle-signup');
const authCloseBtn = document.querySelector('.auth-close');
const authErrorEl = document.getElementById('auth-error');
const authStatusEl = document.getElementById('auth-status');

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// Initialize Firebase connection status
setTimeout(() => {
  connectionEl.textContent = 'Connected';
  connectionEl.classList.add('connected');
}, 1000);

// Auth listeners
onAuthChange(async (user) => {
  currentUser = user;
  if (user) {
    authStatusEl.textContent = user.displayName || user.email.split('@')[0];
    authButton.textContent = 'Log Out';
    authPanel.classList.remove('visible');
  } else {
    authStatusEl.textContent = 'Guest';
    authButton.textContent = 'Log In';
  }
});

// Auth UI
authButton.addEventListener('click', () => {
  if (currentUser) {
    logout();
  } else {
    authMode = 'login';
    updateAuthUI();
    authPanel.classList.add('visible');
  }
});

authCloseBtn.addEventListener('click', () => {
  authPanel.classList.remove('visible');
});

authPanel.addEventListener('click', (e) => {
  if (e.target === authPanel) {
    authPanel.classList.remove('visible');
  }
});

toggleSignupBtn.addEventListener('click', (e) => {
  e.preventDefault();
  authMode = authMode === 'login' ? 'signup' : 'login';
  updateAuthUI();
});

function updateAuthUI() {
  const usernameGroup = document.getElementById('username-group');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');
  const toggleBtn = toggleSignupBtn;

  if (authMode === 'signup') {
    authTitle.textContent = 'Create Account';
    authSubtitle.textContent = 'Sign up to play';
    usernameGroup.style.display = 'flex';
    authSubmitBtn.textContent = 'Create Account';
    toggleBtn.textContent = 'Already have an account? Log in';
  } else {
    authTitle.textContent = 'Log In';
    authSubtitle.textContent = 'Play chess online with friends';
    usernameGroup.style.display = 'none';
    authSubmitBtn.textContent = 'Log In';
    toggleBtn.textContent = "Don't have an account? Sign up";
  }

  emailInput.value = '';
  passwordInput.value = '';
  authErrorEl.textContent = '';
  authErrorEl.classList.remove('visible');
}

authSubmitBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const username = document.getElementById('username').value;

  authErrorEl.classList.remove('visible');

  try {
    if (authMode === 'signup') {
      if (!username) {
        throw new Error('Username required');
      }
      await signup(email, password, username);
    } else {
      await login(email, password);
    }
    authPanel.classList.remove('visible');
  } catch (err) {
    authErrorEl.textContent = err.message;
    authErrorEl.classList.add('visible');
  }
});

// Game creation
newGameBtns.forEach(btn => {
  btn.addEventListener('click', createNewGame);
});

async function createNewGame() {
  if (!currentUser) {
    authMode = 'login';
    updateAuthUI();
    authPanel.classList.add('visible');
    return;
  }

  const newGame = {
    board: gameState.board,
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
    moves: [],
    whitePlayer: currentUser.uid,
    blackPlayer: null,
    createdBy: currentUser.uid,
    createdAt: serverTimestamp(),
    status: 'waiting'
  };

  try {
    const docRef = await addDoc(collection(db, 'games'), newGame);
    currentGameId = docRef.id;
    currentPlayerColor = 'w';
    loadGame(docRef.id);
    shareGameLink();
  } catch (err) {
    console.error('Failed to create game:', err);
  }
}

function shareGameLink() {
  const link = `${window.location.origin}${window.location.pathname}?game=${currentGameId}`;
  console.log('Game link:', link);
}

copyLinkBtn.addEventListener('click', async () => {
  if (!currentGameId) return;
  const link = `${window.location.origin}${window.location.pathname}?game=${currentGameId}`;
  await navigator.clipboard.writeText(link);
  copyLinkBtn.textContent = 'Copied!';
  setTimeout(() => {
    copyLinkBtn.textContent = 'Copy Link';
  }, 2000);
});

offerDrawBtn.addEventListener('click', async () => {
  if (!currentGameId) return;
  try {
    await updateDoc(doc(db, 'games', currentGameId), {
      drawOffered: currentPlayerColor
    });
  } catch (err) {
    console.error('Failed to offer draw:', err);
  }
});

resignBtn.addEventListener('click', async () => {
  if (!currentGameId || !currentPlayerColor) return;
  const winner = currentPlayerColor === 'w' ? 'b' : 'w';
  try {
    await updateDoc(doc(db, 'games', currentGameId), {
      status: 'resigned',
      winner
    });
  } catch (err) {
    console.error('Failed to resign:', err);
  }
});

// Game loading and syncing
async function loadGame(gameId) {
  currentGameId = gameId;

  if (gameUnsubscribe) gameUnsubscribe();

  gameUnsubscribe = onSnapshot(doc(db, 'games', gameId), (docSnapshot) => {
    if (!docSnapshot.exists()) {
      messageEl.textContent = 'Game not found';
      return;
    }

    const data = docSnapshot.data();

    if (!currentPlayerColor) {
      if (data.whitePlayer === currentUser?.uid) {
        currentPlayerColor = 'w';
      } else if (data.blackPlayer === currentUser?.uid) {
        currentPlayerColor = 'b';
      } else if (!data.blackPlayer && currentUser) {
        currentPlayerColor = 'b';
        updateDoc(doc(db, 'games', gameId), { blackPlayer: currentUser.uid });
      } else if (!currentUser) {
        messageEl.textContent = 'Please log in to play';
      }
    }

    reconstructGameState(data);
    render();
  });
}

function reconstructGameState(dbData) {
  gameState = {
    board: dbData.board || initialState().board,
    turn: dbData.turn || 'w',
    castling: dbData.castling || { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: dbData.enPassant,
    halfmove: dbData.halfmove || 0,
    fullmove: dbData.fullmove || 1,
    moves: dbData.moves || []
  };
}

function render() {
  renderBoard();
  updateGameInfo();
  updateMoveList();
}

function renderBoard() {
  boardEl.innerHTML = '';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = document.createElement('button');
      square.className = `square ${(r + c) % 2 === 0 ? 'dark' : 'light'}`;
      
      if (selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c) {
        square.classList.add('selected');
      }

      if (selectedMoves.some(m => m.to[0] === r && m.to[1] === c)) {
        square.classList.add(gameState.board[r][c] ? 'capture' : 'legal');
      }

      const piece = gameState.board[r][c];
      if (piece) {
        const img = document.createElement('img');
        img.src = `assets/pieces/${pieceToImage(piece)}`;
        img.alt = `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`;
        square.appendChild(img);
      }

      if (lastMove && ((lastMove.from[0] === r && lastMove.from[1] === c) || (lastMove.to[0] === r && lastMove.to[1] === c))) {
        square.style.background = '#9b8b5c';
      }

      if (piece?.type === 'k' && inCheck(gameState, piece.color)) {
        square.classList.add('in-check');
      }

      if (c === 7) {
        const rank = document.createElement('span');
        rank.className = 'coord rank';
        rank.textContent = RANKS[r];
        square.appendChild(rank);
      }

      if (r === 7) {
        const file = document.createElement('span');
        file.className = 'coord file';
        file.textContent = FILES[c];
        square.appendChild(file);
      }

      square.addEventListener('click', () => handleSquareClick(r, c));
      boardEl.appendChild(square);
    }
  }
}

async function handleSquareClick(r, c) {
  if (!currentPlayerColor || gameState.turn !== currentPlayerColor) {
    messageEl.textContent = 'Not your turn';
    return;
  }

  const piece = gameState.board[r][c];

  if (selectedSquare) {
    const move = selectedMoves.find(m => m.to[0] === r && m.to[1] === c);
    if (move) {
      let promotion = 'q';
      if (move.promotion) {
        promotion = await getPromotionChoice();
      }

      try {
        const newState = makeMove(gameState, selectedSquare, [r, c], promotion);
        lastMove = { from: selectedSquare, to: [r, c] };
        
        await updateDoc(doc(db, 'games', currentGameId), {
          board: newState.board,
          turn: newState.turn,
          castling: newState.castling,
          enPassant: newState.enPassant,
          halfmove: newState.halfmove,
          fullmove: newState.fullmove,
          moves: newState.moves
        });

        selectedSquare = null;
        selectedMoves = [];
      } catch (err) {
        console.error('Failed to make move:', err);
      }
    } else if (piece && piece.color === currentPlayerColor) {
      selectedSquare = [r, c];
      selectedMoves = legalMoves(gameState, r, c);
    } else {
      selectedSquare = null;
      selectedMoves = [];
    }
  } else if (piece && piece.color === currentPlayerColor) {
    selectedSquare = [r, c];
    selectedMoves = legalMoves(gameState, r, c);
  }

  render();
}

async function getPromotionChoice() {
  return 'q';
}

function updateGameInfo() {
  turnEl.textContent = gameState.turn === 'w' ? 'White' : 'Black';
  statusEl.textContent = gameStatus(gameState);
  messageEl.textContent = gameStatus(gameState) + '.';
  moveCountEl.textContent = gameState.fullmove;

  document.getElementById('white-name').textContent = 'White';
  document.getElementById('black-name').textContent = 'Black';
  
  const isWhitesTurn = gameState.turn === 'w';
  document.getElementById('white-status').textContent = isWhitesTurn ? 'Your turn' : 'Opponent turn';
  document.getElementById('black-status').textContent = !isWhitesTurn ? 'Your turn' : 'Opponent turn';
}

function updateMoveList() {
  moveListEl.innerHTML = '';
  for (let i = 0; i < gameState.moves.length; i += 2) {
    const li = document.createElement('li');
    const moveNum = i / 2 + 1;
    const whiteMove = gameState.moves[i] || '';
    const blackMove = gameState.moves[i + 1] || '';
    li.textContent = `${moveNum}. ${whiteMove} ${blackMove}`;
    moveListEl.appendChild(li);
  }
}

// Handle game link from URL
const params = new URLSearchParams(window.location.search);
const gameIdFromUrl = params.get('game');

firebaseReady.then(() => {
  if (gameIdFromUrl && currentUser) {
    loadGame(gameIdFromUrl);
  } else if (gameIdFromUrl && !currentUser) {
    messageEl.textContent = 'Please log in to join this game';
  }
});

// Initial render
render();
