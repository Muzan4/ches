let game = null;
let board = null;
let gameMode = null;
let sourceSquare = null;
let isMobileLayout = false;
let lastTouchTime = 0;

const menuScreen = document.getElementById("menu");
const gameScreen = document.getElementById("game-screen");
const appHeader = document.getElementById("app-header");
const statusEl = document.getElementById("status");
const controlHintEl = document.getElementById("control-hint");
const modeBadgeEl = document.getElementById("mode-badge");
const inputModeLabel = document.getElementById("input-mode-label");
const turnWhiteEl = document.getElementById("turn-white");
const turnBlackEl = document.getElementById("turn-black");

function isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches ||
        window.innerWidth <= 768 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0;
}

window.addEventListener('resize', () => {
    if (board) {
        board.resize();
    }
});

document.getElementById("btn-local").addEventListener("click", () => startGame("local"));
document.getElementById("btn-ai").addEventListener("click", () => startGame("ai"));
document.getElementById("btn-back").addEventListener("click", resetToMenu);

function showScreen(screen) {
    menuScreen.classList.remove("active");
    gameScreen.classList.remove("active");
    screen.classList.add("active");
}

function startGame(mode) {
    gameMode = mode;
    isMobileLayout = isTouchDevice();
    sourceSquare = null;

    modeBadgeEl.textContent = mode === "ai" ? "vs Computer" : "Local Play";
    modeBadgeEl.classList.toggle("ai", mode === "ai");

    inputModeLabel.textContent = isMobileLayout
        ? "Tap a piece, then tap a square"
        : "Drag pieces to move";

    appHeader.classList.add("compact");
    showScreen(gameScreen);

    game = new Chess();
    updateStatus();

    const config = {
        draggable: !isMobileLayout,
        position: 'start',
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };

    if (!isMobileLayout) {
        config.onDragStart = onDragStart;
        config.onDrop = onDrop;
    }

    board = ChessBoard('board', config);

    requestAnimationFrame(() => {
        board.resize();
        removeHighlights();
    });

    $('#board').off('click touchend', handleBoardClick);
    if (isMobileLayout) {
        $('#board').on('click touchend', handleBoardClick);
    }
}

function getSquareFromEvent(e) {
    const $square = $(e.target).closest('.square-55d63');
    if (!$square.length) return null;
    return $square.data('square');
}

function handleBoardClick(e) {
    if (!isMobileLayout || !game) return;

    if (e.type === 'touchend') {
        lastTouchTime = Date.now();
        e.preventDefault();
    } else if (Date.now() - lastTouchTime < 400) {
        return;
    }

    const square = getSquareFromEvent(e);
    if (!square) return;

    processSquareSelection(square);
}

function processSquareSelection(square) {
    if (game.game_over()) return;
    if (gameMode === 'ai' && game.turn() === 'b') return;

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
    $square.css('box-shadow', 'inset 0 0 0 3px rgba(245, 200, 66, 0.85)');
}

function removeHighlights() {
    $('#board .square-55d63').css('box-shadow', '');
}

function onDragStart(source, piece) {
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

function updateTurnIndicator() {
    const isWhiteTurn = game.turn() === "w";
    turnWhiteEl.classList.toggle("active", isWhiteTurn);
    turnBlackEl.classList.toggle("active", !isWhiteTurn);
}

function updateStatus() {
    let statusText = "";
    let hintText = "";
    statusEl.classList.remove("check", "game-over");
    controlHintEl.textContent = "";

    const moveColor = game.turn() === "b" ? "Black" : "White";

    if (game.in_checkmate()) {
        statusText = `Checkmate! ${moveColor} wins.`;
        statusEl.classList.add("game-over");
    } else if (game.in_draw()) {
        statusText = "Draw — the game is tied.";
        statusEl.classList.add("game-over");
    } else {
        if (gameMode === "ai") {
            statusText = game.turn() === "w" ? "Your turn" : "Computer is thinking…";
            hintText = game.turn() === "w" ? "You play as White" : "Please wait";
        } else {
            statusText = `${moveColor} to move`;
        }
        if (game.in_check()) {
            statusText += " — Check!";
            statusEl.classList.add("check");
        }
    }

    statusEl.textContent = statusText;
    controlHintEl.textContent = hintText;
    updateTurnIndicator();
}

function resetToMenu() {
    $('#board').off('click touchend', handleBoardClick);
    sourceSquare = null;
    removeHighlights();
    if (board) board.clear();
    game = null;
    board = null;
    gameMode = null;

    appHeader.classList.remove("compact");
    turnWhiteEl.classList.remove("active");
    turnBlackEl.classList.remove("active");
    statusEl.classList.remove("check", "game-over");
    statusEl.textContent = "Select a mode to begin";
    controlHintEl.textContent = "";

    showScreen(menuScreen);
}
