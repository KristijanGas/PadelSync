require('dotenv').config();
const express = require('express');
const Stripe = require("stripe");
let stripeSecretKey;
if(process.env.NODE_ENV === "test"){
  stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST
}else{
  stripeSecretKey = process.env.STRIPE_SECRET_KEY
}
let stripe = null;
if (stripeSecretKey) {
  try { stripe = new Stripe(stripeSecretKey); } catch (e) { console.error('Stripe init failed:', e.message); stripe = null; }
} else { stripe = null; }
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { verifyProfile, verifyDBProfile } = require("../backendutils/verifyProfile");
const { requiresAuth } = require('express-openid-connect');

const StatusRezervacije = require('../constants/statusRez');
const StatusPlacanja = require('../constants/statusPlacanja');
const nodemailer = require('nodemailer');
const SendmailTransport = require('nodemailer/lib/sendmail-transport');
const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'padelsynkovic@gmail.com',
    pass: process.env.ADMIN_PASSWORD
  }
});

const openDb = () =>
  new sqlite3.Database(process.env.DB_PATH || "database.db");

const dbRun = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this); // this.changes, this.lastID
    });
  });

const dbGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) =>
      err ? reject(err) : resolve(row)
    );
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

    const SQLTest = `SELECT pretpID FROM TRANSAKCIJA WHERE transakcijaID = ?`;
    row = await dbGet(db, SQLTest, [transakcijaID]);
    if(!row)
      return res.status(500).send("ne postoji transakcija s tim ID-om");
    else if (row.pretpID == null) {
      //jednokratna
      const SQLStripeClubId = `SELECT k.username, stripeId FROM
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
    } else {
      //ponavljajuca
      const ponSQL = `SELECT KLUB.username, stripeId
                      FROM TRANSAKCIJA NATURAL JOIN PRETPLATA NATURAL JOIN TIP_PRETPLATE JOIN KLUB ON
                      clubUsername = KLUB.username
                      WHERE transakcijaID = ?`;
      row = await dbGet(db, ponSQL, [transakcijaID]);
      if(!row || !row.stripeId){
        return res.status(500).send("neki sjeb, nema stripe id")
      }else{
        clubUsername = row.username;
      }
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

router.get('/payment/checkout/:transakcijaID', requiresAuth(), async (req, res) => {
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
    const SQLCijena = `SELECT iznos, nacinPlacanja, pretpID FROM TRANSAKCIJA WHERE transakcijaID = ?`
    let row = await dbGet(db, SQLCijena, [transakcijaID]);

    if(!row || !row.iznos || !row.nacinPlacanja){
      return res.status(500).send("neki sjeb, nema cifre")
    }else{
      if(row.nacinPlacanja != "kartica"){
        return res.status(500).send("nacin placanja nije kartica")
      }
      cijena = row.iznos
    }

    let clubUsername, clubEmail, reservationType;
    let datum, vPoc, vKr, terenID;
    if (row.pretpID == null) {
      //jednokratna
      reservationType = "jednokratna";
      const SQLStripeClubId = `SELECT stripeId, k.username as username FROM
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
        clubStripeId = row.stripeId;
        clubUsername = row.username;
      }
      const SQLQuery = `SELECT tt.terenID, jr.datumRez, tt.vrijemePocetak, tt.vrijemeKraj FROM 
                    JEDNOKRATNA_REZ jr JOIN REZERVACIJA r
                      ON jr.rezervacijaID = r.rezervacijaID
                    JOIN TERMIN_TJEDNI tt
                      ON r.terminId = tt.terminID 
                    WHERE jr.transakcijaID = ?`
      row = await dbGet(db, SQLQuery, [transakcijaID])
      if(!row || !row.terenID){
        return res.status(500).send("neki sjeb, nema teren id")
      }else{
        terenID = row.terenID;
        datum = row.datumRez;
        vPoc = row.vrijemePocetak;
        vKr = row.VrijemeKraj;
      }
    } else {
      //ponavljajuca
      reservationType = "ponavljajuca";
      const ponSQL = `SELECT KLUB.username, stripeId
                      FROM TRANSAKCIJA NATURAL JOIN PRETPLATA NATURAL JOIN TIP_PRETPLATE JOIN KLUB ON
                      clubUsername = KLUB.username
                      WHERE transakcijaID = ?`;
      row = await dbGet(db, ponSQL, [transakcijaID]);
      if(!row || !row.stripeId){
        return res.status(500).send("neki sjeb, nema stripe id")
      }else{
        clubUsername = row.username;
        clubStripeId = row.stripeId;
      }
    }

    const qry = `SELECT email FROM KORISNIK WHERE USERNAME = ?`;
    console.log(clubUsername);
    row = await dbGet(db, qry, [clubUsername]);
    if(!row || !row.email) {
      return res.status(500).send("ne znam");
    } else {
      clubEmail = row.email;
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
              igracUsername: req.oidc.user.nickname,
              igracMail: req.oidc.user.email,
              klubUsername: clubUsername,
              klubMail: clubEmail,
              datum: datum,
              vPoc: vPoc,
              vKr: vKr,
              resType: reservationType
            },
        payment_intent_data: {
            transfer_data: {
                destination: clubStripeId, // OVDJE ide račun kluba
            },
            metadata: {
              transakcijaID: String(transakcijaID),
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

async function updateRes(transakcijaID, stripePaymentId) {
  const db = openDb();
  try {
    await dbRun(
      db,
      `UPDATE TRANSAKCIJA
       SET statusPlac = ?, stripePaymentId = ?
       WHERE transakcijaID = ?`,
      [StatusPlacanja.POTVRDJENO, stripePaymentId, transakcijaID]
    );
    const SQLTest = `SELECT pretpID FROM TRANSAKCIJA WHERE transakcijaID = ?`;
    let row = await dbGet(db, SQLTest, [transakcijaID]);
    const pretpID = row?.pretpID;
    if(pretpID == null) {
      //jednokratna
      row = await dbGet(
      db,
      `SELECT jednokratnaID FROM JEDNOKRATNA_REZ WHERE transakcijaID = ?`,
      [transakcijaID]
      );

      if (!row) throw new Error("Rezervacija ne postoji");

      await dbRun(
        db,
        `UPDATE JEDNOKRATNA_REZ
        SET statusJednokratna = ?
        WHERE jednokratnaID = ?`,
        [StatusRezervacije.AKTIVNA, row.jednokratnaID]
      );
    } else {
      //ponavljajuca
      const qry = `SELECT pretpAktivna, date(pretpPlacenaDo, '+7 days') as future 
                  FROM PRETPLATA WHERE pretpID = ?`
      const result = await dbGet(db, qry, [pretpID]);
      if(result?.pretpAktivna == 1) {
        const upd = `UPDATE PRETPLATA SET pretpPlacenaDo = ? WHERE pretpID = ?`
        await dbRun(db, upd, [result.future, pretpID]);
      } else {
        await dbRun(db, `UPDATE PRETPLATA SET pretpAktivna = 1 WHERE pretpID = ?`, [pretpID]);
      }
    }

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
  let webhookSecret;
  if(process.env.NODE_ENV === "test"){
    webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST
  }else if(process.env.NODE_ENV === "development"){
    webhookSecret = process.env.STRIPE_WEBHOOK_SECTER_NGROK
  }else{
    webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  }
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send("Webhook Error");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const stripePaymentId = session.payment_intent;
    const transakcijaID = session.metadata.transakcijaID;
    const datum = session.metadata.datum;
    const vPoc = session.metadata.vPoc;
    const vKr = session.metadata.vKr;
    const igracUsername = session.metadata.igracUsername;
    /* let successOptionsClub = {
      from: 'padelsynkovic@gmail.com',
      to : clubEmail,
      subject: 'Uspješno plaćen termin',
      text: `Korisnik ${igracUsername} je uspješno platio rezervaciju za termin na datum ${datum}, od ${vPoc} do ${vKr}`
    } */
    const rez = await updateRes(transakcijaID, stripePaymentId);
    
  }else if (event.type === "charge.refunded") {
   const charge = event.data.object;

  const transakcijaID = charge.metadata.transakcijaID;

  if (!transakcijaID) {
    console.error("Nema transakcijaID u charge.metadata");
    return res.json({ received: true });
  }
  
  const db = openDb();
  try {
    const SQLTest = `SELECT pretpID FROM TRANSAKCIJA WHERE transakcijaID = ?`;
    let row = await dbGet(db, SQLTest, [transakcijaID]);
    const pretpID = row?.pretpID;
    await dbRun(
      db,
      `UPDATE TRANSAKCIJA
       SET statusPlac = ?
       WHERE transakcijaID = ?`,
      [StatusPlacanja.VRACENO, transakcijaID]
    );
    if(pretpID == null) {
      //jednokratna
      row = await dbGet(
        db,
        `SELECT jednokratnaID
        FROM JEDNOKRATNA_REZ
        WHERE transakcijaID = ?`,
        [transakcijaID]
      );

      console.log(row)
      if (row) {
        await dbRun(
          db,
          `UPDATE JEDNOKRATNA_REZ
          SET statusRez = ?
          WHERE jednokratnaID = ?`,
          [StatusRezervacije.OTKAZANA, row.jednokratnaID]
        );
      }
    } else {
      //ponavljajuca
      await dbRun(db, `UPDATE PRETPLATA SET pretpAktivna = 0 WHERE pretpID = ?`, [pretpID]);
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    db.close();
  }
}else if (event.type === "refund.failed") {
    const refund = event.data.object;
    const transakcijaID = refund.metadata.transakcijaID;
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    try{
      await dbRun(
        db,
        `UPDATE transakcija
        SET statusPlac = ?
        WHERE transakcijaID = ?`,
        [StatusPlacanja.POTVRDJENO, transakcijaID]
      );
    }catch(err){
      console.error(err);
    }finally{
      db.close();
    }
    
  }else if (event.type === "checkout.session.expired") {
    const session = event.data.object;

    const transakcijaID = session.metadata.transakcijaID;

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
        let row = await dbGet(
              `SELECT * FROM transakcija WHERE transakcijaID = ?`,
              [transakcijaID]
            );

          if (!row || !row.rezervacijaID) {
            console.log("Transakcija ne postoji");
            return 400;
          }
          const SQLTest = `SELECT pretpID FROM TRANSAKCIJA WHERE transakcijaID = ?`;
          row = await dbGet(db, SQLTest, [transakcijaID]);
          const pretpID = row?.pretpID;
          await dbRun(
            `UPDATE TRANSAKCIJA SET statusPlac = ? WHERE transakcijaID = ?`,
            [StatusPlacanja.OTKAZANO, transakcijaID]
          );
          if (pretpID == null) {
            //jednokratna
            row = await dbGet(
            db,
            `SELECT jednokratnaID
            FROM JEDNOKRATNA_REZ
            WHERE transakcijaID = ?`,
            [transakcijaID]
            );
            await dbRun(db,
            `UPDATE JEDNOKRATNA_REZ SET statusRez = ? WHERE jednokratnaID = ?`,
            [StatusRezervacije.OTKAZANA, row.jednokratnaID]);
          } else {
            //pon
            await dbRun(db, `UPDATE PRETPLATA SET pretpAktivna = 0 WHERE pretpID = ?`, [pretpID]);
          }
          
          return 200;
      } catch (err) {
        console.error(err);
        return 500;
      } finally {
        db.close();
      }
  }else if (event.type === "account.application.deauthorized") {

    let db;

    try {
      const stripeId = event.account;

      db = new sqlite3.Database(process.env.DB_PATH || "database.db");

      const dbRun = (sql, params = []) =>
        new Promise((resolve, reject) => {
          db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
          });
        });

      const SQLQuery = `UPDATE KLUB SET stripeID = NULL WHERE stripeID = ?`;
      await dbRun(SQLQuery, [stripeId]);

    } catch (err) {
      console.error("Webhook error:", err);
    } finally {
      if (db) db.close();
    }
  }
  res.json({ received: true });
};



