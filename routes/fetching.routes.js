const express = require('express');
const router = express.Router();
const fetchAll = require('../backendutils/fetchAll');
const sqlite3 = require('sqlite3').verbose();

router.get('/igrac/:username', async (req, res) => {
    const db = new sqlite3.Database(process.env.DB_PATH || 'database.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            throw new Error("Internal Server Error");
        }
    });

    let sveRezervacije;
    const username = req.params.username;
    const query = `select * from rezervacija join JEDNOKRATNA_REZ on REZERVACIJA.rezervacijaID = JEDNOKRATNA_REZ.rezervacijaID 
                    join TERMIN_TJEDNI on TERMIN_TJEDNI.terminID = REZERVACIJA.terminID
                    where REZERVACIJA.statusRez = 1 and JEDNOKRATNA_REZ.username = ?`;
    try {
        sveRezervacije = await fetchAll(db, query, [username]);
    } catch (error) {
        console.log(error);
    }
    //idk, treba testirat 
    res.json(sveRezervacije);
});

router.get('/klub/:username', (req, res) => {
    const db = new sqlite3.Database(process.env.DB_PATH || 'database.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            throw new Error("Internal Server Error");
        }
    });

    const username = req.params.username;
    
});

module.exports = router;