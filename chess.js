const PIECES = {
  w: { k:'♔', q:'♕', r:'♖', b:'♗', n:'♘', p:'♙' },
  b: { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' }
};

export const FILES = ['a','b','c','d','e','f','g','h'];
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function initialState() {
  return fromFEN(START_FEN);
}

export function fromFEN(fen) {
  const [placement, turn='w', castling='-', enPassant='-', halfmove='0', fullmove='1'] = fen.split(' ');
  const board = Array.from({length:8}, () => Array(8).fill(null));
  placement.split('/').forEach((row, r) => {
    let c = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) c += Number(ch);
      else { board[r][c] = { color: ch === ch.toUpperCase() ? 'w' : 'b', type: ch.toLowerCase() }; c++; }
    }
  });
  return { board, turn, castling: castling === '-' ? '' : castling, enPassant, halfmove:Number(halfmove), fullmove:Number(fullmove), history:[] };
}

export function pieceGlyph(piece) { return piece ? PIECES[piece.color][piece.type] : ''; }
export function cloneBoard(board) { return board.map(row => row.map(p => p ? {...p} : null)); }
function inside(r,c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function opposite(color) { return color === 'w' ? 'b' : 'w'; }
function kingSquare(board, color) { for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]?.color===color && board[r][c]?.type==='k') return [r,c]; return null; }

export function squareName(r,c) { return FILES[c] + (8-r); }
export function parseSquare(name) { return [8-Number(name[1]), FILES.indexOf(name[0])]; }

export function isSquareAttacked(board, r, c, byColor) {
  const pawnDir = byColor === 'w' ? -1 : 1;
  for (const dc of [-1,1]) { const rr=r-pawnDir, cc=c-dc; if(inside(rr,cc) && board[rr][cc]?.color===byColor && board[rr][cc]?.type==='p') return true; }
  for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) { const rr=r+dr,cc=c+dc; if(inside(rr,cc)&&board[rr][cc]?.color===byColor&&board[rr][cc]?.type==='n') return true; }
  for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) { let rr=r+dr,cc=c+dc; while(inside(rr,cc)){ const p=board[rr][cc]; if(p){ if(p.color===byColor&&(p.type==='b'||p.type==='q')) return true; break; } rr+=dr;cc+=dc; } }
  for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) { let rr=r+dr,cc=c+dc; while(inside(rr,cc)){ const p=board[rr][cc]; if(p){ if(p.color===byColor&&(p.type==='r'||p.type==='q')) return true; break; } rr+=dr;cc+=dc; } }
  for (let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) if(dr||dc){ const rr=r+dr,cc=c+dc; if(inside(rr,cc)&&board[rr][cc]?.color===byColor&&board[rr][cc]?.type==='k') return true; }
  return false;
}

export function inCheck(state, color=state.turn) { const k=kingSquare(state.board,color); return k ? isSquareAttacked(state.board,k[0],k[1],opposite(color)) : true; }

function pseudoMoves(state,r,c) {
  const p=state.board[r][c]; if(!p) return [];
  const out=[]; const add=(rr,cc,extra={})=>{if(inside(rr,cc)&&(!state.board[rr][cc]||state.board[rr][cc].color!==p.color)) out.push({from:[r,c],to:[rr,cc],...extra});};
  if(p.type==='p'){
    const d=p.color==='w'?-1:1, start=p.color==='w'?6:1;
    if(inside(r+d,c)&&!state.board[r+d][c]) { add(r+d,c); if(r===start&&!state.board[r+2*d][c]) add(r+2*d,c); }
    for(const dc of [-1,1]) { const rr=r+d,cc=c+dc; if(inside(rr,cc)&&state.board[rr][cc]&&state.board[rr][cc].color!==p.color) add(rr,cc); if(squareName(rr,cc)===state.enPassant) add(rr,cc,{enPassant:true}); }
  } else if(p.type==='n') for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) add(r+dr,c+dc);
  else if(p.type==='k') {
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) if(dr||dc) add(r+dr,c+dc);
    const home=p.color==='w'?7:0;
    if(r===home&&c===4&&!inCheck(state,p.color)){
      if(state.castling.includes(p.color==='w'?'K':'k')&&!state.board[home][5]&&!state.board[home][6]&&!isSquareAttacked(state.board,home,5,opposite(p.color))&&!isSquareAttacked(state.board,home,6,opposite(p.color))) add(home,6,{castle:'king'});
      if(state.castling.includes(p.color==='w'?'Q':'q')&&!state.board[home][1]&&!state.board[home][2]&&!state.board[home][3]&&!isSquareAttacked(state.board,home,3,opposite(p.color))&&!isSquareAttacked(state.board,home,2,opposite(p.color))) add(home,2,{castle:'queen'});
    }
  } else {
    const dirs=p.type==='b'?[[-1,-1],[-1,1],[1,-1],[1,1]]:p.type==='r'?[[-1,0],[1,0],[0,-1],[0,1]]:[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
    for(const [dr,dc] of dirs){let rr=r+dr,cc=c+dc;while(inside(rr,cc)){if(!state.board[rr][cc]) out.push({from:[r,c],to:[rr,cc]}); else {if(state.board[rr][cc].color!==p.color) out.push({from:[r,c],to:[rr,cc]});break;}rr+=dr;cc+=dc;}}
  }
  return out;
}

