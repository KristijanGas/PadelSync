const express = require('express');
const router = express.Router();
const { sendNotification, addSocketToRoom } = require("../socket/index.js");

const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");

const { requiresAuth } = require('express-openid-connect')
const axios = require('axios')
const sqlite3 = require('sqlite3').verbose();

const dbRun = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const dbGet = (db, sql, params = []) =>
    new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});

router.post("/check",async (req, res) => {
    const {socketId } = req.body;
    if(req.oidc.user){
        const username = req.oidc.user.nickname;
        const type = await findUserType(req.oidc.user.nickname);
        if(type === "Player" || type === "Club"){
            const ok = addSocketToRoom(socketId, `user:${username}`);
            if(!ok){
                return res.status(404).json({ error: "Socket not connected" });   
            }
        }

        /* const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
        try{
            const SQLQuery = `SELECT EXISTS(SELECT * FROM OBAVIJEST
                            WHERE usernamePrimatelj = ?
                            AND obavOtvorena = 0) AS oldMessages`
            const row = await dbGet(db, SQLQuery, [username]);
            if(row && row.oldMessages){
                sendNotification(username, "old unread messages");
            }
        }catch(err){
            console.error(err);
        }finally{
            db.close();
        } */
    }
    res.json({ ok: true });
})

router.get("/read/:obavijestID", requiresAuth(), async (req, res) => {
    try{
        // Verify user
        const isVerified = await verifyProfile(req, res);
        if (!isVerified) return res.render("verifymail");

        const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
    
        if(profileInDB !== "Player" && profileInDB !== "Club"){
        return res.status(500).send("only clubs and player can read notifications")
        }
    }catch(err){
        res.status(500).send("error verifying profile")
    }

    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    try{
        const SQLQuery = `UPDATE OBAVIJEST SET obavOtvorena = 1 WHERE obavijestID = ?`;
        await dbRun(db, SQLQuery, [req.params.obavijestID])
        db.close();
    }catch(err){
        db.close();
        res.send(500).status("error marking message as read")
    }
})


router.get("/notify", (req, res) => {
    if(!req.oidc.user)  return res.status(500).send("Failed to send notification, unknown user");

    const room = `user:${req.oidc.user.nickname}`
    const message = "proba"
    
    try {
        sendNotification(req.oidc.user.nickname, message);
    } catch (err) {
        console.error(err);
        return res.status(500).send("Failed to send notification");
    }

    res.redirect("/home");
})


module.exports = router;
