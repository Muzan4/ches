// ==========================================================================
// CHESSMATE — Elegant Chess Engine & Interface
// ==========================================================================

let game = null;
let board = null;
let gameMode = 'ai'; // 'ai' or 'local'
let selectedSquare = null;
let lastMove = null;
let soundEnabled = true;
let audioCtx = null;
let isMobile = false;

// DOM Elements
const menuScreen = document.getElementById('menu');
const gameScreen = document.getElementById('game-screen');
const appHeader = document.getElementById('app-header');
const btnHeaderBack = document.getElementById('btn-header-back');
const brandHome = document.getElementById('brand-home');

const statusBanner = document.getElementById('status-banner');
const statusHeadline = document.getElementById('status');
const controlHint = document.getElementById('control-hint');
const statusModeLabel = document.getElementById('status-mode-label');

const statusTagWhite = document.getElementById('status-tag-white');
const statusTagBlack = document.getElementById('status-tag-black');
const badgeWhite = document.getElementById('badge-white');
const badgeBlack = document.getElementById('badge-black');
const nameWhite = document.getElementById('name-white');
const nameBlack = document.getElementById('name-black');

const capturedWhiteEl = document.getElementById('captured-by-white');
const capturedBlackEl = document.getElementById('captured-by-black');
const movesListEl = document.getElementById('moves-list');
const moveCountBadge = document.getElementById('move-count-badge');

const gameOverModal = document.getElementById('game-over-modal');
const modalCrestIcon = document.getElementById('modal-crest-icon');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalMeta = document.getElementById('modal-meta');

const btnSoundToggle = document.getElementById('btn-sound-toggle');
const soundIconOn = document.getElementById('sound-icon-on');
const soundIconOff = document.getElementById('sound-icon-off');

// ─── Sound System (Web Audio API) ───
function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playTone(freq, type, duration, gainVal = 0.15) {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        // Audio error suppression
    }
}

function playSound(type) {
    if (!soundEnabled) return;
    initAudio();
    if (type === 'move') {
        playTone(320, 'sine', 0.08, 0.18);
    } else if (type === 'capture') {
        playTone(480, 'triangle', 0.12, 0.25);
    } else if (type === 'check') {
        playTone(580, 'sine', 0.15, 0.2);
        setTimeout(() => playTone(880, 'sine', 0.2, 0.2), 120);
    } else if (type === 'gameover') {
        playTone(440, 'sine', 0.2, 0.2);
        setTimeout(() => playTone(660, 'sine', 0.3, 0.25), 180);
        setTimeout(() => playTone(880, 'sine', 0.45, 0.3), 360);
    }
}

// ─── Event Listeners ───
document.getElementById('btn-ai').addEventListener('click', () => { initAudio(); startGame('ai'); });
document.getElementById('btn-local').addEventListener('click', () => { initAudio(); startGame('local'); });
document.getElementById('btn-menu-exit').addEventListener('click', resetToMenu);
btnHeaderBack.addEventListener('click', resetToMenu);
brandHome.addEventListener('click', resetToMenu);

document.getElementById('btn-restart').addEventListener('click', () => {
    if (confirm('Restart current match?')) {
        startGame(gameMode);
    }
});

document.getElementById('btn-undo').addEventListener('click', handleUndo);
document.getElementById('btn-flip').addEventListener('click', () => {
    if (board) board.flip();
});

document.getElementById('modal-btn-rematch').addEventListener('click', () => {
    gameOverModal.classList.add('is-hidden');
    startGame(gameMode);
});

document.getElementById('modal-btn-review').addEventListener('click', () => {
    gameOverModal.classList.add('is-hidden');
});

btnSoundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundIconOn.classList.toggle('is-hidden', !soundEnabled);
    soundIconOff.classList.toggle('is-hidden', soundEnabled);
});

window.addEventListener('resize', () => {
    if (board) board.resize();
});

