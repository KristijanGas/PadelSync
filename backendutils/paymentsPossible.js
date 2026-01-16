require('dotenv').config();
const Stripe = require("stripe");
let stripeSecretKey;
if(process.env.NODE_ENV === "test"){
  stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST
}else{
  stripeSecretKey = process.env.STRIPE_SECRET_KEY
}
let stripe = null;
if (stripeSecretKey) {
  try {
    stripe = new Stripe(stripeSecretKey);
  } catch (e) {
    console.error('Failed to initialize Stripe:', e.message);
    stripe = null;
  }
} else {
  // In test or missing configuration, leave stripe as null to avoid constructor errors
  stripe = null;
}

const sqlite3 = require('sqlite3').verbose();


const dbGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });


async function checkStripeAccount(username){
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    let hasCapabilities = false;;
  try {
    if (!stripe) {
      // Stripe not configured in this environment (tests/local). Assume no capabilities.
      hasCapabilities = false;
      return hasCapabilities;
    }
    if(username){
      const row = await dbGet(db, "SELECT stripeId FROM klub WHERE username = ?", [username]);
      if (!row?.stripeId){
        hasCapabilities = false;
      }else{
        const account = await stripe.accounts.retrieve(row.stripeId);

        if (account.charges_enabled && account.payouts_enabled) {
          hasCapabilities = true;
        } 
      }
    }        
  } catch (err) {
    console.error(err);
    hasCapabilities = false;
  } finally {
        db.close();
    }

    return hasCapabilities;
}

module.exports = { checkStripeAccount };