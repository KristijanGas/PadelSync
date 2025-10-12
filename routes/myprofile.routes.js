const express = require('express');
const router = express.Router();

const{ requiresAuth } = require('express-openid-connect')
const axios = require('axios')

router.get('/', requiresAuth(), async (req, res) => {
        console.log("here");
        let data = {}

        const {token_type, access_token} = req.oidc.accessToken

        try{
                const apiResponse = await axios.get('http://localhost:5000/private',
                        {
                                headers:{
                                        authorization: `${token_type} ${access_token}`
                                }
                        }
                )
                data = apiResponse.data
        }catch(e){
                console.log(e);
        }
        res.render("myprofile", {
                title: "my profile",
                isAuthenticated: req.oidc.isAuthenticated(),
                session: req.session,
                user: req.oidc.user,
                oidcWhole: req.oidc,
                tokenInfo: req.oidc.accessToken
        })
})

module.exports = router;