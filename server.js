const http = require('http');
const express = require("express");
const app = express();
const server = http.createServer(app);

// Require socket.io and then make it use the http server above.
// This allows us to expose correct socket.io library JS for use
// in the client side JS.
var io = require('socket.io')(server);

// Serve all the files in 'www'.
app.use(express.static("public"));

// If no file specified in a request, default to index.html
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/public/index.html");
});

// Handle socket.io client connect event.
io.on('connect', socket => {
  console.log('Client connected');

  // If you wanted you could emit existing comments from some DB
  // to client to render upon connect.
  // socket.emit('storedComments', commentObjectArray);

  // Listen for "comment" event from a connected client.
  socket.on('comment', (data) => {
    // Relay this comment data to all other connected clients
    // upon receiving.
    socket.broadcast.emit('remoteComment', data);
  });
});

// Start the web server.
const listener = server.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});