const express = require('express');
const router = express.Router();

const{ requiresAuth } = require('express-openid-connect')

const { verifyProfile, verifyDBProfile } = require("../backendutils/verifyProfile");
const { checkBooking} = require("../backendutils/checkAvailability");

const sqlite3 = require('sqlite3').verbose();

async function allowEntry(req, res){
    const isVerified = await verifyProfile(req, res);
    const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);

    if(!isVerified){
        /* this view needs to be made */
        res.render("verifymail")
    }
    if(profileInDB !== "Club" && profileInDB !== "Admin"){
        res.status(403).send("Forbidden.");
        return null;
    }
    if(req.params.clubId !== req.oidc.user.nickname && profileInDB !== "Admin"){
        res.status(403).send("Forbidden, you dont own this nor are you an admin");
        return null;
    }
    
    const getRow = (sql, params) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
        if (err) return reject(err);
            resolve(row);
        });
    });

    const db = new sqlite3.Database(process.env.DB_PATH || 'database.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("Internal Server Error");
            return null;
        }
    });
    let SQLQuery = `SELECT * FROM teren WHERE terenID = ? AND username = ?;`;

    let row;
    try{
        row = await getRow(SQLQuery, [req.params.terrainId, req.params.clubId]);
        if(!row){
            res.status(403).send("Terrain not found or isnt yours to edit");
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
        if(!row) return;
        res.render("editschedule", {terrain: row, message: null});

    }
    catch(err){
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

async function timeStringToFloat(time) {
  var hoursMinutes = time.split(/[.:]/);
  var hours = parseInt(hoursMinutes[0], 10);
  var minutes = hoursMinutes[1] ? parseInt(hoursMinutes[1], 10) : 0;
  return hours * 60 + minutes;
}

router.post('/:clubId/:terrainId/add', requiresAuth(), async (req, res) => {
    try{
        const row = await allowEntry(req, res);
        if(row.terenID === undefined) return;
        const day = req.body.day;
        const startTime = req.body.startTime;
        const endTime = req.body.endTime;
        let dayNum;
        if(day  == "monday") {dayNum = 1;}
        else if(day  == "tuesday") {dayNum = 2;}
        else if(day  == "wednesday") {dayNum = 3;}
        else if(day  == "thursday") {dayNum = 4;}
        else if(day  == "friday") {dayNum = 5;}
        else if(day  == "saturday") {dayNum = 6;}
        else if(day  == "sunday") {dayNum = 0;}
        else {
            return res.status(400).send("Invalid day provided.");
        }
        if (!day || !startTime || !endTime) {
            return res.status(400).send("All fields are required.");
        }
        let startMinute = await timeStringToFloat(startTime);
        let endMinute = await timeStringToFloat(endTime);
        if (isNaN(startMinute) || isNaN(endMinute) || startMinute < 0 || endMinute > 1440) {
            return res.status(400).send("Start time and end time must be valid numbers between 0 and 1440.");
        }
        if (startMinute + 30 > endMinute) {
            return res.status(400).send("Start time must be before end time and booking time should be at least 30 minutes.");
        }
        const availability = await checkBooking(row.terenID, dayNum, startTime, endTime);
        if (!availability) {
            return res.status(400).send("The specified time conflicts with an existing booking.");
        }
        let SQLQuery = `INSERT INTO TERMIN_TJEDNI (terenID, danTjedan, vrijemePocetak, vrijemeKraj, potrebnaPretplata) VALUES (?, ?, ?, ?, ?);`;

        const db = new sqlite3.Database(process.env.DB_PATH || "database.db");

        console.log("Inserting schedule:", row.terenID, dayNum, startTime, endTime, 0);

        await new Promise((resolve, reject) => {
            db.run(SQLQuery, [row.terenID, dayNum, startTime, endTime, 0], function(err) {
                if (err) {
                    console.error(err.message);
                    return reject(err);
                }
                resolve();
            });
        });
        db.close();
        res.render("editschedule", {terrain: row, message: "Schedule added successfully!"});
    }
    catch(err){
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;