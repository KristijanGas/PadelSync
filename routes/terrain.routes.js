const express = require('express');
var sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");

const { requiresAuth } = require('express-openid-connect')
const axios = require('axios');
const { checkAvailability } = require('../backendutils/checkAvailability');
const { verifyInputText } = require("../backendutils/verifyInputText");
const nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'padelsynkovic@gmail.com',
    pass: 'padelsync'
  }
});

const StatusRezervacije = require('../constants/statusRez');
const StatusPlacanja = require('../constants/statusPlacanja');
const { sendNotificationFromTemplate } = require('../socket');

// podstranica za pretraživanje klubova, igrača
const fetchAll = async (db, sql, params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

const dbGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  })

//offset je int koju koristim da predam dayofweek, dakle da mogu normalizirati koji je datum
//da bi lakse provjerio dostupnost termina
//za obicnu currentDate
function currentDateOff(offset) {
  var date = new Date(Date.now());
  var newDate = new Date(date);
  newDate.setDate(newDate.getDate()-date.getDay()+offset);
  let year = newDate.getFullYear().toString();
  let month = (newDate.getMonth()+1).toString();
  if(month.length == 1)
    month = "0" + month;
  let day = newDate.getDate().toString();
  if(day.length == 1)
    day = "0" + day;
  return year + '-' + month + '-' + day;
}
function dateForReact(offset) {
  var date = new Date(Date.now());
  var newDate = new Date(date);
  newDate.setDate(newDate.getDate()-date.getDay()+offset);
  let year = newDate.getFullYear().toString();
  let month = (newDate.getMonth()).toString();
  let day = newDate.getDate().toString();
  return year + '-' + month + '-' + day;
}

router.get('/:id', async (req, res) => {
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  const id = req.params.id;
  let tereni, termini, termini2, clubUsername;
  let tereniQuery = 'SELECT * FROM teren WHERE terenID = ?';
  let cardAllowed;
  try {
      tereni = await fetchAll(db, tereniQuery, [id]);
  } catch (error) {
      console.error(error);
  }
  clubUsername = tereni[0].username;
  /*
  const isVerified = await verifyProfile(req, res);
  if (isVerified) {
    
  } else {
    res.status(401).send("Moraš bit ulogiran u stranicu da bi gledao termine");
  }
    */
  //termini koje cu prikazat za trenutni tjedan
  let terminiQuery = `SELECT * FROM TERMIN_TJEDNI WHERE terenID = ?
                      AND danTjedan > (select strftime('%w', date('now'))) AND tipTermina = 'jednokratni'`;
  //i za 3 naredna tjedna
  let terminiQuery2 = `SELECT * FROM TERMIN_TJEDNI WHERE terenID = ? AND tipTermina = 'jednokratni'`;
  try {
      termini = await fetchAll(db, terminiQuery, [id]);
      termini2 = await fetchAll(db, terminiQuery2, [id]);
  } catch (err) {
      console.error(err);
  }

  //provjera dostupnosti
  let dostupniTermini = [];
  for (let termin of termini) {
    let dejtOwO = currentDateOff(termin.danTjedan);
    if(await checkAvailability(termin.terenID, dejtOwO, termin.vrijemePocetak, termin.vrijemeKraj)) {
      const kopija = structuredClone(termin);
      kopija.datum = dejtOwO;
      kopija.klub = clubUsername;
      dostupniTermini.push(kopija);
    }
  }
  for(let i = 1; i < 4; i++) {
    for(let termin of termini2) {
      let dejtOwO = currentDateOff(termin.danTjedan+i*7);
      if(await checkAvailability(termin.terenID, dejtOwO, termin.vrijemePocetak, termin.vrijemeKraj)) {
        const kopija = structuredClone(termin);
        kopija.datum = dejtOwO;
        kopija.klub = clubUsername;
        dostupniTermini.push(kopija);
      } else {
        //nista
      }
    }
  }
  const pretpQuery = `select rezervacijaID, terminID, tipPretpID, terenID, danTjedan,
                     vrijemePocetak, vrijemeKraj from rezervacija natural join PONAVLJAJUCA_REZ
                     natural join TERMIN_TJEDNI natural join TIP_PRETPLATE 
                     WHERE clubUsername = ? and pretpDostupnost = 1
                     and tipPretpID not in (select tipPretpID from pretplata where pretpAktivna = 1)`;
  const pretplateQuery = `select * from tip_pretplate where clubUsername = ?
                    and tipPretpID not in (select tipPretpID from pretplata where pretpAktivna = 1)`
  const tipoviPretplate = await fetchAll(db, pretpQuery, [clubUsername]);
  let pretplate = await fetchAll(db, pretplateQuery, [clubUsername]);
  for (let pretplata of pretplate) {
    if(typeof pretplata.termini === 'undefined') pretplata.termini = [];
    for(let entry of tipoviPretplate) {
      if(entry.tipPretpID == pretplata.tipPretpID) {
        pretplata.termini.push(entry);
      }
    }
  }
  
  let row = await dbGet(db, "SELECT stripeId FROM klub WHERE username = ?", [clubUsername]);
  let stripeId = row?.stripeId;

  if (!stripeId) {
    cardAllowed = false;
  }else{
    cardAllowed = true;
  }
  let addComment = false;
  if(req.oidc){
    let userType;
      if(!req.oidc.isAuthenticated()){
        userType = "UserDidntChoose";
      }
      else{
        userType = await findUserType(req.oidc.user.nickname);
      }
      if(userType == "Player"){

        
          const SQLCommentQuerry = `SELECT EXISTS (
              SELECT jr.datumRez
              FROM JEDNOKRATNA_REZ jr
              JOIN REZERVACIJA r ON r.rezervacijaID = jr.rezervacijaID
              JOIN TERMIN_TJEDNI tt ON tt.terminID = r.terminID
              WHERE jr.username = ?
              AND tt.terenId = ?
              AND r.statusRez = ?
              AND jr.datumRez < DATE('now')
                
          ) AS hadRez ;`
          const hadPrevRez = await dbGet(
              db,
              SQLCommentQuerry,
              [req.oidc.user.nickname, id, StatusRezervacije.AKTIVNA],
          );
          if(hadPrevRez.hadRez)
              addComment = true;

          const SQLCommentQuerry1 = `SELECT EXISTS(SELECT 1 FROM
                                    recenzija r
                                    WHERE username = ?
                                    AND terenID = ?) AS hadComment`
        const hadPrevComment = await dbGet(
            db,
            SQLCommentQuerry1,
            [req.oidc.user.nickname, id]
        )
        if(hadPrevComment.hadComment){
          addComment = false;
        }
      }
  }
  db.close();
  res.render('terrain', {
          teren: tereni[0],
          jednokratniTermini: dostupniTermini,
          pretplate: pretplate,
          cardAllowed,
          addComment: addComment

      });
});

