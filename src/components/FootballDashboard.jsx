import React, { useEffect, useState, useRef } from 'react';

const WS_URL = 'ws://localhost:8080';

function FootballDashboard() {
  const [players, setPlayers] = useState([]);
  const [ball, setBall] = useState({ x: 50, y: 50 });
  const [events, setEvents] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [matchTime, setMatchTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const ws = useRef(null);
  const pitchRef = useRef(null);
  const matchInterval = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Start match timer
  useEffect(() => {
    if (connectionStatus === 'Connected') {
      matchInterval.current = setInterval(() => {
        setMatchTime(prev => (prev < 90 ? prev + 0.1 : prev));
      }, 100);
    }
    return () => clearInterval(matchInterval.current);
  }, [connectionStatus]);

  // WebSocket connection management
  const connectWebSocket = () => {
    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('Connected');
      reconnectAttempts.current = 0;
    };

    ws.current.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        
        if (!data) return;
        
        if (data.type === 'player_positions') {
          // Validate player positions data
          if (Array.isArray(data.players)) {
            setPlayers(data.players);
          }
          if (data.ball && typeof data.ball.x === 'number' && typeof data.ball.y === 'number') {
            setBall(data.ball);
          }
        } 
        else if (data.type === 'event') {
          // Validate event data
          if (!data.event) return;
          
          const event = {
            ...data.event,
            id: Date.now() + Math.random(),
            timestamp: matchTime
          };
          
          setEvents(prev => [...prev.slice(-3), event]);
          setTimeline(prev => [...prev, event]);
          
          // Only process goal events if we have valid player data
          if (event.type === 'goal' && Array.isArray(players)) {
            setScore(prev => {
              const scoringPlayer = players.find(p => p.id === event.playerId);
              const isHomeGoal = scoringPlayer?.team === 'home';
              
              return {
                home: isHomeGoal ? prev.home + 1 : prev.home,
                away: isHomeGoal ? prev.away : prev.away + 1
              };
            });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.current.onclose = (e) => {
      console.log('WebSocket closed:', e.code, e.reason);
      setConnectionStatus('Disconnected');
      clearInterval(matchInterval.current);
      
      // Attempt to reconnect if the closure was unexpected
      if (e.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        const delay = Math.min(1000 * reconnectAttempts.current, 5000);
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`);
        setTimeout(connectWebSocket, delay);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('Error');
    };
  };

  // Setup WebSocket connection
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close(1000, 'Component unmounted');
      }
      clearInterval(matchInterval.current);
    };
  }, []);

  // Define pitch markings
  const pitchMarkings = [
    // Outer lines
    { type: 'rect', x: 0, y: 0, width: 105, height: 68, stroke: 'white', strokeWidth: 0.5, fill: 'none' },
    // Center line
    { type: 'line', x1: 52.5, y1: 0, x2: 52.5, y2: 68, stroke: 'white', strokeWidth: 0.5 },
    // Center circle
    { type: 'circle', cx: 52.5, cy: 34, r: 9.15, stroke: 'white', strokeWidth: 0.5, fill: 'none' },
    // Center spot
    { type: 'circle', cx: 52.5, cy: 34, r: 0.3, fill: 'white' },
    // Penalty areas
    { type: 'rect', x: 0, y: 13.84, width: 16.5, height: 40.32, stroke: 'white', strokeWidth: 0.5, fill: 'none' },
    { type: 'rect', x: 88.5, y: 13.84, width: 16.5, height: 40.32, stroke: 'white', strokeWidth: 0.5, fill: 'none' },
    // Goal areas
    { type: 'rect', x: 0, y: 24.84, width: 5.5, height: 18.32, stroke: 'white', strokeWidth: 0.5, fill: 'none' },
    { type: 'rect', x: 99.5, y: 24.84, width: 5.5, height: 18.32, stroke: 'white', strokeWidth: 0.5, fill: 'none' },
    // Penalty spots
    { type: 'circle', cx: 11, cy: 34, r: 0.3, fill: 'white' },
    { type: 'circle', cx: 94, cy: 34, r: 0.3, fill: 'white' },
    // Arc at penalty spots
    { type: 'path', d: 'M11,42.5 A8.5,8.5 0 0 1 11,25.5', stroke: 'white', strokeWidth: 0.5, fill: 'none' },
    { type: 'path', d: 'M94,42.5 A8.5,8.5 0 0 0 94,25.5', stroke: 'white', strokeWidth: 0.5, fill: 'none' },
    // Corner arcs
    { type: 'path', d: 'M0,0.5 A0.5,0.5 0 0 1 0.5,0', stroke: 'white', strokeWidth: 0.5, fill: 'none' },
    { type: 'path', d: 'M105,0.5 A0.5,0.5 0 0 0 104.5,0', stroke: 'white', strokeWidth: 0.5, fill: 'none' },
    { type: 'path', d: 'M0,67.5 A0.5,0.5 0 0 0 0.5,68', stroke: 'white', strokeWidth: 0.5, fill: 'none' },
    { type: 'path', d: 'M105,67.5 A0.5,0.5 0 0 1 104.5,68', stroke: 'white', strokeWidth: 0.5, fill: 'none' }
  ];

  // Goalposts
  const goalPosts = [
    { x1: 0, y1: 24, x2: 0, y2: 44, stroke: 'white', strokeWidth: 1.5 },
    { x1: 7, y1: 24, x2: 7, y2: 44, stroke: 'white', strokeWidth: 1.5 },
    { x1: 0, y1: 24, x2: 7, y2: 24, stroke: 'white', strokeWidth: 1.5 },
    { x1: 0, y1: 44, x2: 7, y2: 44, stroke: 'white', strokeWidth: 1.5 },
    { x1: 105, y1: 24, x2: 105, y2: 44, stroke: 'white', strokeWidth: 1.5 },
    { x1: 98, y1: 24, x2: 98, y2: 44, stroke: 'white', strokeWidth: 1.5 },
    { x1: 105, y1: 24, x2: 98, y2: 24, stroke: 'white', strokeWidth: 1.5 },
    { x1: 105, y1: 44, x2: 98, y2: 44, stroke: 'white', strokeWidth: 1.5 }
  ];

  // Position goalies
  const goaliePositions = [
    { id: 1, x: 5, y: 34, team: 'home' },
    { id: 12, x: 100, y: 34, team: 'away' }
  ];

  // Merge players with goalies in fixed positions
  const otherPlayers = players.filter(p => p.id !== 1 && p.id !== 12);
  const allPlayers = [...goaliePositions, ...otherPlayers];

  // Handle timeline navigation
  const replayEvent = (event) => {
    setIsPlaying(false);
    // Highlight the event on the pitch
    setEvents([{ ...event, highlight: true }]);
    
    // Return to play after 3 seconds
    setTimeout(() => {
      setIsPlaying(true);
      setEvents([]);
    }, 3000);
  };

  // Format match time
  const formatMatchTime = (time) => {
    const minutes = Math.floor(time);
    const seconds = Math.floor((time % 1) * 10);
    return `${minutes}'${seconds}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-red-900 p-4 text-white">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold">Football Live Dashboard</div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full ${connectionStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'} text-white text-sm font-semibold`}>
                {connectionStatus}
              </div>
              <div className="text-xl font-mono bg-black bg-opacity-50 px-3 py-1 rounded">
                {formatMatchTime(matchTime)}
              </div>
            </div>
          </div>
          
          {/* Scoreboard */}
          <div className="flex justify-center items-center mt-4">
            <div className="text-center px-6">
              <div className="text-2xl font-bold">Home</div>
              <div className="text-4xl font-bold mt-2">{score.home}</div>
            </div>
            <div className="text-5xl font-bold mx-4">-</div>
            <div className="text-center px-6">
              <div className="text-2xl font-bold">Away</div>
              <div className="text-4xl font-bold mt-2">{score.away}</div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pitch visualization */}
          <div className="lg:col-span-2">
            <div className="relative w-full aspect-[105/68] bg-green-800 rounded-lg shadow-lg overflow-hidden">
              <svg 
                ref={pitchRef}
                viewBox="0 0 105 68" 
                className="w-full h-full"
                style={{ background: 'linear-gradient(to bottom, #1a5e1a, #228B22)' }}
              >
                {/* Pitch markings */}
                {pitchMarkings.map((marking, idx) => {
                  if (marking.type === 'rect') {
                    return <rect key={idx} {...marking} />;
                  } else if (marking.type === 'line') {
                    return <line key={idx} {...marking} />;
                  } else if (marking.type === 'circle') {
                    return <circle key={idx} {...marking} />;
                  } else if (marking.type === 'path') {
                    return <path key={idx} {...marking} />;
                  }
                  return null;
                })}

                {/* Goalposts */}
                {goalPosts.map((line, idx) => (
                  <line
                    key={`goalpost-${idx}`}
                    {...line}
                  />
                ))}

                {/* Players */}
                {allPlayers.map((player) => (
                  <g 
                    key={player.id}
                    style={{ 
                      transition: isPlaying ? 'transform 0.5s ease-out' : 'none',
                      transform: `translate(${player.x - 1.5}px, ${player.y - 1.5}px)`
                    }}
                  >
                    <circle
                      cx={1.5}
                      cy={1.5}
                      r={player.id === 1 || player.id === 12 ? 1.8 : 1.5}
                      fill={player.team === 'home' ? '#3b82f6' : '#ef4444'}
                      stroke="white"
                      strokeWidth="0.2"
                    />
                    <text
                      x={1.5}
                      y={1.5}
                      fill="white"
                      fontSize="1"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {player.id}
                    </text>
                  </g>
                ))}

                {/* Ball */}
                <circle
                  cx={ball.x}
                  cy={ball.y}
                  r="1"
                  fill="white"
                  stroke="#333"
                  strokeWidth="0.2"
                  style={{ 
                    transition: isPlaying ? 'transform 0.2s ease-out' : 'none',
                    transform: `translate(${ball.x}px, ${ball.y}px)`
                  }}
                >
                  <animate
                    attributeName="r"
                    values="1;1.2;1"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* Event overlays */}
                {events.map((event) => (
                  <g key={event.id}>
                    <circle
                      cx={event.x}
                      cy={event.y}
                      r={event.highlight ? 3 : 2}
                      fill="none"
                      stroke="yellow"
                      strokeWidth="0.3"
                      style={{ animation: 'pulse 1.5s infinite' }}
                    />
                    <text
                      x={event.x}
                      y={event.y - 3}
                      fill="yellow"
                      fontSize="2"
                      fontWeight="bold"
                      textAnchor="middle"
                      style={{ 
                        textShadow: '0 0 3px rgba(0,0,0,0.8)',
                        animation: event.highlight ? 'none' : 'fadeOut 3s forwards'
                      }}
                    >
                      {event.type === 'goal' ? '⚽ Goal!' : 
                       event.type === 'foul' ? '🛑 Foul' : 
                       '🔄 Sub'}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Events timeline */}
          <div className="bg-gray-50 rounded-lg p-4 shadow-inner">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Match Events</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {timeline.length > 0 ? (
                timeline.map((event) => (
                  <div 
                    key={event.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${event.highlight ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-white hover:bg-gray-100'}`}
                    onClick={() => replayEvent(event)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="mr-2">
                          {event.type === 'goal' ? (
                            <span className="text-2xl">⚽</span>
                          ) : event.type === 'foul' ? (
                            <span className="text-2xl">🛑</span>
                          ) : (
                            <span className="text-2xl">🔄</span>
                          )}
                        </span>
                        <span className="font-semibold capitalize">{event.type}</span>
                      </div>
                      <span className="text-sm text-gray-600">{formatMatchTime(event.timestamp)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No events yet. The match is just starting...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Match controls */}
        <div className="bg-gray-100 p-4 border-t">
          <div className="flex justify-center space-x-4">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button 
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              onClick={() => setMatchTime(0)}
            >
              ↻ Reset
            </button>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes fadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes pulse {
          0% { opacity: 0.8; }
          50% { opacity: 0.4; }
          100% { opacity: 0.8; }
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>
    </div>
  );
}

export default FootballDashboard;