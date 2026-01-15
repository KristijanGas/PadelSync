const express = require('express');
const router = express.Router();
const { verifyProfile, verifyDBProfile } = require("../backendutils/verifyProfile");

const { requiresAuth } = require('express-openid-connect')
const axios = require('axios')
const sqlite3 = require('sqlite3').verbose();

router.get("/", requiresAuth(), async (req, res) => {
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");

    try {
        // Verify user
        const isVerified = await verifyProfile(req, res);
        if (!isVerified) return res.render("verifymail");

        const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
    
        if(profileInDB !== "Player" && profileInDB !== "Club"){
        return res.status(500).send("samo igrači i klubovi imaju inbox")
        }
    }catch(err){
        console.error(err);
        db.close();
        return res.status(500).send(err);
    }
    let messages;
    try{
        const getAll = (sql, params) => new Promise((resolve, reject) => {
                                                db.all(sql, params, (err, row) => {
                                                        if(err) return reject(err);
                                                        resolve(row);
                                                })
                                        });
        const SQLQuery = `SELECT * FROM OBAVIJEST
                            WHERE usernamePrimatelj = ?`
        messages = await getAll(SQLQuery, [req.oidc.user.nickname])
    }catch(err){
        console.error(err);
        return res.status(500).send("Internal server err");
    }finally{
        db.close();
    }

    res.render("myInbox", {
        messages: messages,
        isAuthenticated: req.oidc.isAuthenticated()
    })
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
        const SQLQuery = `UPDATE OBAVIJEST SET obavOtvorena = 1 WHERE obavijestID = ? 
                                                            AND usernamePrimatelj = ?
                                                            AND obavOtvorena = 0`;
        await dbRun(db, SQLQuery, [req.params.obavijestID, req.oidc.user.nickname])
        db.close();
    }catch(err){
        db.close();
        res.send(500).status("error marking message as read")
    }
})

module.exports = router;