router.post('/:id', requiresAuth(), async (req, res) => {
  try {
    // Verify user
    const isVerified = await verifyProfile(req, res);
    if (!isVerified) return res.render("verifymail");

    const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
    if(profileInDB !== "Player"){
      return res.status(500).send("samo igrači mogu rezervirat termin")
    }
  }catch(err){
    console.error(err);
    db.close();
    return res.status(500).send("nešto se zbilo");
  }
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  const tipTermina = req.body.tipTermina;
  let tipPlacanja, transakcijaID;
  if(tipTermina == 'jednokratni') {
    tipPlacanja = req.body.tipPlacanja;
    const termin = req.body.termin;
    const teren = req.body.teren;
    const terminID = req.params.id;
    const datum = termin.datum;
    const username = req.oidc.user.nickname;
    let statusPlac;
    let ID;

    //check availability
    try{
      const res = await checkAvailability(teren.terenID, datum, termin.vrijemePocetak, termin.vrijemeKraj);
      if(!res){
        return res.status(500).send("error, termin vec zauzet");
      }
    }catch(err){
      db.close();
      console.error(err);
      return res.status(500).send("error checking availability");
    }
    let statusRez;
    if(tipPlacanja==="gotovina"){
      statusRez = StatusRezervacije.PENDING
      statusPlac = StatusPlacanja.NEPLACENO
    }else{
      statusRez = StatusRezervacije.PENDING
      statusPlac = StatusPlacanja.PENDING
    }

    const SQLQuery1 = `INSERT INTO REZERVACIJA (statusRez, terminID) VALUES (?, ?) RETURNING *`
    await new Promise((resolve, reject) => {
      db.get(SQLQuery1, [statusRez, terminID], function(err, row) {
        if (err) {
          console.error(err.message);
          return reject(err);
        }
        resolve();
        ID = row.rezervacijaID;
      });
    });

    const currentDateUTC = new Date().toISOString().split('T')[0];
    const cijena = teren.cijenaTeren;

    const SQLTransaction = `INSERT INTO TRANSAKCIJA(iznos, statusPlac, nacinPlacanja, datumPlacanja, pretpID, stripePaymentId)
                            VALUES (?, ?, ?, ?, null, null)`
    transakcijaID = await new Promise((resolve, reject) => {
    db.run(SQLTransaction, [cijena, statusPlac, tipPlacanja, currentDateUTC], function(err) {
      if (err) {
        console.error(err.message);
        return reject(err);
      }
      resolve(this.lastID);
        });
    });

    const SQLQuery2 = `INSERT INTO JEDNOKRATNA_REZ (datumRez, rezervacijaID, username, transakcijaID) VALUES (?, ?, ?, ?)`;
    await new Promise((resolve, reject) => {
    db.run(SQLQuery2, [datum, ID, username, transakcijaID], function(err) {
      if (err) {
        console.error(err.message);
        return reject(err);
      }
      resolve();
      });
    });

    const currentUrl = `${req.protocol}://${req.get('host')}`;
    if(tipPlacanja==="gotovina"){
       res.json({redirect : `${currentUrl}/terrain/${teren.terenID}`});
    }else{
      const url = req.protocol + "://" + req.headers.host;
      res.json({checkoutUrl : `${url}/stripe/payment`, transakcijaID});
    }

  }else if(tipTermina == 'ponavljajuci') {
    //OVDJE SE REQ.PARAMS.ID INTERPRETIRA KAO tipPretpID, a ne TERMIN ID!!
    tipPlacanja = "kartica"
    let statusPlac = StatusPlacanja.PENDING;
    const currentDateUTC = new Date().toISOString().split('T')[0];
    const cijena = req.body.pretplata.pretpCijena;
    
    let futureDate = new Date();
    futureDate.setDate(futureDate.getDate()+30);
    let result = futureDate.toISOString().split('T')[0];
    
    const availabilityQuery = `SELECT * FROM PRETPLATA WHERE pretpAktivna = 1 AND tipPretpID = ?`;
    let row = await fetchAll(db, availabilityQuery, [req.params.id]);
    if(row.length > 0) {
      res.status(500).send("Netko je prije vas rezervirao istu pretplatu");
      return;
    }

    const availabilityQuery2 = `SELECT pretpID FROM PRETPLATA NATURAL JOIN TIP_PRETPLATE
                                WHERE username = ? AND pretpPocetak = ?
                                AND clubUsername = ?`;
    row = await dbGet(db, availabilityQuery2, [req.oidc.user.nickname, currentDateUTC, req.body.pretplata.clubUsername]);
    if(row.pretpID) {
      res.status(500).send("danas ste već probali rezervirati i niste uspjeli");
    }
    let pretpID;
    const query = `INSERT INTO PRETPLATA(pretpPocetak, pretpKraj, pretpPlacenaDo, pretpAktivna, tipPretpID, username)
                    VALUES(?, null, ?, ?, ?, ?) RETURNING pretpID`;
    await new Promise((resolve, reject) => {
      db.get(query, [currentDateUTC, result, 0, req.params.id, req.oidc.user.nickname], function (err, row) {
        if(err) {
          return reject(err);
        }
        resolve();
        pretpID = row.pretpID;
      });
    });

    const SQLTransaction = `INSERT INTO TRANSAKCIJA(iznos, statusPlac, nacinPlacanja, datumPlacanja, pretpID, stripePaymentId)
                            VALUES (?, ?, ?, ?, ?, null)`
    transakcijaID = await new Promise((resolve, reject) => {
    db.run(SQLTransaction, [cijena, statusPlac, tipPlacanja, currentDateUTC, pretpID], function(err) {
      if (err) {
        console.error(err.message);
        return reject(err);
      }
      resolve(this.lastID);
        });
    });
    const url = req.protocol + "://" + req.headers.host;
    res.json({checkoutUrl : `${url}/stripe/payment`, transakcijaID});
  } else {
    res.status(500).send("Zasto saljes post zahtjev s nevaljajucim parametrom?");
  }
  db.close();
  
});

