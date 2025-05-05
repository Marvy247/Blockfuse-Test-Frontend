# Real-Time Football Match Visualization Dashboard

This project is a React-based real-time football match visualization dashboard featuring live player movement, ball tracking, event overlays, and timeline navigation. It uses a mock WebSocket server to simulate live football match data for development and testing.

## Features

- Live football pitch animation with player and ball tracking
- Real-time event overlays (goals, fouls, substitutions)
- Timeline navigation to replay key moments
- Mobile responsive design with touch controls
- Smooth transitions and animations

## Prerequisites

- Node.js (v14 or higher recommended)
- npm (Node package manager)

## Getting Started

1. Clone the repository or download the project files.

2. Install dependencies:

```bash
npm install
```

3. Start the mock WebSocket server to simulate live football data:

```bash
node src/server/mockWebSocketServer.cjs
```

This will start the server on `ws://localhost:8080`.

4. In a separate terminal, start the React development server:

```bash
npm run dev
```

5. Open your browser and navigate to the URL shown by the React dev server (usually `http://localhost:5173`).

6. You should see the Real-Time Football Match Dashboard with live player movements, ball tracking, and event overlays powered by the mock WebSocket server.

## Project Structure

- `src/components/FootballDashboard.jsx`: Main dashboard React component
- `src/server/mockWebSocketServer.cjs`: Mock WebSocket server simulating live football data
- `src/App.jsx`: Entry React component rendering the dashboard
- Other standard React and Vite project files

## Notes

- The WebSocket URL in `FootballDashboard.jsx` is set to connect to the local mock server (`ws://localhost:8080`).
- You can replace the mock server with a real live data WebSocket endpoint by updating the URL.
- The timeline replay feature currently shows alerts as placeholders and can be extended.

## License

This project is provided as-is for demonstration purposes.
