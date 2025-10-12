const express = require('express');

const router = express.Router()


router.get('/', (req, res) => {
    console.log(req.oidc.isAuthenticated())
    res.render('home', {title: "Demo", 
        isAuthenticated: req.oidc.isAuthenticated(),
        user: req.oidc.user,
        session: req.session,
        oidcWhole: req.oidc
    });
});


module.exports = router;