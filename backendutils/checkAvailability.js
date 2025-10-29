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

}