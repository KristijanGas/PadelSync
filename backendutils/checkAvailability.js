const axios = require('axios')
const sqlite3 = require('sqlite3').verbose();



async function checkAvailability(terrainId, date, startTime, endTime) {
    const db = new sqlite3.Database('database.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            throw new Error("Internal Server Error");
        }
    });

}

async function checkBooking(terrainId, dayNum, startTime, endTime) {
    const db = new sqlite3.Database('database.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            throw new Error("Internal Server Error");
        }
    });
    const sql = `SELECT * FROM TERMIN_TJEDNI WHERE terenID = ? AND danTjedan = ? AND 
                 NOT (vrijemeKraj <= ? OR vrijemePocetak >= ?);`;
    return new Promise((resolve, reject) => {
        db.all(sql, [terrainId, dayNum, startTime, endTime], (err, rows) => {
            if (err) {
                console.error(err.message);
                db.close();
                return reject(new Error("Internal Server Error"));
            }
            db.close();
            if (rows.length > 0) {
                return resolve(false); // Booking not available
            } else {
                return resolve(true); // Booking available
            }
        });
    });

}
module.exports = { checkAvailability, checkBooking };