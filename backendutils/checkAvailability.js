const axios = require('axios');
const fetchAll = require('./fetchAll');
const StatusRezervacije = require('../constants/statusRez');
const sqlite3 = require('sqlite3').verbose();

//funckija za provjeru dostupnosti jednokratnih termina
async function checkAvailability(terrainId, date, startTime, endTime) {
    const db = new sqlite3.Database(process.env.DB_PATH || 'database.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            throw new Error("Internal Server Error");
        }
    });
    let jednokratniTermini;
    const query1 = `select * from REZERVACIJA join JEDNOKRATNA_REZ on REZERVACIJA.rezervacijaID = JEDNOKRATNA_REZ.rezervacijaID
                    join TERMIN_TJEDNI on REZERVACIJA.terminID = TERMIN_TJEDNI.terminID
                    where JEDNOKRATNA_REZ.datumRez = ? and termin_tjedni.terenID = ?
                    and (REZERVACIJA.statusRez = ? or REZERVACIJA.statusRez = ?)
                    and NOT(TERMIN_TJEDNI.vrijemeKraj <= ? or TERMIN_TJEDNI.vrijemePocetak >= ?)`;
    try {
        jednokratniTermini = await fetchAll(db, query1, [date, terrainId,StatusRezervacije.AKTIVNA, StatusRezervacije.PENDING,  startTime, endTime]);
    } catch (error) {
        console.log(error);
    }
    if(jednokratniTermini.length > 0) {
        return false;
    } else return true;
}

async function checkBooking(terrainId, dayNum, startTime, endTime) {
    const db = new sqlite3.Database(process.env.DB_PATH || 'database.db', sqlite3.OPEN_READONLY, (err) => {
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