const sqlite3 = require('sqlite3').verbose();

const dbRun = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

let ioInstance;

function initSocket(io) {
  ioInstance = io;
  console.log("Socket.io initialized");

  io.on("connection", (socket) => {
    
  });
}

const { templates } = require("../constants/notificationTemplates");
const { titles } = require("../constants/notificationTitles");

async function sendNotificationFromTemplate(
  templateName,
  usernamePrimatelj,
  poslanoZbogUsername,
  datumRez,
  vrijemePocetak,
  vrijemeKraj,
  terenID,
  imeTeren,
  rezervacijaID,
) {
  const templateFn = templates[templateName];

  if (!templateFn) {
    throw new Error(`Unknown template: ${templateName}`);
  }

  const title = titles[templateName];

  if (!title) {
    throw new Error(`Unknown title: ${templateName}`);
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

  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  try{
    const currentDateUTC = new Date().toISOString().split('T')[0];
    const SQLQuery = `INSERT INTO OBAVIJEST(naslovObavijest, tekstObavijest, datumObavijest, obavOtvorena, usernamePrimatelj, poslanoZbogUsername, rezervacijaID)
        VALUES(?, ?, ?, ?, ?, ?, ?)`;
    
    await dbRun(db, SQLQuery, [title, message, currentDateUTC, 0, usernamePrimatelj, poslanoZbogUsername, rezervacijaID]);
  }catch(err){
    console.log(err);
  }finally{
    db.close();
  }

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
