const express = require('express');
var sqlite3 = require('sqlite3').verbose();
const router = express.Router()
const { findUserType } = require("../backendutils/verifyProfile")

// podstranica za pretraživanje klubova, igrača

router.get('/', (req, res) => {
    res.render('user_search', { 
        isAuthenticated: req.oidc.isAuthenticated(),
        show_search_results: false
    });
});

//search by is player or club by  username
router.get('/klub/:username', async (req, res) => {
    let isAdmin = false;
    if(req.oidc && req.oidc.user && req.oidc.user.nickname){
        try{
            const userType = await findUserType(req.oidc.user.nickname);
            if(userType === "Admin"){
                isAdmin = true;
            }
        }catch(err){
            console.error(err);
        }
    }
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
        const userType = 
        res.render('user_search', {klubovi: klubovi, session: req.session, isAuthenticated: req.oidc.isAuthenticated(), show_search_results: true, isAdmin: isAdmin});
    });
    db.close();
    
});

router.get('/igrac/:username', async (req, res) => {
    let isAdmin = false;
    if(req.oidc && req.oidc.user && req.oidc.user.nickname){
        try{
            const userType = await findUserType(req.oidc.user.nickname);
            if(userType === "Admin"){
                isAdmin = true;
            }
        }catch(err){
            console.error(err);
        }
    }
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
        res.render('user_search', {igraci: igraci, session: req.session, isAuthenticated: req.oidc.isAuthenticated(), show_search_results: true, isAdmin: isAdmin});
    });
    db.close();
    
});

module.exports = router;