const { WebSocketServer } = require('ws')
const https = require('https')
const fs = require('fs');
const uuidv4 = require('uuid').v4
const url = require('url')

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/river-on-tips.xyz/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/river-on-tips.xyz/fullchain.pem')
};
const server = https.createServer(options);
const wsServer = new WebSocketServer({ server })

const port = 8000
const connections = {}
const users = {}

const handleMessage = (message, uuid) => {
  const jsonMessage = JSON.parse(message)
  console.log(`Received message: ${jsonMessage}`)
  const user = users[uuid]
  user.text = jsonMessage.text
  user.role = jsonMessage.role
  broadcast()

  console.log(`Updated their updated text: ${user.text}`)
}

const handleClose = uuid => {
  console.log(`Disconnected`)
  delete connections[uuid]
  delete users[uuid]
  broadcast()
}

const broadcast = () => {
  let teacherMessage;
  Object
    .keys(connections)
    .forEach(uuid => {
      if (users[uuid].role === 'teacher') {
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