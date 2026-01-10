
let ioInstance;

function initSocket(io) {
  ioInstance = io;
  console.log("Socket.io initialized");

  io.on("connection", (socket) => {
    
  });
}


function sendNotification(username, message) {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  const room = `user:${username}`;
  console.log("Sending notification to", room, message);
  ioInstance.to(room).emit("notification", { message });
}

function getIO() {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  return ioInstance;
}

function addSocketToRoom(socketId, roomName) {
  const io = getIO();
  const socket = io.sockets.sockets.get(socketId);

  if (!socket) {
    console.warn("Socket not found:", socketId);
    return false;
  }

  socket.join(roomName);
  return true;
}

module.exports = { initSocket, sendNotification, getIO, addSocketToRoom };
