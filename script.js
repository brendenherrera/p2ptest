const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const myIdEl = document.getElementById('my-id');
const joinInput = document.getElementById('peer-id-input');

let peer, conn;
let isHost = false;
let gameStarted = false;

// Paddle and ball setup
const paddleWidth = 10, paddleHeight = 80;
const ballSize = 10;
let myPaddleY = canvas.height / 2 - paddleHeight / 2;
let opponentPaddleY = myPaddleY;
let ball = { x: canvas.width / 2, y: canvas.height / 2, vx: 4, vy: 4 };


// ✅ 1️⃣ Create the Peer *once* when the script loads
peer = new Peer();  // (You can also configure TURN/STUN servers here if needed)

peer.on('open', id => {
  myIdEl.textContent = id;
});

peer.on('connection', connection => {
  conn = connection;
  isHost = true;
  setupConnection();
  statusEl.textContent = "Connected (Host)";
});


// ✅ 2️⃣ Set up how we handle connection data
function setupConnection() {
  conn.on('data', data => {
    if (data.type === 'paddle') opponentPaddleY = data.y;
    if (data.type === 'ball' && !isHost) ball = data.ball;
  });
}


// ✅ 3️⃣ Button handlers — notice no `setupPeer()` calls anymore
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


// ✅ 4️⃣ Game update + draw loop
function update() {
  if (isHost && gameStarted) {
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall bounce
    if (ball.y < 0 || ball.y > canvas.height - ballSize) ball.vy *= -1;

    // Paddle bounce
    if (ball.x < paddleWidth && ball.y > myPaddleY && ball.y < myPaddleY + paddleHeight)
      ball.vx *= -1;
    if (ball.x > canvas.width - paddleWidth - ballSize &&
        ball.y > opponentPaddleY && ball.y < opponentPaddleY + paddleHeight)
      ball.vx *= -1;

    // Send ball position to client
    conn?.send({ type: 'ball', ball });
  }

  // Send paddle position
  conn?.send({ type: 'paddle', y: myPaddleY });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Paddles
  ctx.fillStyle = "white";
  ctx.fillRect(10, myPaddleY, paddleWidth, paddleHeight);
  ctx.fillRect(canvas.width - 20, opponentPaddleY, paddleWidth, paddleHeight);

  // Ball
  ctx.fillRect(ball.x, ball.y, ballSize, ballSize);
}

function gameLoop() {
  if (conn && conn.open) {
    gameStarted = true;
    update();
  }
  draw();
  requestAnimationFrame(gameLoop);
}

// Paddle movement
document.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  myPaddleY = e.clientY - rect.top - paddleHeight / 2;
});

gameLoop();
