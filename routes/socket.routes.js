const express = require('express');
const router = express.Router();
const { sendNotification, addSocketToRoom } = require("../socket/index.js");

const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");

const { requiresAuth } = require('express-openid-connect')
const axios = require('axios')
const sqlite3 = require('sqlite3').verbose();

router.post("/check",async (req, res) => {
    const {socketId } = req.body;
    if(req.oidc){
        const username = req.oidc.user.nickname;
        const type = await findUserType(req.oidc.user.nickname);
        if(type === "Player" || type === "Club"){
            const ok = addSocketToRoom(socketId, `user:${username}`);
            if(!ok){
                return res.status(404).json({ error: "Socket not connected" });   
            }
        }

        
    }
    res.json({ ok: true });
})
router.get("/notify", (req, res) => {
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
