

server code 完整個修改可能會像是這樣： stores the voting results in a cookie and calculates the total amounts:

```javascript
const { WebSocketServer } = require('ws');
const https = require('https');
const fs = require('fs');
const uuidv4 = require('uuid').v4;
const url = require('url');
const cookie = require('cookie');

const options = {
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('fullchain.pem')
};
const server = https.createServer(options);
const wsServer = new WebSocketServer({ server });

const port = 8000;
const connections = {};
const users = {};
const votes = {};

const handleMessage = (message, uuid) => {
  const jsonMessage = JSON.parse(message);
  console.log(`Received message: ${jsonMessage}`);
  const user = users[uuid];
  user.role = jsonMessage.role;

  if (jsonMessage.type === 'vote') {
    user.vote = jsonMessage.vote;
    console.log(`Client ${uuid} voted: ${user.vote}`);
    votes[uuid] = user.vote;
    broadcastVotes();
  }
};

const handleClose = (uuid) => {
  console.log(`Disconnected`);
  delete connections[uuid];
  delete users[uuid];
  delete votes[uuid];
  broadcastVotes();
};

const broadcastVotes = () => {
  const clientAConnection = Object.values(connections).find(
    (connection) => users[connection.uuid].role === 'clientA'
  );

  if (clientAConnection) {
    const voteCounts = Object.values(votes).reduce((counts, vote) => {
      counts[vote] = (counts[vote] || 0) + 1;
      return counts;
    }, {});

    const message = JSON.stringify({ type: 'votes', votes: voteCounts });
    clientAConnection.send(message);

    const cookieString = cookie.serialize('votes', JSON.stringify(voteCounts), {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    clientAConnection.send(JSON.stringify({ type: 'cookie', cookie: cookieString }));
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

In this updated code:

- The `votes` object is introduced to store the votes of each client using their `uuid` as the key.
- In the `handleMessage` function, when a vote message is received, the client's vote is stored in the `votes` object.
- In the `handleClose` function, when a client disconnects, their vote is removed from the `votes` object.
- In the `broadcastVotes` function, the vote counts are calculated by reducing the `votes` object into a new object where the keys are the unique vote values and the values are the counts of each vote.
- The vote counts are sent to Client A as a `'votes'` message.
- Additionally, a cookie named `'votes'` is created using the `cookie.serialize` function from the `cookie` package. The cookie contains the stringified `voteCounts` object and is set with `httpOnly` and `maxAge` options.
- The cookie is sent to Client A as a separate `'cookie'` message.

On the client-side (Client A), you'll need to handle the `'cookie'` message and set the received cookie using the appropriate method (e.g., `document.cookie`).

Please note that storing sensitive information like votes in cookies may not be the most secure approach, especially if the application requires strict security measures. In production environments, you might consider using server-side sessions or other secure storage mechanisms.

Remember to install the `cookie` package by running `npm install cookie` before running the server code.
Make sure to update the client-side code accordingly to send vote messages with the appropriate `type` field and handle the received `'votes'` messages on Client A to update the local state or cookie data.

Remember to handle any additional error scenarios and implement proper authentication and security measures in a production environment.
