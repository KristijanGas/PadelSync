require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const app = express();
const { auth } = require('express-oauth2-jwt-bearer');
const axios = require('axios')


const jwtCheck = auth({
  audience: 'https://www.padelsync-api.com',
  issuerBaseURL: 'https://padelsync.eu.auth0.com/',
  algorithms: ['RS256']  // ← eksplicitno, ovo radi uvijek
});



async function getManagementToken() {
  const tokenRes = await axios.post(
    "https://padelsync.eu.auth0.com/oauth/token",
    {
      client_id: process.env.MGMT_CLIENT_ID,
      client_secret: process.env.MGMT_CLIENT_SECRET,
      audience: "https://padelsync.eu.auth0.com/api/v2/",
      grant_type: "client_credentials"
    }
  );

  return tokenRes.data.access_token;
}

async function getAuth0User(userId) {
  const token = await getManagementToken();

  const userRes = await axios.get(
    `https://padelsync.eu.auth0.com/api/v2/users/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return userRes.data; // sadrži email_verified
}




app.get("/public", (req, res) => {
        res.json({
                type:"public"
        })
})


app.get("/private", jwtCheck, async (req, res) => {
  try {
    const user = await getAuth0User(req.auth.payload.sub);
    res.json({
      emailVerified: user.email_verified
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot fetch user" });
  }
});


app.listen(5000);