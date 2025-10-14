const express = require("express");
const app = express();
const { auth } = require('express-oauth2-jwt-bearer');

const jwtCheck = auth({
  audience: 'https://www.padelsync-api.com',
  issuerBaseURL: 'https://padelsync.eu.auth0.com/',
  tokenSigningAlg: 'RS256'
});



app.get("/public", (req, res) => {
        res.json({
                type:"public"
        })
})


app.get("/private", jwtCheck, (req, res) => {
        res.json({
                emailVerified: req.auth.payload['https://myapp/email_verified']
        })
})


app.listen(5000);