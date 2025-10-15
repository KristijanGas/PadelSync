const express = require('express');
const router = express.Router();
const { verifyProfile, verifyDBProfile } = require("../backendutils/verifyProfile");

const { requiresAuth } = require('express-openid-connect')
const axios = require('axios')

router.get('/', requiresAuth(), async (req, res) => {
        try {
                const isVerified = await verifyProfile(req);
                //console.log(isVerified);

                if (isVerified === undefined || !isVerified) {
                        /* this view needs to be made */
                        res.render("verifymail")
                } else {
                        const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
                        if (profileInDB === "UserDidntChoose") {
                                //redirect them to choose
                        }
                        if (profileInDB === "CorruptedDB") {
                                res.status(500).send("Corrupted database, contact admin");
                                return;
                        }
                        if (profileInDB === "Player" || profileInDB === "Club") {
                                //all good
                        }
                        console.log(profileInDB);
                        res.render("myprofile", {
                                username: req.oidc.user["https://yourapp.com/username"],
                                isAuthenticated: req.oidc.isAuthenticated(),
                                session: req.session,
                                user: req.oidc.user,
                                oidcWhole: req.oidc,
                                tokenInfo: req.oidc.accessToken
                        })
                }
        } catch (err) {
                res.status(500).send("internal server error");
        }
})

module.exports = router;