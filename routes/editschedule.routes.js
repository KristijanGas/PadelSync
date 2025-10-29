const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer();

const{ requiresAuth } = require('express-openid-connect')

const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");
const axios = require('axios');
const { render } = require('../server');
const sqlite3 = require('sqlite3').verbose();


router.get('/:clubId/:terrainId', requiresAuth(), async (req, res) => {
    try{
        const isVerified = await verifyProfile(req);
        let profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);

        if(!isVerified){
            /* this view needs to be made */
            res.render("verifymail")
        }
        if(profileInDB === "Club" || profileInDB === "Admin"){
            const clubId = req.params.clubId;
            const terrainId = req.params.terrainId;
            if(req.params.clubId !== req.oidc.user.nickname && profileInDB !== "Admin"){
                return res.status(403).send("Forbidden");
            }
            const getRow = (sql, params) => new Promise((resolve, reject) => {
                db.get(sql, params, (err, row) => {
                if (err) return reject(err);
                    resolve(row);
                });
            });

            const db = new sqlite3.Database('database.db', sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).send("Internal Server Error");
                }
            });
            let SQLQuery = `SELECT * FROM teren WHERE terenID = ? AND username = ?;`;

            let row;
            try{
                row = await getRow(SQLQuery, [req.params.terrainId, req.params.clubId]);
                if(!row){
                    res.status(404).send("Terrain not found or isnt yours to edit");
                    db.close();
                    return;
                }
            }catch(err){
                console.error(err.message);
                if(res) res.status(500).send("Internal Server Error getting terrain info");
                db.close();
                return null;
            }
            res.render("editschedule", {terrain: row, clubId: clubId, terrainId: terrainId, userType: profileInDB});
            db.close();

        }
    }
    catch(err){
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});


module.exports = router;