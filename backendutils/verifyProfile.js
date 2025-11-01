const{ requiresAuth } = require('express-openid-connect')
const axios = require('axios')
const sqlite3 = require('sqlite3').verbose();

async function requireFreshAccessToken(req){
    try {
        const token = req.oidc.accessToken;

        if (token?.isExpired()) {
        console.log("Access token expired, refreshing...");
        const refreshed = await token.refresh();

        console.log("Got new access token, valid for:", refreshed.expires_in);
        }else{
            console.log("Token already valid, expires in:", req.oidc.accessToken.expires_in);
        }
    } catch (err) {
        console.error("Failed to refresh access token:", err);
    }
}

async function verifyProfile(req){
    requireFreshAccessToken(req);
    let data = {};
    const {token_type, access_token} = req.oidc.accessToken;
    //console.log(req.oidc);
    
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
            //console.log(e); //ERROR DOES ACTUALLY HAPPEN HERE PLZ FIX
    }
    //console.log(data);
    return data.emailVerified;
}

//checks if profile is verified in our database
async function verifyDBProfile(username,email,res){
    let SQLQuery = "SELECT count(*) as cnt FROM korisnik WHERE username = ?;";
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    let userExists = 1;

    const getRow = (sql, params) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });

    try{
        const row = await getRow(SQLQuery, [username]);
        if (!row || row.cnt == 0) {
            userExists = 0;
        }
    }catch(err){
        console.error(err.message);
        if(res) res.status(500).send("Internal Server Error");
        db.close();
        return null;
    }
    //console.log("user existance: ",userExists);
    if(userExists === 0){
        await addUserToDB(username,email,res);
    }
    //user exists and now we check if he is a player or club
    let isPlayer = 0;
    let isAdmin = 0;
    let isClub = 0;
    SQLQuery = "SELECT count(*) as cnt FROM igrac WHERE username = ?;"
    row = await getRow(SQLQuery, [username]);
    if (row && row.cnt > 0) {
        isPlayer = 1;
    }
    SQLQuery = "SELECT count(*) as cnt FROM klub WHERE username = ?;"
    row = await getRow(SQLQuery, [username]);
    if (row && row.cnt > 0) {
        isClub = 1;
    }

    SQLQuery = "SELECT count(*) as cnt FROM admin WHERE username = ?;"
    row = await getRow(SQLQuery, [username]);
    if (row && row.cnt > 0) {
        isAdmin = 1;
    }
    db.close();
    //console.log(isPlayer,isClub,isAdmin);
    if(isPlayer + isClub + isAdmin > 1) return "CorruptedDB";
    if(isAdmin === 1) return "Admin";
    if(isPlayer === 0 && isClub === 0) return "UserDidntChoose";
    if(isPlayer === 1) return "Player";
    if(isClub === 1) return "Club";
}

async function findUserType(username){
    let SQLQuery = "SELECT count(*) as cnt FROM korisnik WHERE username = ?;";

    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    let userExists = 1;

    const getRow = (sql, params) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
    try{
        const row = await getRow(SQLQuery, [username]);
        if (!row || row.cnt == 0) {
            userExists = 0;
        }
    }catch(err){
        console.error(err.message);
        if(res) res.status(500).send("Internal Server Error");
        db.close();
        return null;
    }
    //console.log("user existance: ",userExists);
    if(userExists === 0){
        return "NoSuchUser";
    }
    //user exists and now we check if he is a player or club
    let isPlayer = 0;
    let isAdmin = 0;
    let isClub = 0;
    SQLQuery = "SELECT count(*) as cnt FROM igrac WHERE username = ?;"
    row = await getRow(SQLQuery, [username]);
    if (row && row.cnt > 0) {
        isPlayer = 1;
    }
    SQLQuery = "SELECT count(*) as cnt FROM klub WHERE username = ?;"
    row = await getRow(SQLQuery, [username]);
    if (row && row.cnt > 0) {
        isClub = 1;
    }

    SQLQuery = "SELECT count(*) as cnt FROM admin WHERE username = ?;"
    row = await getRow(SQLQuery, [username]);
    if (row && row.cnt > 0) {
        isAdmin = 1;
    }
    db.close();
    //console.log(isPlayer,isClub,isAdmin);
    if(isPlayer + isClub + isAdmin > 1) return "CorruptedDB";
    if(isAdmin === 1) return "Admin";
    if(isPlayer === 0 && isClub === 0) return "UserDidntChoose";
    if(isPlayer === 1) return "Player";
    if(isClub === 1) return "Club";
}

async function addUserToDB(username,email,res){
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    const SQLQuery = 'INSERT INTO korisnik (username,email,passwordHash) VALUES (?,?,?)';

    return new Promise((resolve, reject) => {
        db.run(SQLQuery, [username, email, 'zasadnista'], function(err) {
            if (err) {
                console.error('addUserToDB error:', err.message);
                if (res) res.status(500).send("Internal Server Error adding");
                db.close();
                return reject(err);
            }
            console.log(`A row has been inserted with rowid ${this.lastID}`);
            db.close();
            resolve(this.lastID);
        });
    });
}

module.exports = {verifyProfile, verifyDBProfile,addUserToDB, findUserType};