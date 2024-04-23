const { WebSocketServer } = require('ws')
const https = require('https')
const fs = require('fs');
const uuidv4 = require('uuid').v4
const url = require('url')

const options = {
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('fullchain.pem')
};
const server = https.createServer(options);
const wsServer = new WebSocketServer({ server })

const port = 8000
const connections = {}
const users = {}
let currentIndex = 0;
const votes = {};

const handleMessage = (message, uuid) => {
  const jsonMessage = JSON.parse(message)
  console.log(`Received message: ${JSON.stringify(jsonMessage)}`)
  const user = users[uuid]
  user.text = jsonMessage.text
  user.role = jsonMessage.role
  if (jsonMessage.text.type === 'vote') {
    user.text.selectedOptionIndex = jsonMessage.text.selectedOptionIndex;
    console.log(`Client ${uuid} voted: ${user.text.selectedOptionIndex}`);
    votes[uuid] = user.text.selectedOptionIndex;
    currentIndex = jsonMessage.text.currentIndex;
  }
  broadcast()

  console.log(`Updated their updated text: ${JSON.stringify(user.text)}`)
}

const handleClose = uuid => {
  console.log(`Disconnected`)
  delete connections[uuid]
  delete users[uuid]
  delete votes[uuid]
  broadcast()
}

const broadcast = () => {
  let teacherMessage;
  Object
    .keys(connections)
    .forEach(uuid => {
      if (users[uuid].role === 'teacher') {
        const voteCounts = Object.values(votes).reduce((counts, vote) => {
          counts[vote] = (counts[vote] || 0) + 1;
          return counts;
        }, {});
        users[uuid].text.currentIndex = currentIndex;
        users[uuid].text.votes = voteCounts;
        teacherMessage = JSON.stringify(users[uuid].text);
      }
    });

  if (teacherMessage) {
    Object
      .keys(connections)
      .forEach(uuid => {
        const connection = connections[uuid]
        connection.send(teacherMessage)
      });
  }
}

wsServer.on('connection', (connection, request) => {
  console.log(connection)
  const uuid = uuidv4()
  connections[uuid] = connection
  users[uuid] = {
    role: { },  
    text: { }
  }
  connection.on('message', message => handleMessage(message, uuid));
  connection.on('close', () => handleClose(uuid));
});

server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`);
})