const express = require('express');
var sqlite3 = require('sqlite3').verbose();
const router = express.Router()

// podstranica za pretraživanje klubova, igrača

router.get('/', (req, res) => {
    console.log(req.oidc.isAuthenticated())
    res.render('user_search', { 
        isAuthenticated: req.oidc.isAuthenticated(),
        user: req.oidc.user,
        session: req.session,
        oidcWhole: req.oidc
    });
});

//search by is player or club | username | max price
router.get('/klub/:username', (req, res) => {
    let SQLQuery = 'SELECT * FROM KLUB'
    + ' WHERE (lower(username) LIKE \"%' + req.params.username + '%\")'
    + ' OR (lower(imeklub) LIKE \"%' + req.params.username + '%\")';
    const db = new sqlite3.Database("database.db");
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
            klubovi.push({'username':rows[i].username, 'imeKlub':rows[i].imeKlub});
        }
        res.render('user_search', {klubovi: klubovi, session: req.session});
    });
    db.close();
    
});

router.get('/igrac/:username', (req, res) => {
    let SQLQuery = 'SELECT * FROM IGRAC'
    + ' WHERE (lower(username) LIKE \"%' + req.params.username + '%\")'
    + ' OR (lower(prezimeIgrac) LIKE \"%' + req.params.username + '%\")'
    + ' OR (lower(imeIgrac) LIKE \"%' + req.params.username + '%\");';
    const db = new sqlite3.Database("database.db");
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
        res.render('user_search', {igraci: igraci, session: req.session});
    });
    db.close();
    
});

module.exports = router;