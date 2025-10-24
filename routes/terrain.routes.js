const express = require('express');
var sqlite3 = require('sqlite3').verbose();

const router = express.Router()

// podstranica za pretraživanje klubova, igrača

router.get('/:id', async (req, res) => {
    const db = new sqlite3.Database("database.db");
    const id = req.params.id;

    let tereniQuery = 'SELECT * FROM teren WHERE terenID = ?';
    let teren;
    db.get(tereniQuery, [id], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("Internal Server Error");
            return;
        }
        if (!row) {
            res.status(404).send("Field Not Found");
            return;
        }
        res.render('terrain', {
        teren: row
        });
    });
    
    db.close();
});


module.exports = router;