function applyMove(state, move, promotion='q') {
  const next={...state, board:cloneBoard(state.board), history:[...state.history]};
  const [fr,fc]=move.from,[tr,tc]=move.to; const p=next.board[fr][fc]; const captured=next.board[tr][tc];
  next.board[fr][fc]=null; next.board[tr][tc]=p;
  if(move.enPassant) next.board[tr+(p.color==='w'?1:-1)][tc]=null;
  if(move.castle==='king'){next.board[tr][5]=next.board[tr][7];next.board[tr][7]=null;}
  if(move.castle==='queen'){next.board[tr][3]=next.board[tr][0];next.board[tr][0]=null;}
  if(p.type==='p'&&(tr===0||tr===7)) p.type=promotion;
  if(p.type==='k') next.castling=next.castling.replace(p.color==='w'?/[KQ]/g:/[kq]/g,'');
  if(p.type==='r') { if(fr===7&&fc===0) next.castling=next.castling.replace('Q',''); if(fr===7&&fc===7) next.castling=next.castling.replace('K',''); if(fr===0&&fc===0) next.castling=next.castling.replace('q',''); if(fr===0&&fc===7) next.castling=next.castling.replace('k',''); }
  if(captured?.type==='r') { if(tr===7&&tc===0) next.castling=next.castling.replace('Q',''); if(tr===7&&tc===7) next.castling=next.castling.replace('K',''); if(tr===0&&tc===0) next.castling=next.castling.replace('q',''); if(tr===0&&tc===7) next.castling=next.castling.replace('k',''); }
  next.enPassant=(p.type==='p'&&Math.abs(tr-fr)===2)?squareName((tr+fr)/2,fc):'-';
  next.halfmove=(p.type==='p'||captured||move.enPassant)?0:next.halfmove+1;
  next.fullmove=state.turn==='b'?state.fullmove+1:state.fullmove; next.turn=opposite(state.turn);
  return next;
}

export function legalMoves(state, from) {
  const [r,c]=from,p=state.board[r][c]; if(!p||p.color!==state.turn)return [];
  return pseudoMoves(state,r,c).filter(m=>!inCheck(applyMove(state,m),p.color));
}
export function allLegalMoves(state,color=state.turn){const original=state.turn; const s={...state,turn:color}; const out=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(s.board[r][c]?.color===color)out.push(...legalMoves(s,[r,c]));return out;}
export function makeMove(state,move,promotion='q'){ if(!legalMoves(state,move.from).some(m=>m.to[0]===move.to[0]&&m.to[1]===move.to[1])) return null; return applyMove(state,move,promotion); }
export function gameStatus(state){const moves=allLegalMoves(state); if(!moves.length)return inCheck(state)?(state.turn==='w'?'Black wins by checkmate':'White wins by checkmate'):'Draw by stalemate'; if(state.halfmove>=100)return 'Draw by fifty-move rule'; return inCheck(state)?`${state.turn==='w'?'White':'Black'} is in check`:`${state.turn==='w'?'White':'Black'} to move`;}
export function toFEN(state){const rows=state.board.map(row=>{let s='',n=0;for(const p of row){if(!p)n++;else{if(n){s+=n;n=0;}s+=p.color==='w'?p.type.toUpperCase():p.type;}}if(n)s+=n;return s;});return `${rows.join('/')} ${state.turn} ${state.castling||'-'} ${state.enPassant} ${state.halfmove} ${state.fullmove}`;}
export function notation(state,move){const p=state.board[move.from[0]][move.from[1]];const capture=state.board[move.to[0]][move.to[1]]||move.enPassant; if(move.castle==='king')return 'O-O';if(move.castle==='queen')return 'O-O-O';const letter=p.type==='p'?'':p.type.toUpperCase();const pawnFile=p.type==='p'&&capture?FILES[move.from[1]]:'';const x=capture?'x':'';return `${letter}${pawnFile}${x}${squareName(...move.to)}`;}
