const express = require('express');
var sqlite3 = require('sqlite3').verbose();
const router = express.Router()

// podstranica za pretraživanje klubova, igrača

router.get('/', (req, res) => {
    res.render('user_search');
});

//search by is player or club | username | max price
router.get('/club/:username/:minrating', (req, res) => {
    let SQLQuery = 'SELECT * FROM klub'
    + ' WHERE username LIKE \"%' + req.params.username + '%\" AND rating >= ' + req.params.minrating + ' AND is_player = 0;';
    res.render('user_search');
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
        let users = [];
        for(let i=0; i<rows.length; i++){
            users.push({'username':rows[i].username, 'imeIgrac':rows[i].imeIgrac, 'prezimeIgrac':rows[i].prezimeIgrac});
        }
        console.log(users);
        res.render('user_search', {users: users, session: req.session});
    });
    db.close();
    
});

module.exports = router;