router.get("/cancel/:rezervacijaID", requiresAuth(), async (req, res) => {
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  try {
    // Verify user
    const isVerified = await verifyProfile(req, res);
    if (!isVerified) return res.render("verifymail");

    const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
   
    if(profileInDB !== "Player"){
      return res.status(500).send("samo igrači mogu otkazivati rezervacije")
    }
  }catch(err){
    console.error(err);
    db.close();
    return res.status(500).send(err);
  }

  const { rezervacijaID } = req.params;
  try{
    let SQLQuery = `SELECT * FROM JEDNOKRATNA_REZ jr WHERE jr.username = ? AND jr.rezervacijaID = ?`;
    let row = await dbGet(db, SQLQuery, [req.oidc.user.nickname, rezervacijaID])
    if(!row){
      return res.status(500).send("ne možete otkazati tuđu rezervaciju")
    }

    SQLQuery = `SELECT statusRez FROM JEDNOKRATNA_REZ jr JOIN REZERVACIJA r ON 
                jr.rezervacijaID = r.rezervacijaID
                WHERE r.rezervacijaID = ?
                AND jr.datumRez > date('now', '+1 day');`
    row = await dbGet(db, SQLQuery, [rezervacijaID])
    if(!row){
      return res.status(500).send("rezervacije se mogu otkazati samo dan unaprijed")
    }else if(row.statusRez != StatusRezervacije.AKTIVNA && row.statusRez != StatusRezervacije.PENDING){
      return res.status(500).send("ne možete otkazati neaktivnu rezervaciju")
    }

    SQLQuery = `SELECT * FROM JEDNOKRATNA_REZ jr JOIN TRANSAKCIJA t
                ON jr.transakcijaID = t.transakcijaID
                WHERE jr.rezervacijaID = ?`;
    const row2 = await dbGet(db, SQLQuery, [rezervacijaID]);
    if(!row2 || !row2.transakcijaID){
      return res.status(500).send("nema te transakcije!")
    }
    if(row2.nacinPlacanja === "kartica" && row2.statusPlac == StatusPlacanja.POTVRDJENO){
      //treba izvrsiti povrat
      db.close();
      return res.redirect(`/stripe/refund/${row2.transakcijaID}`);
    }

    if(row2.nacinPlacanja === "gotovina"){
       SQLQuery = `UPDATE rezervacija SET statusRez = ? WHERE rezervacijaID = ?`
      const runQuery = (sql, params) => new Promise((resolve, reject) => {
                                                  db.run(sql, params, function(err) {
                                                          if (err) return reject(err);
                                                          resolve(this);
                                                  });
                                          });
      
      await runQuery(SQLQuery, [StatusRezervacije.OTKAZANA, rezervacijaID])
      
      
    }
    //treba provjeriti način plaćanja
  }catch(err){
    console.error(err);
    return res.status(500).send("error canceling reservation")
  }
  db.close();
  res.redirect("/myprofile");
})

