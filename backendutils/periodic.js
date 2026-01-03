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
    //implementirat
}

module.exports = {checkPayments, checkPonavljajuce};