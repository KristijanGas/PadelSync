const express = require('express');
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { verifyProfile, verifyDBProfile } = require("../backendutils/verifyProfile");
const { requiresAuth } = require('express-openid-connect');

const StatusRezervacije = require('../constants/statusRez');
const StatusPlacanja = require('../constants/statusPlacanja');


const dbGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });


router.get("/payment/:transakcijaID", requiresAuth(), async (req, res) => {
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  const transakcijaID = req.params.transakcijaID

  try {
    // Verify user
    const isVerified = await verifyProfile(req, res);
    if (!isVerified) return res.render("verifymail");

    const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
   
    if(profileInDB !== "Player"){
      return res.status(500).send("samo igrači mogu nešto plaćati")
    }
  }catch(err){
    console.error(err);
    db.close();
    return res.status(500).send(err);
  }

  let cijena, clubUsername;
  try{
    const SQLCijena = `SELECT iznos FROM TRANSAKCIJA WHERE transakcijaID = ?`
    let row = await dbGet(db, SQLCijena, [transakcijaID]);

    if(!row || !row.iznos){
      return res.status(500).send("neki sjeb, nema cifre")
    }else{
      cijena = row.iznos
    }

    const SQLStripeClubId = `SELECT k.imeKlub AS username, stripeId FROM
          TRANSAKCIJA t JOIN JEDNOKRATNA_REZ jr
            ON t.transakcijaId = jr.transakcijaId
          JOIN REZERVACIJA r
            ON jr.rezervacijaID = r.rezervacijaID
          JOIN TERMIN_TJEDNI tt
            ON r.terminId = tt.terminID
          JOIN TEREN t
            ON tt.terenId = t.terenId
          JOIN KLUB k
            ON t.username = k.username
          WHERE t.transakcijaId = ?`
    row = await dbGet(db, SQLStripeClubId, [transakcijaID]) 
    if(!row || !row.stripeId){
      return res.status(500).send("neki sjeb, nema stripe id")
    }else{
      clubUsername = row.username
    }
   }catch(err){
    console.error(err);
    db.close();
    return res.status(500).send(err);
  }
  
  db.close();

  res.render("payment", {
      cijena: cijena,
      klub: clubUsername,
      transakcijaID: transakcijaID,
  })
})

router.get('/payment/checkout/:transakcijaID', async (req, res) => {
     const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  const { transakcijaID } = req.params

  try {
    // Verify user
    const isVerified = await verifyProfile(req, res);
    if (!isVerified) return res.render("verifymail");

    const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
   
    if(profileInDB !== "Player"){
      return res.status(500).send("samo igrači mogu nešto plaćati")
    }
  }catch(err){
    console.error(err);
    db.close()
    return res.status(500).send(err);
  }

  let cijena, clubStripeId;
  try{
    const SQLCijena = `SELECT iznos FROM TRANSAKCIJA WHERE transakcijaID = ?`
    let row = await dbGet(db, SQLCijena, [transakcijaID]);

    if(!row || !row.iznos){
      return res.status(500).send("neki sjeb, nema cifre")
    }else{
      cijena = row.iznos
    }

    const SQLStripeClubId = `SELECT stripeId FROM
          TRANSAKCIJA t JOIN JEDNOKRATNA_REZ jr
            ON t.transakcijaId = jr.transakcijaId
          JOIN REZERVACIJA r
            ON jr.rezervacijaID = r.rezervacijaID
          JOIN TERMIN_TJEDNI tt
            ON r.terminId = tt.terminID
          JOIN TEREN t
            ON tt.terenId = t.terenId
          JOIN KLUB k
            ON t.username = k.username
          WHERE t.transakcijaId = ?`
    row = await dbGet(db, SQLStripeClubId, [transakcijaID]) 
    if(!row || !row.stripeId){
      return res.status(500).send("neki sjeb, nema stripe id")
    }else{
      clubStripeId = row.stripeId
    }

    const SQLQuery = `SELECT tt.terenID FROM 
                    JEDNOKRATNA_REZ jr JOIN REZERVACIJA r
                      ON jr.rezervacijaID = r.rezervacijaID
                    JOIN TERMIN_TJEDNI tt
                      ON r.terminId = tt.terminID 
                    WHERE jr.transakcijaID = ?`
      row = await dbGet(db, SQLQuery, [transakcijaID])
      let terenID
      if(!row || !row.terenID){
        return res.status(500).send("neki sjeb, nema teren id")
      }else{
        terenID = row.terenID
      }
      if (!transakcijaID) {
          return res.status(404).send('Transakcija ne postoji');
      }

      const currentUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'eur',
                product_data: {
                    name: `Rezervacija #${transakcijaID}`,
                },
                unit_amount: cijena * 100,
            },
            quantity: 1,
        }],
        mode: 'payment',
         success_url: `${currentUrl}/terrain/${terenID}`,
        cancel_url: `${currentUrl}/payment/cancel`,
        metadata: {
              transakcijaID: transakcijaID, 
            },
        payment_intent_data: {
            transfer_data: {
                destination: clubStripeId, // OVDJE ide račun kluba
            },
        },
    });


      // redirect na Stripe checkout
      res.redirect(session.url);
    } catch (err) {
        console.error("STRIPE ERROR:");
        console.error(err.message);
        console.error(err);

        res.status(500).json({
          error: err.message,
        });
      }
 finally {
        db.close();
    }
});

async function updateRes(transakcijaID, stripePaymentId){
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  const dbRun = (sql, params = []) =>
      new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          if (err) reject(err);
          resolve(this);
        });
      });

    const dbGet = (sql, params = []) =>
      new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
      });
    try{
      await dbRun(
        `UPDATE TRANSAKCIJA SET statusPlac = ?, stripePaymentId = ?  WHERE transakcijaID = ?`,
        [StatusPlacanja.POTVRDJENO, stripePaymentId, transakcijaID]
      );

      const row = await dbGet(
        `SELECT rezervacijaID FROM JEDNOKRATNA_REZ WHERE transakcijaID = ?`,
        [transakcijaID]
      );

      if (!row || !row.rezervacijaID) {
        console.log("Rezervacija ne postoji");
      }

      await dbRun(
        `UPDATE REZERVACIJA SET statusRez = ? WHERE rezervacijaID = ?`,
        [StatusRezervacije.AKTIVNA, row.rezervacijaID]
      );

      return 200;
  } catch (err) {
    console.error(err);
    return 500;
  } finally {
    db.close();
  }
}

const webhookHandler = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send("Webhook Error");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const stripePaymentId = session.payment_intent;
    const transakcijaID = session.metadata.transakcijaID;

    const rez = await updateRes(transakcijaID, stripePaymentId);
    
  }

  res.json({ received: true });
};



router.get("/refund", (req, res) => {

})

module.exports = {
  router,
  webhookHandler,
};
