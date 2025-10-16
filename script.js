const canvas = document.getElementById('game-window');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const myIdEl = document.getElementById('my-id');
const joinInput = document.getElementById('game-id-input');

const hostScore = document.getElementById('host-score');
const clientScore = document.getElementById('client-score');

let peer, conn;
let isHost = true;
let gameStarted = true;

let upPressed = false;
let downPressed = false;

let score = false;
let scoreSide = 0; //0 left, 1 right

const scoreBarWidth = 10;
let scoreBar = { x: 0, y: 0}

// Paddle and ball setup
const paddleWidth = 10, paddleHeight = 80;
const ballSize = 10;
let myPaddleY = canvas.height / 2 - paddleHeight / 2;
let opponentPaddleY = myPaddleY;
let ball = { x: canvas.width / 2, y: canvas.height / 2, vx: -4, vy: 4 };

//Initialize Scoreboard
let scoreH = 0;
let scoreC = 0;
hostScore.textContent = scoreH;
clientScore.textContent = scoreC;


//Create the Peer *once* when the script loads
peer = new Peer();

peer.on('open', id => {
  myIdEl.textContent = id;
});

peer.on('connection', connection => {
  conn = connection;
  isHost = true;
  setupConnection();
  statusEl.textContent = "Connected (Host)";
});


//Set up how we handle connection data
function setupConnection() {
  conn.on('data', data => {
    if (data.type === 'paddle') opponentPaddleY = data.y;
    if (data.type === 'ball' && !isHost) ball = data.ball;
  });
}


document.getElementById('create-btn').onclick = () => {
  statusEl.textContent = "Waiting for player to join...";
};

document.getElementById('join-btn').onclick = () => {
  const peerId = joinInput.value.trim();
  if (!peerId) return;

  conn = peer.connect(peerId);
  conn.on('open', () => {
    setupConnection();
    statusEl.textContent = "Connected (Client)";
  });
};


//Game update + draw loop
let lastTime = 0;

function update(dt) {
  const moveSpeed = 500; // pixels per second

  if (upPressed) {
    myPaddleY -= moveSpeed * dt;
  }
  if (downPressed) {
    myPaddleY += moveSpeed * dt;
  }

  // Keep paddle in canvas
  if (myPaddleY < 0) myPaddleY = 0;
  if (myPaddleY + paddleHeight > canvas.height) myPaddleY = canvas.height - paddleHeight;

  // Ball movement (host)
  if (isHost && gameStarted) {
    ball.x += ball.vx * dt * 60;
    ball.y += ball.vy * dt * 60;

    // Wall bounce
    if (ball.y < 0 || ball.y > canvas.height - ballSize) {
      ball.vy *= -1;
      if (ball.y < 0) ball.y = 0;
      if (ball.y > canvas.height - ballSize) ball.y = canvas.height - ballSize;
  }

    // Paddle bounce
    if (ball.x < paddleWidth && ball.y > myPaddleY && ball.y < myPaddleY + paddleHeight)
      ball.vx *= -1;
    if (ball.x > canvas.width - paddleWidth - ballSize && ball.y > opponentPaddleY && ball.y < opponentPaddleY + paddleHeight)
      ball.vx *= -1;

    //Stop ball when score
    if (ball.x < 0 || ball.x > canvas.width - ballSize) {
      ball.vx = 0;
      if (ball.x < 0) {
        ball.x = 10-ballSize;
        ball.vy = 0;
        scoreC++;
        scoreSide = 0;
        score = true;
        console.log("Score! Client");
        scoreSequence(scoreSide)
      }
      else if (ball.x > canvas.width - ballSize) {
        ball.x = canvas.width - ballSize;
        ball.vy = 0;
        scoreH++;
        scoreSide = 1;
        score = true;
        console.log("Score! Host");
        scoreSequence(scoreSide)
      }
    }
    hostScore.textContent = scoreH;
    clientScore.textContent = scoreC;
    // Send ball position to client
    conn?.send({ type: 'ball', ball });
  }

  // Always send paddle position
  conn?.send({ type: 'paddle', y: myPaddleY });
}

function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000 || 0; // avoid NaN on first frame
  lastTime = timestamp;

  if (conn && conn.open) {
    gameStarted = true;
  }

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

//requestAnimationFrame(gameLoop);

let i = 0;
let on = 100;
let off = 200;
function scoreSequence(scoreSide) {
  if (scoreSide == 1) {
    if(i <= 5) {
      setTimeout(function() {
        scoreBar.x = 600;
      }, on)
      setTimeout(function() {
        scoreBar.x += 10;
        i++;
        scoreSequence(scoreSide);
      }, off)
    }
    else {
      reset();
    }}
  else {
    if(i <= 5) {
      setTimeout(function() {
        scoreBar.x = 10;
      }, on)
      setTimeout(function() {
        scoreBar.x -= 10;;
        i++;
        scoreSequence(scoreSide);
      }, off)
    }
    else {
      reset();
    }}
}

function reset() {
  scoreSide = 0;
  score = false;
  i = 0;
  ball.x = canvas.width / 2; ball.y = canvas.height / 2;
}


function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Paddles
  ctx.fillStyle = "white";
  ctx.fillRect(10, myPaddleY, paddleWidth, paddleHeight);
  ctx.fillRect(canvas.width - 20, opponentPaddleY, paddleWidth, paddleHeight);
  // Ball
  ctx.fillRect(ball.x, ball.y, ballSize, ballSize);

  ctx.fillStyle = "yellow";
  ctx.fillRect(scoreBar.x - 10, scoreBar.y, scoreBarWidth, canvas.height);

}

function handleKeydown(event) {
  switch (event.key) {
    case 'ArrowUp':
      upPressed = true;
      break;
    case 'ArrowDown':
      downPressed = true;
      break;
  }

}

function handleKeyup(event) {
  switch (event.key) {
    case 'ArrowUp':
      upPressed = false;
      break;
    case 'ArrowDown':
      downPressed = false;
      break;
  }
}

// Paddle movement
window.addEventListener('keydown', handleKeydown);
window.addEventListener('keyup', handleKeyup);

gameLoop();
