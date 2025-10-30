const axios = require('axios');
const fetchAll = require('./fetchAll');
const sqlite3 = require('sqlite3').verbose();


async function checkAvailability(terrainId, date, startTime, endTime) {
    const db = new sqlite3.Database('database.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            throw new Error("Internal Server Error");
        }
    });
    let jednokratniTermini;
    const query1 = `select * from REZERVACIJA join JEDNOKRATNA_REZ on REZERVACIJA.rezervacijaID = JEDNOKRATNA_REZ.rezervacijaID
                    join TERMIN_TJEDNI on REZERVACIJA.terminID = TERMIN_TJEDNI.terminID
                    where JEDNOKRATNA_REZ.datumRez = ? and termin_tjedni.terenID = ?
                    and NOT(TERMIN_TJEDNI.vrijemeKraj <= ? or TERMIN_TJEDNI.vrijemePocetak >= ?)`;
    try {
        jednokratniTermini = fetchAll(db, query1, [date, terrainId, startTime, endTime]);
    } catch (error) {
        console.log(error);
    }

    let ponavljajuciTermini;
    const query2 = `select * from REZERVACIJA join PONAVLJAJUCA_REZ on REZERVACIJA.rezervacijaID = PONAVLJAJUCA_REZ.rezervacijaID
                    join TERMIN_TJEDNI on REZERVACIJA.terminID = TERMIN_TJEDNI.terminID
                    where strftime('%w', ?) = TERMIN_TJEDNI.danTjedan and TERMIN_TJEDNI.terenID = ?
                    and NOT(TERMIN_TJEDNI.vrijemeKraj <= ? or TERMIN_TJEDNI.vrijemePocetak >= ?)`;
    try {
        ponavljajuciTermini = fetchAll(db, query2,[date, terrainId, startTime, endTime]);
    } catch (error) {
        console.log(error);
    }

    if(jednokratniTermini.length > 0 || ponavljajuciTermini.length > 0)
        return false;
    else return true;
    db.close();
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