// ─── Initialize GhostFibers Background Theme ───
function startGhostFibers() {
    if (typeof initGhostFibers === 'function') {
        initGhostFibers('ghost-fibers-bg', {
            glowColor: '#8b5cf6',
            secondaryColor: '#6366f1',
            layers: 3,
            twist: 1.2,
            threads: 72,
            fiberStyle: 'dots',
            depthOfField: 0.85,
            hoverEffect: 'focus',
            intro: true,
            mouseInteraction: true
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGhostFibers);
} else {
    startGhostFibers();
}

// ─── Screen Navigation ───
function showScreen(screen) {
    menuScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    screen.classList.add('active');

    if (screen === gameScreen) {
        btnHeaderBack.classList.remove('is-hidden');
    } else {
        btnHeaderBack.classList.add('is-hidden');
    }
}

function resetToMenu() {
    clearHighlights();
    selectedSquare = null;
    lastMove = null;
    if (board) {
        board.destroy();
        board = null;
    }
    game = null;
    gameOverModal.classList.add('is-hidden');
    showScreen(menuScreen);
}

// ─── Start Game ───
function startGame(mode) {
    gameMode = mode;
    selectedSquare = null;
    lastMove = null;
    gameOverModal.classList.add('is-hidden');

    if (mode === 'ai') {
        nameWhite.textContent = 'You';
        badgeWhite.textContent = 'White';
        nameBlack.textContent = 'Computer';
        badgeBlack.textContent = 'Black';
        statusModeLabel.textContent = 'Solo vs Computer';
    } else {
        nameWhite.textContent = 'White';
        badgeWhite.textContent = 'Player 1';
        nameBlack.textContent = 'Black';
        badgeBlack.textContent = 'Player 2';
        statusModeLabel.textContent = 'Pass & Play';
    }

    game = new Chess();
    showScreen(gameScreen);

    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };

    if (board) {
        board.destroy();
    }
    board = ChessBoard('board', config);

    // Double resize to ensure chessboard.js accurately fits after DOM reflow
    requestAnimationFrame(() => {
        if (board) board.resize();
        clearHighlights();
    });
    setTimeout(() => {
        if (board) board.resize();
    }, 60);
    setTimeout(() => {
        if (board) board.resize();
    }, 250);

    // Support click-to-move in addition to dragging
    $('#board').off('click').on('click', '.square-55d63', handleSquareClick);

    updateInterface();
}

// ─── Drag & Drop Handlers ───
function onDragStart(source, piece) {
    if (!game || game.game_over()) return false;

    // Reject picking up pieces of the wrong turn
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }

    // In AI mode, player can only move White
    if (gameMode === 'ai' && game.turn() === 'b') {
        return false;
    }

    // Highlight source and legal target squares
    showLegalHints(source);
    return true;
}

function onDrop(source, target) {
    removeLegalHints();

    // Check if move is legal
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    if (move === null) {
        return 'snapback';
    }

    lastMove = { from: source, to: target };
    selectedSquare = null;

    if (move.captured) {
        playSound('capture');
    } else {
        playSound('move');
    }

    updateInterface();

    // Trigger AI response if applicable
    if (gameMode === 'ai' && !game.game_over()) {
        window.setTimeout(makeComputerMove, 350);
    }
}

function onSnapEnd() {
    board.position(game.fen());
}

