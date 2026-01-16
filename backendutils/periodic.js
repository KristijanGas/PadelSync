const axios = require('axios');
const fetchAll = require('./fetchAll');
const sqlite3 = require('sqlite3').verbose();
const StatusPlacanja = require('../constants/statusPlacanja');
const StatusRezervacije = require('../constants/statusRez');

async function checkPayments() {
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    const query = `SELECT jednokratnaID, transakcijaID FROM JEDNOKRATNA_REZ NATURAL JOIN TRANSAKCIJA
                    WHERE datumPlacanja < ? AND statusRez = ?
                    AND nacinPlacanja = ?`;
    const currentDateUTC = new Date().toISOString().split('T')[0];
    let rows = await fetchAll(db, query, [currentDateUTC, StatusRezervacije.PENDING, "kartica"]);
    const updQry1 = `UPDATE JEDNOKRATNA_REZ SET statusRez = ? WHERE jednokratnaID = ?`;
    const updQry2 = `UPDATE TRANSAKCIJA SET statusPlac = ? WHERE transakcijaID = ?`; 
    for(let row of rows) {
        await new Promise((resolve, reject) => {
            db.run(updQry1, [StatusRezervacije.ODBIJENA, row.jednokratnaID], function(err) {
                if(err) reject(err);
                resolve();
            });
        });

        await new Promise((resolve, reject) => {
            db.run(updQry2, [StatusPlacanja.OTKAZANO, row.transakcijaID], function(err) {
                if(err) reject(err);
                resolve();
            })
        });
    }
    db.close();
}

async function checkPonavljajuce() {
    const dbRun = (db, sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this); // this.changes, this.lastID
        });
    });

    const dbGet = (db, sql, params = []) =>
    new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) =>
        err ? reject(err) : resolve(row)
        );
    });

    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate()+7);
    const dateUTC = futureDate.toISOString().split('T')[0];
    const currentDate = new Date().toISOString().split('T')[0];

    const query = `SELECT * FROM PRETPLATA NATURAL JOIN TIP_PRETPLATE WHERE pretpPlacenaDo = ? and pretpAktivna = 1`;
    const neplacenePretplate = await fetchAll(db, query, [dateUTC]); //ovdje su sada sve pretplate koje se moraju platiti za naredni tjedan
    const insertQuery = `INSERT INTO TRANSAKCIJA(iznos, statusPlac, nacinPlacanja, datumPlacanja, pretpID, stripePaymentID)
                            VALUES (?, ?, ?, ?, ?, null)`;
    for(let pretplata of neplacenePretplate) {
        await dbRun(db, insertQuery, [pretplata.pretpCijena, StatusPlacanja.PENDING, "kartica", currentDate, pretplata.pretpID])
    }

    const query2 = `UPDATE PRETPLATA SET pretpAktivna = 0 WHERE pretpPlacenaDo = ?`;
    await dbRun(db, query2, [currentDate]);
    db.close();
}

module.exports = {checkPayments, checkPonavljajuce};