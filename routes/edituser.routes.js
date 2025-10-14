const express = require('express');
const router = express.Router();

const{ requiresAuth } = require('express-openid-connect')
const axios = require('axios')

router.get('/', requiresAuth(), async (req, res) => {
        try{
                const isVerified = await verifyProfile(req);
                if(!isVerified){
                        /* this view needs to be made */
                        res.render("verifyEmail")
                }else{
                        res.render("edituser", {
                        username: req.oidc.user["https://yourapp.com/username"],
                        isAuthenticated: req.oidc.isAuthenticated(),
                        session: req.session,
                        user: req.oidc.user,
                        oidcWhole: req.oidc,
                        tokenInfo: req.oidc.accessToken
                        })
                }
        }catch(err){
                res.status(500).send("internal server error");
        }
})

module.exports = router;