// ─── Click to Move Handler ───
function handleSquareClick(e) {
    if (!game || game.game_over()) return;
    if (gameMode === 'ai' && game.turn() === 'b') return;

    const $square = $(this);
    const clickedSquare = $square.data('square');
    if (!clickedSquare) return;

    const piece = game.get(clickedSquare);

    // If no piece is selected yet
    if (selectedSquare === null) {
        if (piece && piece.color === game.turn()) {
            selectedSquare = clickedSquare;
            showLegalHints(clickedSquare);
        }
        return;
    }

    // Clicking the same square again cancels selection
    if (selectedSquare === clickedSquare) {
        selectedSquare = null;
        removeLegalHints();
        return;
    }

    // Clicking another piece of the same color switches selection
    if (piece && piece.color === game.turn()) {
        selectedSquare = clickedSquare;
        showLegalHints(clickedSquare);
        return;
    }

    // Attempt to make move from selectedSquare to clickedSquare
    const move = game.move({
        from: selectedSquare,
        to: clickedSquare,
        promotion: 'q'
    });

    if (move === null) {
        // Not a legal move, clear selection
        selectedSquare = null;
        removeLegalHints();
        return;
    }

    // Legal move executed
    lastMove = { from: selectedSquare, to: clickedSquare };
    selectedSquare = null;
    removeLegalHints();

    board.position(game.fen());

    if (move.captured) {
        playSound('capture');
    } else {
        playSound('move');
    }

    updateInterface();

    if (gameMode === 'ai' && !game.game_over()) {
        window.setTimeout(makeComputerMove, 350);
    }
}

// ─── Legal Move Hints & Highlights ───
function showLegalHints(square) {
    removeLegalHints();

    // Highlight the selected square
    $(`#board .square-${square}`).addClass('square-selected');

    // Retrieve all legal moves from this square
    const moves = game.moves({ square: square, verbose: true });
    moves.forEach(m => {
        const $targetSquare = $(`#board .square-${m.to}`);
        const pieceOnTarget = game.get(m.to);

        if (pieceOnTarget || m.captured) {
            $targetSquare.append('<div class="legal-hint-capture"></div>');
        } else {
            $targetSquare.append('<div class="legal-hint-dot"></div>');
        }
    });
}

function removeLegalHints() {
    $('#board .legal-hint-dot, #board .legal-hint-capture').remove();
    $('#board .square-selected').removeClass('square-selected');
}

function clearHighlights() {
    removeLegalHints();
    $('#board .square-last-move').removeClass('square-last-move');
    $('#board .square-in-check').removeClass('square-in-check');
}

function applyBoardHighlights() {
    clearHighlights();

    // Highlight last move
    if (lastMove) {
        $(`#board .square-${lastMove.from}`).addClass('square-last-move');
        $(`#board .square-${lastMove.to}`).addClass('square-last-move');
    }

    // Highlight king if in check
    if (game && game.in_check()) {
        const kingSquare = findKingSquare(game.turn());
        if (kingSquare) {
            $(`#board .square-${kingSquare}`).addClass('square-in-check');
        }
    }
}

function findKingSquare(color) {
    const boardState = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece && piece.type === 'k' && piece.color === color) {
                const file = String.fromCharCode('a'.charCodeAt(0) + c);
                const rank = 8 - r;
                return `${file}${rank}`;
            }
        }
    }
    return null;
}

// ─── Undo Move ───
function handleUndo() {
    if (!game || game.history().length === 0) return;

    if (gameMode === 'ai') {
        // Undo computer's move and player's move
        game.undo();
        if (game.turn() === 'b') {
            game.undo();
        }
    } else {
        game.undo();
    }

    const history = game.history({ verbose: true });
    if (history.length > 0) {
        const last = history[history.length - 1];
        lastMove = { from: last.from, to: last.to };
    } else {
        lastMove = null;
    }

    selectedSquare = null;
    board.position(game.fen());
    updateInterface();
    playSound('move');
}

