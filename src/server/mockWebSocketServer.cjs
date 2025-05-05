const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

console.log('Enhanced Football Match WebSocket server running on ws://localhost:8080');

// Match state
const matchState = {
  time: 0, // Match time in seconds
  score: { home: 0, away: 0 },
  possession: 'home', // 'home' or 'away'
  lastEvent: null,
  isPlaying: true
};

// Team formations (4-4-2)
const homeFormation = [
  { id: 1, position: 'gk', baseX: 5, baseY: 34 }, // Goalkeeper
  { id: 2, position: 'rb', baseX: 15, baseY: 10 }, // Right back
  { id: 3, position: 'cb', baseX: 15, baseY: 25 }, // Center back
  { id: 4, position: 'cb', baseX: 15, baseY: 43 }, // Center back
  { id: 5, position: 'lb', baseX: 15, baseY: 58 }, // Left back
  { id: 6, position: 'rm', baseX: 35, baseY: 15 }, // Right mid
  { id: 7, position: 'cm', baseX: 35, baseY: 34 }, // Center mid
  { id: 8, position: 'cm', baseX: 35, baseY: 45 }, // Center mid
  { id: 9, position: 'lm', baseX: 35, baseY: 53 }, // Left mid
  { id: 10, position: 'st', baseX: 55, baseY: 30 }, // Striker
  { id: 11, position: 'st', baseX: 55, baseY: 38 }  // Striker
];

const awayFormation = [
  { id: 12, position: 'gk', baseX: 100, baseY: 34 }, // Goalkeeper
  { id: 13, position: 'rb', baseX: 90, baseY: 10 },  // Right back
  { id: 14, position: 'cb', baseX: 90, baseY: 25 },  // Center back
  { id: 15, position: 'cb', baseX: 90, baseY: 43 },  // Center back
  { id: 16, position: 'lb', baseX: 90, baseY: 58 },  // Left back
  { id: 17, position: 'rm', baseX: 70, baseY: 15 },  // Right mid
  { id: 18, position: 'cm', baseX: 70, baseY: 34 },  // Center mid
  { id: 19, position: 'cm', baseX: 70, baseY: 45 },  // Center mid
  { id: 20, position: 'lm', baseX: 70, baseY: 53 },  // Left mid
  { id: 21, position: 'st', baseX: 50, baseY: 30 },  // Striker
  { id: 22, position: 'st', baseX: 50, baseY: 38 }   // Striker
];

// Generate realistic player positions based on formation and ball position
function generatePlayerPositions(ball) {
  const players = [];
  
  // Home team positions
  homeFormation.forEach(player => {
    // Calculate offset from base position based on ball position
    const ballDirectionX = ball.x - player.baseX;
    const ballDirectionY = ball.y - player.baseY;
    const distanceToBall = Math.sqrt(ballDirectionX**2 + ballDirectionY**2);
    
    // Players move toward the ball but maintain some formation structure
    const moveFactor = player.position === 'gk' ? 0.1 : 
                     player.position === 'st' ? 0.7 : 0.4;
    
    const x = player.baseX + (ballDirectionX * moveFactor * (0.5 + Math.random() * 0.5)) / 10;
    const y = player.baseY + (ballDirectionY * moveFactor * (0.5 + Math.random() * 0.5)) / 10;
    
    // Keep players within bounds
    players.push({
      id: player.id,
      x: Math.max(0, Math.min(105, x)),
      y: Math.max(0, Math.min(68, y)),
      team: 'home'
    });
  });
  
  // Away team positions
  awayFormation.forEach(player => {
    const ballDirectionX = ball.x - player.baseX;
    const ballDirectionY = ball.y - player.baseY;
    const distanceToBall = Math.sqrt(ballDirectionX**2 + ballDirectionY**2);
    
    const moveFactor = player.position === 'gk' ? 0.1 : 
                     player.position === 'st' ? 0.7 : 0.4;
    
    const x = player.baseX + (ballDirectionX * moveFactor * (0.5 + Math.random() * 0.5)) / 10;
    const y = player.baseY + (ballDirectionY * moveFactor * (0.5 + Math.random() * 0.5)) / 10;
    
    players.push({
      id: player.id,
      x: Math.max(0, Math.min(105, x)),
      y: Math.max(0, Math.min(68, y)),
      team: 'away'
    });
  });
  
  return players;
}

