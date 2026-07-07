let game = null;
let board = null;
let gameMode = null;
let sourceSquare = null;

const menuScreen = document.getElementById("menu");
const gameScreen = document.getElementById("game-screen");
const statusEl = document.getElementById("status");

document.getElementById("btn-local").addEventListener("click", () => startGame("local"));
document.getElementById("btn-ai").addEventListener("click", () => startGame("ai"));
document.getElementById("btn-back").addEventListener("click", resetToMenu);

function startGame(mode) {
    gameMode = mode;
    menuScreen.style.display = "none";
    gameScreen.style.display = "flex";
    game = new Chess();
    updateStatus();
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    board = ChessBoard('board', config);
    removeHighlights();
    $('#board').on('click', '.square-55d63', handleSquareClick);
}

function handleSquareClick() {
    if (game.game_over()) return;
    if (gameMode === 'ai' && game.turn() === 'b') return;
    const square = $(this).data('square');
    const piece = game.get(square);
    if (sourceSquare === null) {
        if (!piece || piece.color !== game.turn()) return;
        sourceSquare = square;
        highlightSquare(square);
        return;
    }
    if (sourceSquare === square) {
        sourceSquare = null;
        removeHighlights();
        return;
    }
    if (piece && piece.color === game.turn()) {
        sourceSquare = square;
        removeHighlights();
        highlightSquare(square);
        return;
    }
    const move = game.move({
        from: sourceSquare,
        to: square,
        promotion: 'q'
    });
    if (move === null) return;
    sourceSquare = null;
    removeHighlights();
    board.position(game.fen());
    updateStatus();
    if (gameMode === 'ai' && !game.game_over()) {
        window.setTimeout(makeRandomAIMove, 300);
    }
}

function highlightSquare(square) {
    const $square = $('#board .square-' + square);
    $square.css('box-shadow', 'inset 0 0 3px 3px yellow');
}

function removeHighlights() {
    $('#board .square-55d63').css('box-shadow', '');
}

function onDragStart(source, piece, position, orientation) {
    if (game.game_over()) return false;
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
    if (gameMode === 'ai' && game.turn() === 'b') {
        return false;
    }
    sourceSquare = null;
    removeHighlights();
}

function onDrop(source, target) {
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });
    if (move === null) return 'snapback';
    sourceSquare = null;
    removeHighlights();
    updateStatus();
    if (gameMode === 'ai' && !game.game_over()) {
        window.setTimeout(makeRandomAIMove, 300);
    }
}

function onSnapEnd() {
    board.position(game.fen());
}

function makeRandomAIMove() {
    const possibleMoves = game.moves();
    if (possibleMoves.length === 0) return;
    const randomIdx = Math.floor(Math.random() * possibleMoves.length);
    game.move(possibleMoves[randomIdx]);
    board.position(game.fen());
    updateStatus();
}

function updateStatus() {
    let statusText = "";
    const moveColor = game.turn() === "b" ? "Black" : "White";
    if (game.in_checkmate()) {
        statusText = `Game Over! ${moveColor} is in checkmate.`;
    } else if (game.in_draw()) {
        statusText = "Game Over! Match is a Draw.";
    } else {
        if (gameMode === "ai") {
            statusText = game.turn() === "w" ? "Your Turn (White)" : "Computer is thinking...";
        } else {
            statusText = `${moveColor}'s Turn to Move`;
        }
        if (game.in_check()) {
            statusText += " (In Check!)";
        }
    }
    statusEl.innerText = statusText;
}

function resetToMenu() {
    $('#board').off('click', '.square-55d63');
    sourceSquare = null;
    removeHighlights();
    if (board) board.clear();
    game = null;
    board = null;
    gameMode = null;
    gameScreen.style.display = "none";
    menuScreen.style.display = "flex";
}