// ─── Intelligent Computer Engine ───
// Evaluates candidate moves with piece values and positional tactical scoring
function makeComputerMove() {
    if (!game || game.game_over()) return;

    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return;

    // Piece values in centipawns
    const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

    let bestMove = null;
    let bestScore = -999999;

    // Shuffle moves to add variety among equally rated choices
    const shuffledMoves = moves.slice().sort(() => 0.5 - Math.random());

    for (const move of shuffledMoves) {
        // Execute hypothetical move
        game.move(move);

        let score = 0;

        // 1. Checkmate has maximum priority
        if (game.in_checkmate()) {
            score += 100000;
        }

        // 2. Value of captures
        if (move.captured) {
            score += (pieceValues[move.captured] || 100) * 10 - (pieceValues[move.piece] || 100);
        }

        // 3. Check opponent
        if (game.in_check()) {
            score += 45;
        }

        // 4. Center control bonus (d4, d5, e4, e5)
        if (['d4', 'd5', 'e4', 'e5'].includes(move.to)) {
            score += 25;
        }

        // 5. Queen promotion bonus
        if (move.promotion) {
            score += 800;
        }

        // Undo hypothetical move
        game.undo();

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    const selectedMove = bestMove || shuffledMoves[0];
    game.move(selectedMove);
    lastMove = { from: selectedMove.from, to: selectedMove.to };

    board.position(game.fen());

    if (selectedMove.captured) {
        playSound('capture');
    } else {
        playSound('move');
    }

    updateInterface();
}

// ─── Captured Pieces Calculation ───
function updateCapturedPieces() {
    const startingCounts = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentCounts = {
        w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
        b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };

    const boardState = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece && piece.type !== 'k') {
                currentCounts[piece.color][piece.type]++;
            }
        }
    }

    // Pieces captured by White (missing Black pieces)
    // Pieces captured by Black (missing White pieces)
    const pieceSymbols = {
        w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' },
        b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' }
    };

    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    let whiteScore = 0;
    let blackScore = 0;

    let capturedByWhiteHtml = '';
    let capturedByBlackHtml = '';

    const order = ['q', 'r', 'b', 'n', 'p'];

    for (const type of order) {
        const missingBlack = startingCounts[type] - currentCounts['b'][type];
        if (missingBlack > 0) {
            for (let i = 0; i < missingBlack; i++) {
                capturedByWhiteHtml += `<span>${pieceSymbols['b'][type]}</span>`;
                whiteScore += pieceValues[type];
            }
        }

        const missingWhite = startingCounts[type] - currentCounts['w'][type];
        if (missingWhite > 0) {
            for (let i = 0; i < missingWhite; i++) {
                capturedByBlackHtml += `<span>${pieceSymbols['w'][type]}</span>`;
                blackScore += pieceValues[type];
            }
        }
    }

    if (whiteScore > blackScore) {
        capturedByWhiteHtml += `<span class="captured-score">+${whiteScore - blackScore}</span>`;
    } else if (blackScore > whiteScore) {
        capturedByBlackHtml += `<span class="captured-score">+${blackScore - whiteScore}</span>`;
    }

    capturedWhiteEl.innerHTML = capturedByWhiteHtml;
    capturedBlackEl.innerHTML = capturedByBlackHtml;
}

// ─── Move History Notation ───
function updateMoveHistory() {
    const history = game.history();
    moveCountBadge.textContent = `${history.length} move${history.length === 1 ? '' : 's'}`;

    if (history.length === 0) {
        movesListEl.innerHTML = '<div class="moves-empty">No moves played yet</div>';
        return;
    }

    let html = '';
    for (let i = 0; i < history.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = history[i];
        const blackMove = history[i + 1] || '';

        html += `
            <div class="move-row">
                <span class="move-num">${moveNumber}.</span>
                <span class="move-white">${whiteMove}</span>
                <span class="move-black">${blackMove}</span>
            </div>
        `;
    }

    movesListEl.innerHTML = html;
    movesListEl.scrollTop = movesListEl.scrollHeight;
}