// Simulate ball movement based on current possession
function simulateBallMovement(ball) {
  // Determine target area based on possession
  const targetX = matchState.possession === 'home' ? 
    (85 + Math.random() * 15) : // Home team attacks toward away goal
    (5 + Math.random() * 15);   // Away team attacks toward home goal
  
  const targetY = 24 + Math.random() * 20; // Target area around goal
  
  // Move ball toward target
  const directionX = targetX - ball.x;
  const directionY = targetY - ball.y;
  const distance = Math.sqrt(directionX**2 + directionY**2);
  
  // Normalize and scale movement
  const moveSpeed = 0.5 + Math.random() * 0.5;
  ball.x += (directionX / distance) * moveSpeed;
  ball.y += (directionY / distance) * moveSpeed;
  
  // Keep ball within bounds
  ball.x = Math.max(0, Math.min(105, ball.x));
  ball.y = Math.max(0, Math.min(68, ball.y));
  
  // Check for goals
  if (ball.x <= 0 && ball.y >= 24 && ball.y <= 44) {
    generateEvent('goal', { team: 'away', playerId: 21 + Math.floor(Math.random() * 2) });
    ball.x = 52.5;
    ball.y = 34;
    matchState.possession = 'home';
  } else if (ball.x >= 105 && ball.y >= 24 && ball.y <= 44) {
    generateEvent('goal', { team: 'home', playerId: 10 + Math.floor(Math.random() * 2) });
    ball.x = 52.5;
    ball.y = 34;
    matchState.possession = 'away';
  }
  
  // Occasionally change possession
  if (Math.random() < 0.02) {
    matchState.possession = matchState.possession === 'home' ? 'away' : 'home';
    generateEvent('possession_change', { newTeam: matchState.possession });
  }
  
  return ball;
}

// Generate different types of match events
function generateEvent(type, data = {}) {
  const event = {
    type,
    timestamp: matchState.time,
    ...data
  };
  
  switch (type) {
    case 'goal':
      event.message = `Goal! ${data.team === 'home' ? 'Home' : 'Away'} team scores!`;
      matchState.score[data.team]++;
      break;
    case 'foul':
      event.message = 'Foul committed';
      event.x = 20 + Math.random() * 65;
      event.y = 10 + Math.random() * 48;
      break;
    case 'substitution':
      event.message = `Substitution: Player ${data.playerOut} out, Player ${data.playerIn} in`;
      break;
    case 'possession_change':
      event.message = `Possession changed to ${data.newTeam === 'home' ? 'Home' : 'Away'} team`;
      break;
    case 'corner':
      event.message = 'Corner kick';
      event.x = data.team === 'home' ? 105 : 0;
      event.y = data.y || (10 + Math.random() * 48);
      break;
    case 'shot':
      event.message = 'Shot on goal!';
      event.x = 20 + Math.random() * 65;
      event.y = 24 + Math.random() * 20;
      break;
  }
  
  matchState.lastEvent = event;
  return event;
}

// Main simulation loop
function simulateMatch(ws) {
  if (ws.readyState !== WebSocket.OPEN) return;
  
  // Update match time
  if (matchState.isPlaying) {
    matchState.time = Math.min(5400, matchState.time + 1); // 90 minutes max
  }
  
  // Simulate ball movement
  const ball = simulateBallMovement(matchState.ball || { x: 52.5, y: 34 });
  matchState.ball = ball;
  
  // Generate player positions based on ball position
  const players = generatePlayerPositions(ball);
  
  // Occasionally generate events
  let event = null;
  if (Math.random() < 0.05) {
    const eventTypes = ['foul', 'shot', 'corner'];
    if (matchState.time % 300 === 0) { // Every 5 minutes
      eventTypes.push('substitution');
    }
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    event = generateEvent(eventType, { 
      team: matchState.possession,
      playerId: matchState.possession === 'home' ? 
        10 + Math.floor(Math.random() * 2) : 
        21 + Math.floor(Math.random() * 2)
    });
  }
  
  // Prepare data to send
  const data = {
    type: 'match_update',
    time: matchState.time,
    score: matchState.score,
    possession: matchState.possession,
    players,
    ball,
    event: event || matchState.lastEvent
  };
  
  ws.send(JSON.stringify(data));
}

// Handle client connections
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Initialize match state for this client
  matchState.ball = { x: 52.5, y: 34 };
  matchState.time = 0;
  matchState.score = { home: 0, away: 0 };
  matchState.possession = Math.random() > 0.5 ? 'home' : 'away';
  matchState.isPlaying = true;
  
  // Start simulation loop
  const interval = setInterval(() => simulateMatch(ws), 100);
  
  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'control') {
        if (data.action === 'pause') {
          matchState.isPlaying = false;
        } else if (data.action === 'play') {
          matchState.isPlaying = true;
        } else if (data.action === 'reset') {
          matchState.time = 0;
          matchState.score = { home: 0, away: 0 };
          matchState.ball = { x: 52.5, y: 34 };
        }
      }
    } catch (e) {
      console.error('Error processing client message:', e);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
});