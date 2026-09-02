export function initialState() {
  return {
    board: [
      [{ type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'q', color: 'b' }, { type: 'k', color: 'b' }, { type: 'b', color: 'b' }, { type: 'n', color: 'b' }, { type: 'r', color: 'b' }],
      [{ type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [{ type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }],
      [{ type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'q', color: 'w' }, { type: 'k', color: 'w' }, { type: 'b', color: 'w' }, { type: 'n', color: 'w' }, { type: 'r', color: 'w' }]
    ],
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
    moves: []
  };
}

export function pieceToImage(piece) {
  if (!piece) return null;
  return `${piece.color}${piece.type.toUpperCase()}.png`;
}

export function legalMoves(state, row, col) {
  const piece = state.board[row][col];
  if (!piece || piece.color !== state.turn) return [];

  let moves = [];
  const { type, color } = piece;

  if (type === 'p') moves = pawnMoves(state, row, col, color);
  else if (type === 'n') moves = knightMoves(state, row, col, color);
  else if (type === 'b') moves = bishopMoves(state, row, col, color);
  else if (type === 'r') moves = rookMoves(state, row, col, color);
  else if (type === 'q') moves = queenMoves(state, row, col, color);
  else if (type === 'k') moves = kingMoves(state, row, col, color);

  return moves.filter(move => !leavesInCheck(state, { from: [row, col], to: move.to }));
}

function pawnMoves(state, row, col, color) {
  const moves = [];
  const dir = color === 'w' ? -1 : 1;
  const startRow = color === 'w' ? 6 : 1;

  const oneStep = row + dir;
  if (oneStep >= 0 && oneStep <= 7 && !state.board[oneStep][col]) {
    moves.push({ to: [oneStep, col], promotion: oneStep === (color === 'w' ? 0 : 7) });
    
    if (row === startRow) {
      const twoSteps = row + 2 * dir;
      if (!state.board[twoSteps][col]) {
        moves.push({ to: [twoSteps, col] });
      }
    }
  }

  for (const dc of [-1, 1]) {
    const [nr, nc] = [row + dir, col + dc];
    if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
      const target = state.board[nr][nc];
      if (target && target.color !== color) {
        moves.push({ to: [nr, nc], promotion: nr === (color === 'w' ? 0 : 7) });
      }
      if (state.enPassant && state.enPassant[0] === nr && state.enPassant[1] === nc) {
        moves.push({ to: [nr, nc], capture: [row, nc] });
      }
    }
  }

  return moves;
}

function knightMoves(state, row, col, color) {
  const moves = [];
  for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
    const [nr, nc] = [row + dr, col + dc];
    if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
      const target = state.board[nr][nc];
      if (!target || target.color !== color) moves.push({ to: [nr, nc] });
    }
  }
  return moves;
}

function bishopMoves(state, row, col, color) {
  const moves = [];
  for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    for (let i = 1; i <= 7; i++) {
      const [nr, nc] = [row + dr * i, col + dc * i];
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
      const target = state.board[nr][nc];
      if (!target) moves.push({ to: [nr, nc] });
      else {
        if (target.color !== color) moves.push({ to: [nr, nc] });
        break;
      }
    }
  }
  return moves;
}

function rookMoves(state, row, col, color) {
  const moves = [];
  for (const [dr, dc] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    for (let i = 1; i <= 7; i++) {
      const [nr, nc] = [row + dr * i, col + dc * i];
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
      const target = state.board[nr][nc];
      if (!target) moves.push({ to: [nr, nc] });
      else {
        if (target.color !== color) moves.push({ to: [nr, nc] });
        break;
      }
    }
  }
  return moves;
}

function queenMoves(state, row, col, color) {
  return [...bishopMoves(state, row, col, color), ...rookMoves(state, row, col, color)];
}

function kingMoves(state, row, col, color) {
  const moves = [];
  for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
    const [nr, nc] = [row + dr, col + dc];
    if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
      const target = state.board[nr][nc];
      if (!target || target.color !== color) moves.push({ to: [nr, nc] });
    }
  }

  const castleRow = color === 'w' ? 7 : 0;
  const k = color === 'w' ? 'wK' : 'bK';
  const q = color === 'w' ? 'wQ' : 'bQ';

  if (state.castling[k] && !state.board[castleRow][7] && !state.board[castleRow][5] && !state.board[castleRow][6]) {
    moves.push({ to: [castleRow, 6], castle: true });
  }
  if (state.castling[q] && !state.board[castleRow][0] && !state.board[castleRow][1] && !state.board[castleRow][2] && !state.board[castleRow][3]) {
    moves.push({ to: [castleRow, 2], castle: true });
  }

  return moves;
}

