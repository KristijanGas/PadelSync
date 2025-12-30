const express = require('express');
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
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

      console.log(account);
    }

    // Generate accountLink for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeId,
      refresh_url: process.env.REFRESH_URL || "https://maryanna-nonrealizable-ambroise.ngrok-free.dev/stripe/fail",
      return_url: process.env.RETURN_URL || "https://maryanna-nonrealizable-ambroise.ngrok-free.dev/stripe/complete",
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

// Completion callback route
router.get("/complete", /* requiresAuth(),  */async (req, res) => {
   const db = new sqlite3.Database(process.env.DB_PATH || "database.db");

  try {
    // Attempt to get user info if session exists
    const username = req.oidc?.user?.nickname; // ✅ will be undefined if session lost
    if (!username) {
      return res.send("Stripe returned, but session was lost. You may need to log in again.");
    }

    const row = await dbGet(db, "SELECT stripeId FROM klub WHERE username = ?", [username]);
    if (!row?.stripeId) return res.status(404).send("Stripe account not found");

    const account = await stripe.accounts.retrieve(row.stripeId);

    if (account.charges_enabled && account.payouts_enabled) {
      return res.send("Stripe onboarding complete 🎉 Your account is ready to receive payments!");
    } else {
      return res.send("Onboarding started, but not fully complete yet. Please finish the steps in Stripe.");
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal server error");
  } finally {
    db.close();
  }
});

// Failure callback route
router.get("/fail", (req, res) => {
  res.send("Stripe onboarding was interrupted. Please try again.");
});

module.exports = router;
