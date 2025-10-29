const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer();

const{ requiresAuth } = require('express-openid-connect')

const { verifyProfile, verifyDBProfile } = require("../backendutils/verifyProfile");
const { checkAvailability} = require("../backendutils/checkAvailability");
const axios = require('axios');
const { render } = require('../server');
const sqlite3 = require('sqlite3').verbose();

async function allowEntry(req, res){
    const isVerified = await verifyProfile(req);
    const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);

    if(!isVerified){
        /* this view needs to be made */
        res.render("verifymail")
    }
    if(profileInDB !== "Club" && profileInDB !== "Admin"){
        return res.status(403).send("Forbidden.");
    }
    const clubId = req.params.clubId;
    const terrainId = req.params.terrainId;
    if(req.params.clubId !== req.oidc.user.nickname && profileInDB !== "Admin"){
        return res.status(403).send("Forbidden, you dont own this nor are you an admin");
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
    return row;
}

router.get('/:clubId/:terrainId', requiresAuth(), async (req, res) => {
    try{
        const row = await allowEntry(req, res);

        const clubId = req.params.clubId;
        const terrainId = row.terenID;
        res.render("editschedule", {terrain: row});
        
    }
    catch(err){
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});


router.post('/:clubId/:terrainId/add', requiresAuth(), async (req, res) => {
    try{
        const row = await allowEntry(req, res);
        if(!row) return;
        const day = req.body.day;
        const startTime = req.body.startTime;
        const endTime = req.body.endTime;
        let dayNum;
        if(day  == "monday") {dayNum = 0;}
        else if(day  == "tuesday") {dayNum = 1;}
        else if(day  == "wednesday") {dayNum = 2;}
        else if(day  == "thursday") {dayNum = 3;}
        else if(day  == "friday") {dayNum = 4;}
        else if(day  == "saturday") {dayNum = 5;}
        else if(day  == "sunday") {dayNum = 6;}
        else {
            return res.status(400).send("Invalid day provided.");
        }
        if (!day || !startTime || !endTime) {
            return res.status(400).send("All fields are required.");
        }
        res.render("editschedule", {terrain: row, message: "Schedule added successfully!"});
    }
    catch(err){
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});


module.exports = router;