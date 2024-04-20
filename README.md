

server code 完整個修改可能會像是這樣：

```javascript
const { WebSocketServer } = require('ws');
const https = require('https');
const fs = require('fs');
const uuidv4 = require('uuid').v4;
const url = require('url');

const options = {
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('fullchain.pem')
};
const server = https.createServer(options);
const wsServer = new WebSocketServer({ server });

const port = 8000;
const connections = {};
const users = {};

const handleMessage = (message, uuid) => {
  const jsonMessage = JSON.parse(message);
  console.log(`Received message: ${jsonMessage}`);
  const user = users[uuid];
  user.role = jsonMessage.role;

  if (jsonMessage.type === 'vote') {
    user.vote = jsonMessage.vote;
    console.log(`Client ${uuid} voted: ${user.vote}`);
    broadcastVotes();
  }
};

const handleClose = (uuid) => {
  console.log(`Disconnected`);
  delete connections[uuid];
  delete users[uuid];
  broadcastVotes();
};

const broadcastVotes = () => {
  const clientAConnection = Object.values(connections).find(
    (connection) => users[connection.uuid].role === 'clientA'
  );

  if (clientAConnection) {
    const votes = Object.entries(users)
      .filter(([uuid, user]) => user.role !== 'clientA')
      .map(([uuid, user]) => ({
        clientId: uuid,
        vote: user.vote,
      }));

    const message = JSON.stringify({ type: 'votes', votes });
    clientAConnection.send(message);
  }
};

wsServer.on('connection', (connection, request) => {
  console.log(connection);
  const uuid = uuidv4();
  connections[uuid] = connection;
  connection.uuid = uuid; // Assign the uuid to the connection object
  users[uuid] = {
    role: {},
    vote: null,
  };
  connection.on('message', (message) => handleMessage(message, uuid));
  connection.on('close', () => handleClose(uuid));
});

server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`);
});
```

In this updated server code:

- The `users` object is modified to store the `vote` property instead of `text`.
- The `handleMessage` function is updated to handle vote messages. When a vote message is received, it updates the `vote` property of the corresponding user and calls the `broadcastVotes` function.
- The `broadcastVotes` function is added to send the collected votes to Client A. It finds the connection of Client A based on the `role` property and sends a message containing the votes of clients 1-30.
- The connection event listener is modified to assign the `uuid` to the `connection` object for easier access.

With these changes, the server will handle vote messages from clients 1-30, store their votes, and send the collected votes to Client A whenever a vote is received or a client disconnects.

Make sure to update the client-side code accordingly to send vote messages with the appropriate `type` field and handle the received `'votes'` messages on Client A to update the local state or cookie data.

Remember to handle any additional error scenarios and implement proper authentication and security measures in a production environment.
