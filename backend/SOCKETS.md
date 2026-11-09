# Realtime messaging

Run the backend and frontend in separate terminals from the repository root:

```powershell
npm.cmd --prefix backend run dev
npm.cmd --prefix frontend run dev
```

Restart both after installing Socket.IO or changing the Vite proxy. The backend uses one HTTP server for Express and Socket.IO. Vite forwards /api and /socket.io (including WebSocket upgrades) to localhost:5001.

## Authentication and events

The client sends the current access token in the Socket.IO auth handshake. The server verifies the JWT and confirms the user still exists, then joins a server-assigned user:<id> room. Clients cannot choose rooms. Each tab/device connects separately.

Message writes still use the existing authenticated REST endpoints and database transactions. Only successful writes publish message:new, message:updated, or message:deleted to the conversation's participants. conversation:updated tells their sidebars to fetch the updated conversation. New conversation creation publishes that notification too.

The client merges messages by ID, applies edits/deletions, and removes listeners when the chat changes. Connections close on signout, reconnect when access tokens change, and refresh expired access tokens through the existing auth store. Reconnecting reloads recent history and the conversation list to catch missed events. Manual refresh remains available if the live connection fails.

## Deployment

The default setup uses a single backend process and the default in-memory room adapter. For multiple backend instances, configure a shared Socket.IO adapter. Your reverse proxy must forward /socket.io with polling and WebSocket support. Set CLIENT_ORIGIN to your deployed frontend origin for a separate frontend host; the frontend currently connects to its own origin, so route /socket.io to the backend there as well.

## Verification

```powershell
node --test backend/tests/socket.test.mjs
```

The test opens real local socket connections with mocked user/conversation lookups. It checks missing/expired tokens and that only participants receive message notifications. It does not verify a deployed proxy or a live MongoDB connection.
