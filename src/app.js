const express = require("express");
const app = express();
const http = require('http').Server(app);
const path = require('path');

app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const port = process.env.PORT || 5000;
const io = require("socket.io")(http, {
  cors: {
    origin: `http://localhost:${port}`,
    methods: ["GET", "POST"]
  }
});


module.exports = { app, http, io, port };