router.post("/:terenID/addComment", requiresAuth(), async (req, res) => {
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  try {
    // Verify user
    const isVerified = await verifyProfile(req, res);
    if (!isVerified) return res.render("verifymail");

    const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
   
    if(profileInDB !== "Player"){
      return res.status(500).send("samo igrači mogu ostavljati komentare")
    }
  }catch(err){
    console.error(err);
    db.close();
    return res.status(500).send(err);
  }

  
  const runQuery = (sql, params) => new Promise((resolve, reject) => {
                db.run(sql, params, function(err) {
                        if (err) return reject(err);
                        resolve(this);
                });
        });
  const ocjena = Number(req.body.ocjena)
  
  const errors = [];
  if(!ocjena || ocjena < 1 || ocjena > 5){
    errors.push("Ocjena mora biti cijeli broj između 1 i 5")
  }

  if(!req.body.komentar || !verifyInputText(req.body.komentar)){
    errors.push("Komentar ne smije biti prazan i ne smije sadržavati specijalne znakove")
  }

  if(errors.length > 0){
    return res.status(400).json({ errors })
  }
  SQLQuery = `INSERT INTO recenzija(komentar, ocjena, datumRecenzija, username, terenID)
              VALUES (?, ?, ?, ?, ?)`
  const currentDateUTC = new Date().toISOString().split('T')[0];
  try{
    //treba rijesiti datum i provjera tipova!
          await runQuery(SQLQuery, [req.body.komentar,
                                    req.body.ocjena,
                                    currentDateUTC,
                                    req.oidc.user.nickname,
                                    req.params.terenID]);
  }catch(err){
          console.error(err.message);
          db.close();
          return res.status(500).send("Internal Server Error adding comment");
  }
  db.close();
  res.status(200).json({redirect : `/terrain/${req.params.terenID}`})
});

router.get("/:terenID/matches", async (req, res) => {
  const id = req.params.terenID;
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  const terminiQuery = 'SELECT * FROM TERMIN_TJEDNI WHERE terenID = ? ORDER BY danTjedan asc';
  let termini;
  try {
    termini = await fetchAll(db, terminiQuery, [id]);
  } catch (error) {
    console.error(error);
  }
  db.close();
  for (let termin of termini) {
    const dejtOwO = dateForReact(termin.danTjedan);
    termin.date = dejtOwO;
  }
  res.json(termini);
});

module.exports = router;