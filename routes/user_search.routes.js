const express = require('express');
var sqlite3 = require('sqlite3').verbose();
const router = express.Router()

// podstranica za pretraživanje klubova, igrača

router.get('/', (req, res) => {
    res.render('user_search', { 
        isAuthenticated: req.oidc.isAuthenticated()
    });
});

//search by is player or club by  username
router.get('/klub/:username', (req, res) => {
    let SQLQuery = 'SELECT * FROM KLUB_RATING'
    + ' WHERE (lower(usernameKlub) LIKE \"%' + req.params.username + '%\")'
    + ' OR (lower(imeKlub) LIKE \"%' + req.params.username + '%\")';
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    db.all(SQLQuery, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("Internal Server Error");
            return;
        }
        if (!rows) {
            res.status(404).send("User Not Found");
            return;
        }
        let klubovi = [];
        for(let i=0; i<rows.length; i++){
            if (rows[i].rating === null) {
                rows[i].rating = "N/A";
            }
            klubovi.push({'username':rows[i].usernameKlub, 'imeKlub':rows[i].klub, 'klubRating':rows[i].rating});
        }
        res.render('user_search', {klubovi: klubovi, session: req.session, isAuthenticated: req.oidc.isAuthenticated()});
    });
    db.close();
    
});

router.get('/igrac/:username', (req, res) => {
    let SQLQuery = 'SELECT * FROM IGRAC'
    + ' WHERE (lower(username) LIKE \"%' + req.params.username + '%\")'
    + ' OR (lower(prezimeIgrac) LIKE \"%' + req.params.username + '%\")'
    + ' OR (lower(imeIgrac) LIKE \"%' + req.params.username + '%\");';
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    db.all(SQLQuery, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("Internal Server Error");
            return;
        }
        if (!rows) {
            res.status(404).send("User Not Found");
            return;
        }
        let igraci = [];
        for(let i=0; i<rows.length; i++){
            igraci.push({'username':rows[i].username, 'imeIgrac':rows[i].imeIgrac, 'prezimeIgrac':rows[i].prezimeIgrac});
        }
        res.render('user_search', {igraci: igraci, session: req.session, isAuthenticated: req.oidc.isAuthenticated()});
    });
    db.close();
    
});

module.exports = router;