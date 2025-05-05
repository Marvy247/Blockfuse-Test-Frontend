const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

console.log('Enhanced Football Match WebSocket server running on ws://localhost:8080');

// Match state
const matchState = {
  time: 0, // Match time in seconds
  score: { home: 0, away: 0 },
  possession: 'home', // 'home' or 'away'
  lastEvent: null,
  isPlaying: true,
  ball: { x: 52.5, y: 34 },
  attackPhase: 0, // 0-100, builds up before shots
  shotInProgress: false
};

// Team formations (4-4-2) - same as before
const homeFormation = [
  { id: 1, position: 'gk', baseX: 5, baseY: 34 },
  // ... rest of home formation
];

const awayFormation = [
  { id: 12, position: 'gk', baseX: 100, baseY: 34 },
  // ... rest of away formation
];

// Enhanced ball simulation with better goal scoring
function simulateBallMovement(ball) {
  // If a shot is in progress, handle it specially
  if (matchState.shotInProgress) {
    return handleShotInProgress(ball);
  }

  // Normal ball movement based on possession
  const targetX = matchState.possession === 'home' ? 
    (85 + Math.random() * 15) : 
    (5 + Math.random() * 15);
  
  const targetY = 24 + Math.random() * 20;

  // Move ball toward target
  const directionX = targetX - ball.x;
  const directionY = targetY - ball.y;
  const distance = Math.sqrt(directionX**2 + directionY**2);
  
  // Movement speed depends on attack phase
  const moveSpeed = 0.3 + (matchState.attackPhase / 100) * 0.7;
  ball.x += (directionX / distance) * moveSpeed;
  ball.y += (directionY / distance) * moveSpeed;

  // Keep ball within bounds
  ball.x = Math.max(0, Math.min(105, ball.x));
  ball.y = Math.max(0, Math.min(68, ball.y));

  // Build up attack phase when near opponent's goal
  if ((matchState.possession === 'home' && ball.x > 80) || 
      (matchState.possession === 'away' && ball.x < 25)) {
    matchState.attackPhase = Math.min(100, matchState.attackPhase + 2);
    
    // Chance to take a shot when attack phase is high
    if (matchState.attackPhase > 70 && Math.random() < 0.1) {
      return initiateShot(ball);
    }
  } else {
    matchState.attackPhase = Math.max(0, matchState.attackPhase - 1);
  }

  // Check for goals
  checkForGoals(ball);

  // Occasionally change possession
  if (Math.random() < 0.02) {
    matchState.possession = matchState.possession === 'home' ? 'away' : 'home';
    generateEvent('possession_change', { newTeam: matchState.possession });
    matchState.attackPhase = 0;
  }

  return ball;
}

function initiateShot(ball) {
  matchState.shotInProgress = true;
  matchState.shotTarget = {
    x: matchState.possession === 'home' ? 
      105 : 0, // Which goal to shoot at
    y: 34 + (Math.random() * 10 - 5) // Random y position in goal
  };
  matchState.shotSpeed = 2 + Math.random() * 3;
  generateEvent('shot', { 
    team: matchState.possession,
    playerId: getAttackingPlayerId() 
  });
  return ball;
}

function handleShotInProgress(ball) {
  // Move ball quickly toward goal
  const dx = matchState.shotTarget.x - ball.x;
  const dy = matchState.shotTarget.y - ball.y;
  const distance = Math.sqrt(dx*dx + dy*dy);
  
  // Move ball toward target
  ball.x += (dx / distance) * matchState.shotSpeed;
  ball.y += (dy / distance) * matchState.shotSpeed;

  // Check if shot reached target or missed
  if (distance < 2 || ball.x <= 0 || ball.x >= 105) {
    matchState.shotInProgress = false;
    checkForGoals(ball);
    
    // If not a goal, possession changes
    if (!(ball.x <= 0 && ball.y >= 24 && ball.y <= 44) && 
        !(ball.x >= 105 && ball.y >= 24 && ball.y <= 44)) {
      matchState.possession = matchState.possession === 'home' ? 'away' : 'home';
      generateEvent('possession_change', { newTeam: matchState.possession });
    }
  }

  return ball;
}

function checkForGoals(ball) {
  // Home team scores (ball in away goal)
  if (ball.x >= 105 && ball.y >= 24 && ball.y <= 44) {
    const scoringPlayer = getAttackingPlayerId();
    generateEvent('goal', { 
      team: 'home', 
      playerId: scoringPlayer,
      x: ball.x,
      y: ball.y
    });
    matchState.score.home++;
    resetAfterGoal();
    matchState.possession = 'away';
  } 
  // Away team scores (ball in home goal)
  else if (ball.x <= 0 && ball.y >= 24 && ball.y <= 44) {
    const scoringPlayer = getAttackingPlayerId();
    generateEvent('goal', { 
      team: 'away', 
      playerId: scoringPlayer,
      x: ball.x,
      y: ball.y
    });
    matchState.score.away++;
    resetAfterGoal();
    matchState.possession = 'home';
  }
}

function resetAfterGoal() {
  matchState.ball = { x: 52.5, y: 34 };
  matchState.attackPhase = 0;
  matchState.shotInProgress = false;
}

function getAttackingPlayerId() {
  // Return a random attacking player based on current possession
  if (matchState.possession === 'home') {
    return 10 + Math.floor(Math.random() * 2); // Home strikers (10 or 11)
  } else {
    return 21 + Math.floor(Math.random() * 2); // Away strikers (21 or 22)
  }
}

// Enhanced event generation
function generateEvent(type, data = {}) {
  const event = {
    type,
    timestamp: matchState.time,
    ...data
  };
  
  switch (type) {
    case 'goal':
      event.message = `GOAL! ${data.team === 'home' ? 'Home' : 'Away'} team scores! Player ${data.playerId}`;
      event.x = data.x;
      event.y = data.y;
      break;
    case 'shot':
      event.message = `Shot by Player ${data.playerId}!`;
      break;
    // ... rest of event types
  }
  
  matchState.lastEvent = event;
  return event;
}

// Main simulation loop (same as before)
function simulateMatch(ws) {
  if (ws.readyState !== WebSocket.OPEN) return;
  
  if (matchState.isPlaying) {
    matchState.time = Math.min(5400, matchState.time + 1);
  }
  
  const ball = simulateBallMovement(matchState.ball);
  matchState.ball = ball;
  
  const players = generatePlayerPositions(ball);
  
  // Prepare data to send
  const data = {
    type: 'match_update',
    time: matchState.time,
    score: matchState.score,
    possession: matchState.possession,
    players,
    ball,
    event: matchState.lastEvent
  };
  
  ws.send(JSON.stringify(data));
  matchState.lastEvent = null; // Clear event after sending
}

// Client connection handling (same as before)
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Reset match state
  matchState.ball = { x: 52.5, y: 34 };
  matchState.time = 0;
  matchState.score = { home: 0, away: 0 };
  matchState.possession = Math.random() > 0.5 ? 'home' : 'away';
  matchState.isPlaying = true;
  matchState.attackPhase = 0;
  matchState.shotInProgress = false;
  
  const interval = setInterval(() => simulateMatch(ws), 100);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'control') {
        // ... handle controls
      }
    } catch (e) {
      console.error('Error processing client message:', e);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
});