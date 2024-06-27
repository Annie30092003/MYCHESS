const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let whiteTime = 600; // 10 minutes in seconds
let blackTime = 600; // 10 minutes in seconds
let timerInterval;

const whiteTimerElement = document.getElementById("white-timer");
const blackTimerElement = document.getElementById("black-timer");

const startTimer = (role) => {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (role === "w") {
      whiteTime--;
      if (whiteTime <= 0) {
        clearInterval(timerInterval);
        alert("Black wins on time!");
        socket.emit("gameOver", "b");
      }
    } else {
      blackTime--;
      if (blackTime <= 0) {
        clearInterval(timerInterval);
        alert("White wins on time!");
        socket.emit("gameOver", "w");
      }
    }
    updateTimers();
  }, 1000);
};

const updateTimers = () => {
  whiteTimerElement.textContent = formatTime(whiteTime);
  blackTimerElement.textContent = formatTime(blackTime);
};

const formatTime = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";
  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
      );
      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowindex, col: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", (e) => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }
      squareElement.addEventListener("dragover", function (e) {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", function (e) {
        e.preventDefault();
        if (draggedPiece) {
          const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };
          handleMove(sourceSquare, targetSquare);
        }
      });
      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
};

const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };
  socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
  };
  return unicodePieces[piece.type] || "";
};

socket.on("playerRole", function (role) {
  playerRole = role;
  renderBoard();
});

socket.on("spectatorRole", function () {
  playerRole = null;
  renderBoard();
});

socket.on("startGame", function () {
  startTimer(chess.turn());
});

socket.on("boardState", function (fen) {
  chess.load(fen);
  startTimer(chess.turn());
  renderBoard();
});

socket.on("move", function (move) {
  chess.move(move);
  startTimer(chess.turn());
  renderBoard();
});

socket.on("check", function (currentPlayer) {
  console.log("Check detected for player:", currentPlayer);
  alert(`${currentPlayer === "w" ? "White" : "Black"} is in check!`);
});

socket.on("gameOver", function (winner) {
  console.log("Game over detected, winner:", winner);
  alert(`${winner === "w" ? "White" : "Black"} wins by checkmate!`);
});

updateTimers();
renderBoard();
