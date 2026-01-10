const sqlite3 = require('sqlite3').verbose();
const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");
const { requiresAuth } = require('express-openid-connect');


async function socketAuth(socket, next) {
  console.log("!!!!!!");
  try {
    const oidcUser = socket.request?.oidc?.user;

    
    if (!oidcUser) {
      return next(new Error("Not authenticated"));
    }

    const username = oidcUser.nickname;
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    // Check YOUR database
    const isVerified = await verifyProfile(socket.req, socket.res);
    if (!isVerified){
      console.log("!");
      return next(new Error("E-mail not verified"));
    } 

        const profileInDB = await findUserType(username);

    if(profileInDB !== "Player" && profileInDB !== "Club"){
      console.log("!!");
        return next(new Error("Only clubs and players reicive notifications"));
    }

    
    socket.user = username;
    console.log(socket.user)
    db.close();

    next();
  } catch (err) {
    db.close();
    next(err);
  }
}

module.exports = {socketAuth};
