const axios = require('axios');
const fetchAll = require('./fetchAll');
const sqlite3 = require('sqlite3').verbose();
const StatusPlacanja = require('../constants/statusPlacanja');

async function checkPayments() {
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    const SQLQuery = `UPDATE TRANSAKCIJA
                    SET TRANSAKCIJA.statusPlac = ?
                    WHERE TRANSAKCIJA.nacinPlacanja = 'kartica' AND TRANSAKCIJA.statusPlac = ?`;
    await new Promise((resolve, reject) =>{
        db.run(SQLQuery, [StatusPlacanja.OTKAZANO, StatusPlacanja.PENDING], function(err) {
            if (err) {
            console.error(err.message);
            return reject(err);
            }
            resolve();
        });
    });
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

    const query = `SELECT * FROM PRETPLATA WHERE pretpPlacenaDo = ?`;
    let AAAAAAAAAAAA = await dbGet(db, query, [dateUTC]); //ovdje su sada sve pretplate koje se moraju platiti za naredni tjedan
    const currDate = new Date().toISOString.split('T')[0];
    const query2 = `UPDATE PRETPLATA SET pretpAktivna = 0 WHERE pretPlacenaDo = ?`;
    await dbRun(db, query2, [currDate]);

}

module.exports = {checkPayments, checkPonavljajuce};