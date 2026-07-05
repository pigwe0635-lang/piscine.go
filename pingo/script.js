// Simple Pong game: left paddle controlled by mouse and arrow keys, right paddle is AI.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

// Paddle settings
const P_WIDTH = 12;
const P_HEIGHT = 100;
const P_SPEED = 6;

// Ball settings
const BALL_RADIUS = 8;
const BALL_START_SPEED = 5;
const BALL_SPEED_INCREASE = 1.05;
const MAX_BOUNCE_ANGLE = Math.PI / 3; // ~60 degrees

// Game state
const leftPaddle = { x: 10, y: (H - P_HEIGHT) / 2, width: P_WIDTH, height: P_HEIGHT };
const rightPaddle = { x: W - 10 - P_WIDTH, y: (H - P_HEIGHT) / 2, width: P_WIDTH, height: P_HEIGHT };
let ball = { x: W / 2, y: H / 2, vx: BALL_START_SPEED, vy: 0, r: BALL_RADIUS };
let leftScore = 0;
let rightScore = 0;

let keys = { up: false, down: false };
let paused = false;
let lastTime = null;

// Start ball with random vertical angle, direction optional (1 = right, -1 = left)
function resetBall(direction = (Math.random() < 0.5 ? -1 : 1)) {
  ball.x = W / 2;
  ball.y = H / 2;
  const angle = (Math.random() * (Math.PI / 4)) - (Math.PI / 8); // small angle variation
  const speed = BALL_START_SPEED;
  ball.vx = direction * speed * Math.cos(angle);
  ball.vy = speed * Math.sin(angle);
}

// Draw helpers
function drawRoundRect(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function draw() {
  // Clear
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Center dashed line
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // Paddles
  drawRoundRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height, 4, '#fff');
  drawRoundRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height, 4, '#fff');

  // Ball
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  // Update scoreboard DOM
  document.getElementById('leftScore').textContent = leftScore;
  document.getElementById('rightScore').textContent = rightScore;

  // Pause overlay
  if (paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = '24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Paused — click to resume', W / 2, H / 2);
  }
}

// Clamp helper
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// Collision with paddle — compute new velocity using bounce angle based on collision point
function handlePaddleCollision(paddle, isLeft) {
  // Compute relative position of collision on paddle (-1 top, 0 center, +1 bottom)
  const relativeY = (ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
  const clamped = clamp(relativeY, -1, 1);
  const bounceAngle = clamped * MAX_BOUNCE_ANGLE;
  const speed = Math.hypot(ball.vx, ball.vy) * BALL_SPEED_INCREASE;

  const dir = isLeft ? 1 : -1; // ball should go right after left paddle, left after right paddle
  ball.vx = dir * Math.abs(Math.cos(bounceAngle)) * speed;
  ball.vy = Math.sin(bounceAngle) * speed;

  // Nudge ball out of paddle to avoid sticking
  if (isLeft) ball.x = paddle.x + paddle.width + ball.r + 0.1;
  else ball.x = paddle.x - ball.r - 0.1;
}

// Main update loop
function update(dt) {
  if (paused) return;

  // Player keyboard movement
  if (keys.up) leftPaddle.y -= P_SPEED;
  if (keys.down) leftPaddle.y += P_SPEED;

  // Bound paddles
  leftPaddle.y = clamp(leftPaddle.y, 0, H - leftPaddle.height);

  // Simple AI for right paddle: follow the ball with limited speed
  const targetY = ball.y - rightPaddle.height / 2;
  const diff = targetY - rightPaddle.y;
  const aiSpeed = 4.0; // tune difficulty
  if (Math.abs(diff) > aiSpeed) rightPaddle.y += Math.sign(diff) * aiSpeed;
  else rightPaddle.y = targetY;
  rightPaddle.y = clamp(rightPaddle.y, 0, H - rightPaddle.height);

  // Move ball
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Top/bottom wall collisions
  if (ball.y - ball.r <= 0) {
    ball.y = ball.r + 0.1;
    ball.vy = -ball.vy;
  } else if (ball.y + ball.r >= H) {
    ball.y = H - ball.r - 0.1;
    ball.vy = -ball.vy;
  }

  // Left paddle collision
  if (ball.x - ball.r <= leftPaddle.x + leftPaddle.width) {
    if (ball.y >= leftPaddle.y && ball.y <= leftPaddle.y + leftPaddle.height) {
      if (ball.vx < 0) handlePaddleCollision(leftPaddle, true);
    }
  }

  // Right paddle collision
  if (ball.x + ball.r >= rightPaddle.x) {
    if (ball.y >= rightPaddle.y && ball.y <= rightPaddle.y + rightPaddle.height) {
      if (ball.vx > 0) handlePaddleCollision(rightPaddle, false);
    }
  }

  // Score check
  if (ball.x < -ball.r) {
    // Ball passed left edge: right player scores
    rightScore += 1;
    resetBall(1);
  } else if (ball.x > W + ball.r) {
    // Ball passed right edge: left player scores
    leftScore += 1;
    resetBall(-1);
  }
}

// Game loop using requestAnimationFrame
function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

// Controls: mouse and keyboard
canvas.addEventListener('mousemove', (ev) => {
  const rect = canvas.getBoundingClientRect();
  const y = ev.clientY - rect.top;
  leftPaddle.y = clamp(y - leftPaddle.height / 2, 0, H - leftPaddle.height);
});

window.addEventListener('keydown', (ev) => {
  if (ev.key === 'ArrowUp' || ev.key === 'Up') {
    keys.up = true;
    ev.preventDefault();
  } else if (ev.key === 'ArrowDown' || ev.key === 'Down') {
    keys.down = true;
    ev.preventDefault();
  } else if (ev.key === ' ' || ev.key === 'Spacebar') {
    // space toggles pause
    paused = !paused;
  }
});

window.addEventListener('keyup', (ev) => {
  if (ev.key === 'ArrowUp' || ev.key === 'Up') keys.up = false;
  else if (ev.key === 'ArrowDown' || ev.key === 'Down') keys.down = false;
});

// Click canvas to pause/resume
canvas.addEventListener('click', () => {
  paused = !paused;
});

// Resize handling (keep canvas fixed but center is handled by CSS)
window.addEventListener('blur', () => { keys.up = keys.down = false; });

// Initialize
resetBall();
requestAnimationFrame(loop);
