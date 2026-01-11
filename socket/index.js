
let ioInstance;

function initSocket(io) {
  ioInstance = io;
  console.log("Socket.io initialized");

  io.on("connection", (socket) => {
    
  });
}

const { templates } = require("../constants/notificationTemplates");

function sendNotificationFromTemplate(
  templateName,
  usernamePrimatelj,
  poslanoZbogUsername,
  datumRez,
  vrijemePocetak,
  vrijemeKraj,
  terenID,
  imeTeren
) {
  const templateFn = templates[templateName];

  if (!templateFn) {
    throw new Error(`Unknown template: ${templateName}`);
  }

  const message = templateFn(
    usernamePrimatelj,
    poslanoZbogUsername,
    datumRez,
    vrijemePocetak,
    vrijemeKraj,
    terenID,
    imeTeren
  );

  sendNotification(usernamePrimatelj, message);
}

function sendNotification(usernamePrimatelj, message) {
  if (!ioInstance) throw new Error("Socket.io not initialized");

  const room = `user:${usernamePrimatelj}`;

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

module.exports = { initSocket, sendNotification, getIO, addSocketToRoom, sendNotificationFromTemplate };
