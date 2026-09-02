import { initialState, pieceGlyph, legalMoves, makeMove, allLegalMoves, inCheck, gameStatus, notation } from './chess.js';
import { db, auth, firebaseReady } from './firebase.js';
import { collection, addDoc, doc, setDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const boardEl=document.querySelector('#chessboard');
const moveList=document.querySelector('#move-list');
const messageEl=document.querySelector('#message');
const turnEl=document.querySelector('#turn');
const statusEl=document.querySelector('#game-status');
const roomEl=document.querySelector('#room-id');
const connectionEl=document.querySelector('#connection');
let state=initialState();
let selected=null;
let selectedMoves=[];
let gameId=null;
let unsubscribe=null;
let moves=[];

const files=['a','b','c','d','e','f','g','h'];
const ranks=['8','7','6','5','4','3','2','1'];

function render(){
  boardEl.innerHTML='';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const sq=document.createElement('button');
    sq.className=`square ${(r+c)%2?'dark':'light'}`;
    if(selected?.[0]===r&&selected?.[1]===c)sq.classList.add('selected');
    if(selectedMoves.some(m=>m.to[0]===r&&m.to[1]===c)) sq.classList.add(state.board[r][c]?'capture':'legal');
    const k=state.board[r][c];
    if(k){const span=document.createElement('span');span.className=`piece ${k.color==='w'?'white-piece':'black-piece'}`;span.textContent=pieceGlyph(k);sq.appendChild(span);}
    if(c===7){const rank=document.createElement('span');rank.className='coord rank';rank.textContent=ranks[r];sq.appendChild(rank);}
    if(r===7){const file=document.createElement('span');file.className='coord file';file.textContent=files[c];sq.appendChild(file);}
    if(k?.type==='k'&&inCheck(state,k.color))sq.classList.add('in-check');
    sq.addEventListener('click',()=>clickSquare(r,c));
    boardEl.appendChild(sq);
  }
  turnEl.textContent=state.turn==='w'?'White':'Black';
  statusEl.textContent=gameStatus(state);
  messageEl.textContent=gameStatus(state)+'.';
  renderMoves();
}

function renderMoves(){moveList.innerHTML='';moves.forEach((m,i)=>{const li=document.createElement('li');li.textContent=`${Math.floor(i/2)+1}${i%2===0?'. ':'... '}${m}`;moveList.appendChild(li);});}

function clickSquare(r,c){
  const p=state.board[r][c];
  if(selected){
    const move=selectedMoves.find(m=>m.to[0]===r&&m.to[1]===c);
    if(move){
      let promotion='q';
      if(promotionSquare(move,state)){
        const choice=prompt('Promote to: q, r, b or n','q')?.toLowerCase();
        if(['q','r','b','n'].includes(choice))promotion=choice;
      }
      const text=notation(state,move);
      const next=makeMove(state,move,promotion);
      if(next){state=next;moves.push(text);selected=null;selectedMoves=[];render();saveGame();}
      return;
    }
  }
  if(p?.color===state.turn){selected=[r,c];selectedMoves=legalMoves(state,selected);render();}
  else {selected=null;selectedMoves=[];render();}
}
function promotionSquare(move,s){const p=s.board[move.from[0]][move.from[1]];return p?.type==='p'&&(move.to[0]===0||move.to[0]===7);}

async function saveGame(){
  if(!firebaseReady||!auth.currentUser)return;
  try{
    if(!gameId){const ref=await addDoc(collection(db,'games'),{board:state.board,turn:state.turn,castling:state.castling,enPassant:state.enPassant,halfmove:state.halfmove,fullmove:state.fullmove,moves,status:gameStatus(state),createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});gameId=ref.id;roomEl.textContent=gameId.slice(0,8);}
    else await setDoc(doc(db,'games',gameId),{board:state.board,turn:state.turn,castling:state.castling,enPassant:state.enPassant,halfmove:state.halfmove,fullmove:state.fullmove,moves,status:gameStatus(state)},{merge:true});
  }catch(e){console.error(e);}
}

function newGame(){if(unsubscribe)unsubscribe();gameId=null;moves=[];state=initialState();selected=null;selectedMoves=[];roomEl.textContent='Local';render();}

document.querySelector('#new-game').addEventListener('click',newGame);
document.querySelector('#resign').addEventListener('click',()=>{messageEl.textContent=`${state.turn==='w'?'White':'Black'} resigned.`;statusEl.textContent='Game over';});
document.querySelector('#draw').addEventListener('click',()=>{messageEl.textContent='Draw offer sent locally.';});
document.querySelector('#copy-room').addEventListener('click',async()=>{if(gameId){await navigator.clipboard.writeText(`${location.origin}${location.pathname}?game=${gameId}`);messageEl.textContent='Room link copied.';}else messageEl.textContent='Start a synced game first.';});

if(firebaseReady){connectionEl.textContent='Firebase connected';const params=new URLSearchParams(location.search);const incoming=params.get('game');if(incoming){gameId=incoming;roomEl.textContent=gameId.slice(0,8);unsubscribe=onSnapshot(doc(db,'games',gameId),snap=>{if(!snap.exists())return;const d=snap.data();state={board:d.board,turn:d.turn,castling:d.castling||'',enPassant:d.enPassant||'-',halfmove:d.halfmove||0,fullmove:d.fullmove||1,history:[]};moves=d.moves||[];render();});}}
else connectionEl.textContent='Local mode';
render();
