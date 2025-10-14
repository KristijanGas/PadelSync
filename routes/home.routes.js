const express = require('express');

const router = express.Router()


router.get('/', (req, res) => {
    res.render('home', { 
        isAuthenticated: req.oidc.isAuthenticated(),
        user: req.oidc.user,
        session: req.session,
        oidcWhole: req.oidc
    });
});


module.exports = router;