// ─── Status & Game State Evaluation ───
function updateInterface() {
    applyBoardHighlights();
    updateCapturedPieces();
    updateMoveHistory();

    const isWhiteTurn = game.turn() === 'w';

    statusBanner.classList.remove('is-check', 'is-game-over');
    statusTagWhite.classList.toggle('active', isWhiteTurn);
    statusTagBlack.classList.toggle('active', !isWhiteTurn);

    if (gameMode === 'ai') {
        statusTagWhite.textContent = isWhiteTurn ? 'Your Turn' : 'Waiting';
        statusTagBlack.textContent = isWhiteTurn ? 'Waiting' : 'Thinking…';
    } else {
        statusTagWhite.textContent = isWhiteTurn ? 'To Move' : 'Waiting';
        statusTagBlack.textContent = isWhiteTurn ? 'Waiting' : 'To Move';
    }

    // =========================================================================
    // Checkmate & End-Game Logic (CORRECTED WINNER DETERMINATION)
    // When game.in_checkmate() is true, game.turn() is the player who has NO legal
    // moves and is under attack — that player LOST!
    // Therefore, winnerColor is the OPPOSITE color:
    // game.turn() === 'b'  -->  WHITE WINS!
    // game.turn() === 'w'  -->  BLACK WINS!
    // =========================================================================
    if (game.in_checkmate()) {
        const checkmatedColor = game.turn(); // 'b' or 'w'
        const winnerColor = checkmatedColor === 'b' ? 'White' : 'Black';

        statusBanner.classList.add('is-game-over');
        playSound('gameover');

        let headline = '';
        let modalText = '';
        let modalHeading = 'Victory!';
        let crest = '🏆';

        if (gameMode === 'ai') {
            if (winnerColor === 'White') {
                headline = 'Checkmate — You Win!';
                modalText = 'Superb strategy! You checkmated the computer as White.';
                modalHeading = 'Victory!';
                crest = '🏆';
            } else {
                headline = 'Checkmate — Computer Wins';
                modalText = 'The computer delivered checkmate. Better luck next game!';
                modalHeading = 'Defeat';
                crest = '♟️';
            }
        } else {
            headline = `Checkmate — ${winnerColor} Wins!`;
            modalText = `${winnerColor} delivers checkmate and claims the victory.`;
            modalHeading = `${winnerColor} is Victorious!`;
            crest = '👑';
        }

        statusHeadline.textContent = headline;
        controlHint.textContent = 'Match concluded by checkmate';

        modalCrestIcon.textContent = crest;
        modalTitle.textContent = modalHeading;
        modalMessage.textContent = modalText;
        modalMeta.textContent = `Completed in ${game.history().length} moves`;
        gameOverModal.classList.remove('is-hidden');
        return;
    }

    // Draw / Stalemate Scenarios
    if (game.in_draw()) {
        statusBanner.classList.add('is-game-over');
        playSound('gameover');

        let reason = 'Draw';
        if (game.in_stalemate()) {
            reason = 'Stalemate — No legal moves available';
        } else if (game.in_threefold_repetition()) {
            reason = 'Draw by threefold repetition';
        } else if (game.insufficient_material()) {
            reason = 'Draw by insufficient mating material';
        } else {
            reason = 'Draw by 50-move rule';
        }

        statusHeadline.textContent = 'Game Drawn';
        controlHint.textContent = reason;

        modalCrestIcon.textContent = '⚖️';
        modalTitle.textContent = 'Peace on the Board';
        modalMessage.textContent = reason;
        modalMeta.textContent = `Completed in ${game.history().length} moves`;
        gameOverModal.classList.remove('is-hidden');
        return;
    }

    // Active Play Status
    if (game.in_check()) {
        statusBanner.classList.add('is-check');
        playSound('check');
        const checkedPlayer = isWhiteTurn ? 'White' : 'Black';
        statusHeadline.textContent = `${checkedPlayer} is in Check!`;
        controlHint.textContent = 'Defend your king or escape the attack';
    } else {
        if (gameMode === 'ai') {
            statusHeadline.textContent = isWhiteTurn ? 'Your Turn' : 'Computer is thinking…';
            controlHint.textContent = isWhiteTurn ? 'Select a piece or drag to a highlighted square' : 'Analyzing candidate moves…';
        } else {
            const turnName = isWhiteTurn ? 'White' : 'Black';
            statusHeadline.textContent = `${turnName} to move`;
            controlHint.textContent = 'Select a piece or drag to a square';
        }
    }
}