router.get("/refund/:transakcijaID", requiresAuth(), async (req, res) => {
  const { transakcijaID } = req.params;
  const db = openDb();

  try {
    const isVerified = await verifyProfile(req, res);
    if (!isVerified) return res.render("verifymail");

    const role = await verifyDBProfile(
      req.oidc.user.nickname,
      req.oidc.user.email,
      res
    );

    if (role !== "Player")
      return res.status(403).send("Samo igrači mogu dobiti povrat");

    const row = await dbGet(
      db,
      `SELECT * FROM TRANSAKCIJA WHERE transakcijaID = ?`,
      [transakcijaID]
    );

    if (!row) return res.status(404).send("Transakcija ne postoji");

    if (row.nacinPlacanja !== "kartica")
      return res.status(400).send("Samo kartične transakcije");

    if (row.statusPlac !== StatusPlacanja.POTVRDJENO)
      return res.status(400).send("Refund nije dozvoljen");

    const result = await dbRun(
      db,
      `UPDATE TRANSAKCIJA
       SET statusPlac = ?
       WHERE transakcijaID = ?
       AND statusPlac = ?`,
      [StatusPlacanja.REFUND_U_TOKU, transakcijaID, StatusPlacanja.POTVRDJENO]
    );

    if (result.changes === 0)
      return res.status(400).send("Refund je već u tijeku");

    const povrat = row.iznos;
    await stripe.refunds.create(
      {
        payment_intent: row.stripePaymentID, 
        amount: povrat * 100 - 60 
      },
      {
        idempotencyKey: `refund_${transakcijaID}`,
      }
    );

    res.redirect("/myprofile");
  } catch (err) {
    console.error(err);

    await dbRun(
      db,
      `UPDATE TRANSAKCIJA
       SET statusPlac = ?
       WHERE transakcijaID = ?`,
      [StatusPlacanja.POTVRDJENO, transakcijaID]
    );

    res.status(500).send("Greška kod refunda");
  } finally {
    db.close();
  }
  res.redirect("/myprofile")
});



module.exports = {
  router,
  webhookHandler,
};