export function makeMove(state, from, to, promotionPiece = 'q') {
  const piece = state.board[from[0]][from[1]];
  if (!piece) throw new Error('No piece at source square');
  
  const newState = JSON.parse(JSON.stringify(state));

  if (piece.type === 'p' && from[1] !== to[1] && !newState.board[to[0]][to[1]]) {
    newState.board[from[0]][to[1]] = null;
  }

  if (piece.type === 'k' && Math.abs(to[1] - from[1]) === 2) {
    const rookCol = to[1] > from[1] ? 7 : 0;
    const newRookCol = to[1] > from[1] ? 5 : 3;
    const rook = newState.board[from[0]][rookCol];
    newState.board[from[0]][newRookCol] = rook;
    newState.board[from[0]][rookCol] = null;

    if (piece.color === 'w') {
      newState.castling.wK = false;
      newState.castling.wQ = false;
    } else {
      newState.castling.bK = false;
      newState.castling.bQ = false;
    }
  }

  if (piece.type === 'k') {
    if (piece.color === 'w') {
      newState.castling.wK = false;
      newState.castling.wQ = false;
    } else {
      newState.castling.bK = false;
      newState.castling.bQ = false;
    }
  }

  if (piece.type === 'r') {
    if (piece.color === 'w' && from[0] === 7) {
      if (from[1] === 0) newState.castling.wQ = false;
      if (from[1] === 7) newState.castling.wK = false;
    }
    if (piece.color === 'b' && from[0] === 0) {
      if (from[1] === 0) newState.castling.bQ = false;
      if (from[1] === 7) newState.castling.bK = false;
    }
  }

  const capturedPiece = newState.board[to[0]][to[1]];

  newState.board[to[0]][to[1]] = piece.type === 'p' && (to[0] === 0 || to[0] === 7)
    ? { type: promotionPiece, color: piece.color }
    : piece;
  newState.board[from[0]][from[1]] = null;

  if (capturedPiece && capturedPiece.type === 'r') {
    if (capturedPiece.color === 'w' && to[0] === 7) {
      if (to[1] === 0) newState.castling.wQ = false;
      if (to[1] === 7) newState.castling.wK = false;
    }
    if (capturedPiece.color === 'b' && to[0] === 0) {
      if (to[1] === 0) newState.castling.bQ = false;
      if (to[1] === 7) newState.castling.bK = false;
    }
  }

  newState.enPassant = null;
  if (piece.type === 'p' && Math.abs(to[0] - from[0]) === 2) {
    newState.enPassant = [(from[0] + to[0]) / 2, to[1]];
  }

  newState.halfmove = capturedPiece || piece.type === 'p' ? 0 : newState.halfmove + 1;
  if (piece.color === 'b') newState.fullmove += 1;
  newState.turn = piece.color === 'w' ? 'b' : 'w';

  const moveNotation = notation(state, from, to, promotionPiece);
  newState.moves.push(moveNotation);

  return newState;
}

export function allLegalMoves(state) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c] && state.board[r][c].color === state.turn) {
        legalMoves(state, r, c).forEach(move => {
          moves.push({ from: [r, c], to: move.to, promotion: move.promotion });
        });
      }
    }
  }
  return moves;
}

export function inCheck(state, color) {
  let kingPos = null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c]?.type === 'k' && state.board[r][c].color === color) {
        kingPos = [r, c];
        break;
      }
    }
    if (kingPos) break;
  }

  if (!kingPos) return false;

  const opposite = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c]?.color === opposite) {
        const moves = legalMovesWithoutCheckFilter(state, r, c);
        if (moves.some(m => m.to[0] === kingPos[0] && m.to[1] === kingPos[1])) {
          return true;
        }
      }
    }
  }
  return false;
}

function legalMovesWithoutCheckFilter(state, row, col) {
  const piece = state.board[row][col];
  if (!piece) return [];

  let moves = [];
  const { type, color } = piece;

  if (type === 'p') moves = pawnMoves(state, row, col, color);
  else if (type === 'n') moves = knightMoves(state, row, col, color);
  else if (type === 'b') moves = bishopMoves(state, row, col, color);
  else if (type === 'r') moves = rookMoves(state, row, col, color);
  else if (type === 'q') moves = queenMoves(state, row, col, color);
  else if (type === 'k') moves = kingMoves(state, row, col, color);

  return moves;
}

function leavesInCheck(state, move) {
  const testState = JSON.parse(JSON.stringify(state));
  const piece = testState.board[move.from[0]][move.from[1]];
  testState.board[move.to[0]][move.to[1]] = piece;
  testState.board[move.from[0]][move.from[1]] = null;

  if (piece.type === 'p' && move.from[1] !== move.to[1] && !state.board[move.to[0]][move.to[1]]) {
    testState.board[move.from[0]][move.to[1]] = null;
  }

  if (piece.type === 'k' && Math.abs(move.to[1] - move.from[1]) === 2) {
    const rookCol = move.to[1] > move.from[1] ? 7 : 0;
    const newRookCol = move.to[1] > move.from[1] ? 5 : 3;
    const rook = testState.board[move.from[0]][rookCol];
    testState.board[move.from[0]][newRookCol] = rook;
    testState.board[move.from[0]][rookCol] = null;
  }

  return inCheck(testState, piece.color);
}

export function gameStatus(state) {
  const legal = allLegalMoves(state);
  const inChk = inCheck(state, state.turn);

  if (legal.length === 0) {
    return inChk ? `Checkmate - ${state.turn === 'w' ? 'Black' : 'White'} wins` : 'Stalemate - Draw';
  }

  if (inChk) return `${state.turn === 'w' ? 'White' : 'Black'} in check`;

  return `${state.turn === 'w' ? 'White' : 'Black'} to move`;
}

export function notation(state, from, to, promotion = 'q') {
  const piece = state.board[from[0]][from[1]];
  const target = state.board[to[0]][to[1]];
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  let move = '';

  if (piece.type === 'k' && Math.abs(to[1] - from[1]) === 2) {
    move = to[1] > from[1] ? 'O-O' : 'O-O-O';
  } else {
    if (piece.type !== 'p') move += piece.type.toUpperCase();

    if (target) move += 'x';

    move += files[to[1]] + ranks[to[0]];

    if (piece.type === 'p' && (to[0] === 0 || to[0] === 7)) {
      move += '=' + promotion.toUpperCase();
    }
  }

  return move;
}
