const express = require('express');
const Stripe = require("stripe");
let stripeSecretKey;
if(process.env.NODE_ENV === "test"){
  stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST
}else{
  stripeSecretKey = process.env.STRIPE_SECRET_KEY
}
const stripe = new Stripe(stripeSecretKey);
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { verifyProfile, verifyDBProfile } = require("../backendutils/verifyProfile");
const { requiresAuth } = require('express-openid-connect');

// Helper for sqlite get
const dbGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

// Helper for sqlite run
const dbRun = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });


// Onboarding route
router.get("/", requiresAuth(), async (req, res) => {
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");

  try {
    // Verify user
    const isVerified = await verifyProfile(req, res);
    if (!isVerified) return res.render("verifymail");

    const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
    if (profileInDB !== "Club") return res.status(403).send("Only clubs can register Stripe accounts");

    // Check if seller already has Stripe ID
    let row = await dbGet(db, "SELECT stripeId FROM klub WHERE username = ?", [req.oidc.user.nickname]);
    let stripeId = row?.stripeId;

    if (!stripeId) {
      // Create new Stripe Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: "HR",
        email: req.oidc.user.email
      });

      stripeId = account.id;

      // Store stripeId in DB
      await dbRun(db, "UPDATE klub SET stripeId = ? WHERE username = ?", [stripeId, req.oidc.user.nickname]);

    }

    const currentUrl = `${req.protocol}://${req.get('host')}`;
    // Generate accountLink for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeId,
      refresh_url: process.env.REFRESH_URL || `${currentUrl}/myprofile`,
      return_url: process.env.RETURN_URL || `${currentUrl}/myprofile`,
      type: "account_onboarding"
    });

    return res.redirect(accountLink.url);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal server error");
  } finally {
    db.close();
  }
});



module.exports = router;
