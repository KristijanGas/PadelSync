const express = require('express');
var sqlite3 = require('sqlite3').verbose();

const router = express.Router()

// podstranica za pretraživanje klubova, igrača

router.get('/', (req, res) => {
    //res.render('user');
    if(req.session.user){
        res.redirect(`/user/${req.session.user.username}`);
    } 
    else {
        res.redirect('/login');
    }

});
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect('/home');
        }
    });
});

router.get('/:username', async (req, res) => {
    const db = new sqlite3.Database("database.db");
    const username = req.params.username;
    let SQLQuery = 'SELECT * FROM korisnik WHERE username = \"' + username + '\";';
    db.get(SQLQuery, [], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("Internal Server Error");
            return;
        }
        if (!row) {
            res.status(404).send("User Not Found");
            return;
        }
        const user = {
            username: row.username,
            first_name: row.first_name,
            email: row.email,
        };
        res.render('user', { user: user, session: req.session });
    });
    db.close();
});


module.exports = router;