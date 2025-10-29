const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer();

const{ requiresAuth } = require('express-openid-connect')

const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");
const axios = require('axios')
const sqlite3 = require('sqlite3').verbose();


router.get('/:clubId/:terrainId', requiresAuth(), async (req, res) => {
        try{
                const isVerified = await verifyProfile(req);
                let profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
               

                if(!isVerified){
                        /* this view needs to be made */
                        res.render("verifymail")
                }else{
                        if(profileInDB === "Club" || profileInDB === "Admin"){
                                //a non-admin user is trying to alter another users info! 
                                if(req.params.clubId !== req.oidc.user.nickname && profileInDB !== "Admin"){
                                        res.status(500).send(`You cannot edit this users info. This is not your profile and you are not an admin!`)
                                }

                                const db = new sqlite3.Database("database.db");

                                const getRow = (sql, params) => new Promise((resolve, reject) => {
                                        db.get(sql, params, (err, row) => {
                                        if (err) return reject(err);
                                        resolve(row);
                                        });
                                });
                                const getPhotos = (sql, params) => new Promise((resolve, reject) => {
                                        db.all(sql, params, (err, row) => {
                                                if(err) return reject(err);
                                                resolve(row);
                                        })
                                });
                                const getColumns = (sql, params) => new Promise((resolve, reject) => {
                                        db.all(sql, params, (err, row) => {
                                                if(err) return reject(err);
                                                resolve(row);
                                        })
                                })
                                let SQLPhotoQuery = `SELECT fotoTerenID FROM foto_teren WHERE terenID = ?;`;
                                let SQLQuery = `SELECT * FROM teren WHERE terenID = ? AND username = ?;`;

                                let row;
                                try{
                                        row = await getRow(SQLQuery, [req.params.terrainId, req.params.clubId]);
                                }catch(err){
                                        console.error(err.message);
                                        if(res) res.status(500).send("Internal Server Error getting terrain info");
                                        db.close();
                                        return null;
                                }

                                let terrainPhotos;
                                try{
                                        terrainPhotos = await getPhotos(SQLPhotoQuery, [req.params.terrainId]);
                                        terrainPhotos = terrainPhotos.map(p => p.fotoTerenID)
                                }catch(err){
                                        console.error(err.message);
                                        if(res) res.status(500).send("Internal Server Error getting terrain images");
                                        db.close();
                                        return null;
                                }
                                
                                db.close();

                                if(req.params.terrainId === "newTerrain") {
                                   row = {
                                        username: req.params.clubId,
                                        terenID: "newTerrain"
                                        };
                                }

                                if(!row){
                                        res.status(500).send("No such terrain exists");
                                }else{
                                        res.render("editterrain", {
                                        username: req.oidc.user["https://yourapp.com/username"],
                                        profileType: profileInDB,
                                        ownerClub: req.params.clubId,
                                        terrainInfo: row,
                                        terrainPhotos : terrainPhotos
                                        })
                                }
                                 

                        }else{
                                res.status(500).send("You're not a club or an admin. You cannot edit any terrains!");
                        }
                }
        }catch(err){
                res.status(500).send("internal server error");
        }
});


router.post('/insertTerrainInfo', requiresAuth(), upload.array("slike"), async (req, res) => {
    let SQLQuery;
    if(req.body.terenId === "newTerrain"){
        SQLQuery = `INSERT INTO teren (tipPodloge, velicinaTeren, osvjetljenje, vanjskiUnutarnji, visinaStrop, cijenaTeren, imeTeren, username)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);`
    }else{
        SQLQuery = `UPDATE teren
                        SET     tipPodloge = ?,
                                velicinaTeren = ?,
                                osvjetljenje = ?,
                                vanjskiUnutarnji = ?,
                                visinaStrop = ?,
                                cijenaTeren = ?,
                                imeTeren = ?
                        WHERE 
                                terenId = ?;`;
    }
        
        const db = new sqlite3.Database("database.db");
        const runQuery = (sql, params) => new Promise((resolve, reject) => {
                db.run(sql, params, function(err) {
                        if (err) return reject(err);
                        resolve(this);
                });
        });
         try{
            if(req.body.terenId === "newTerrain"){
                await runQuery(SQLQuery, [req.body.tipPodloge, 
                                            req.body.velicinaTeren,
                                            req.body.osvjetljenje,
                                            req.body.vanjskiUnutarnji,
                                            req.body.visinaStrop,
                                            req.body.cijenaTeren,
                                            req.body.imeTeren,
                                            req.body.username]);
            }else{
                await runQuery(SQLQuery, [req.body.tipPodloge, 
                                            req.body.velicinaTeren,
                                            req.body.osvjetljenje,
                                            req.body.vanjskiUnutarnji,
                                            req.body.visinaStrop,
                                            req.body.cijenaTeren,
                                            req.body.imeTeren,
                                            req.body.terenId]);
            }
                
        }catch(err){
                console.error(err.message);
                res.status(500).send("Internal Server Error updating terrain info");
                db.close();
                return;
        }
        let terenId;
        if(req.body.terenId === "newTerrain"){
            //fetch last insert row id (to know where to add photos)
            SQLQuery = `SELECT last_insert_rowid() AS Id;`
            const getRow = (sql, params) => new Promise((resolve, reject) => {
                                        db.get(sql, params, (err, row) => {
                                        if (err) return reject(err);
                                        resolve(row);
                                        });
                                });
            try{
                const row = await getRow(SQLQuery);
                terenId = row.Id;
            }catch(err){
                console.error(err.message);
                if(res) res.status(500).send("Internal Server Error getting terenId of new terrain");
                db.close();
                return null;
            }
            
        }else{
            terenId = req.body.terenId;
        }

        //!!!!!!!!
        let SQLPhotoQuery = `INSERT INTO foto_teren (fotoTerenOpis, fotografija, mimeType, terenId)
                                VALUES ("", ?, ?, ?);`;
        for(const photo of req.files){
                try{
                await runQuery(SQLPhotoQuery, [photo.buffer, photo.mimetype, terenId]);
                }catch(err){
                        console.error(err.message);
                        res.status(500).send("Internal Server Error updating terrain photo info");
                        db.close();
                        return;
                }
        }
        
        let SQLRemovePhotos = `DELETE FROM foto_teren WHERE fotoTerenId = ?`;
        for(const photo of req.body.erasePhotos){
                try{
                        await runQuery(SQLRemovePhotos, [photo]);
                }catch(err){
                        console.error(err.message);
                        res.status(500).send("Internal Server Error removing terrain image");
                        db.close();
                        return;
                }
        }
        
        db.close();
        if(req.oidc.user.nickname === req.body.username){
                res.json({redirectURL: "/myprofile"});
        }else{
                res.json({redirectURL: "/"});
        }
});

router.get("/:clubId/photo/:photoId", async(req, res) => {
        let photo;
        const SQLQuery = `SELECT fotografija, mimeType FROM foto_teren WHERE fotoTerenId = ?`;

        const db = new sqlite3.Database("database.db");

        const getRow = (sql, params) => new Promise((resolve, reject) => {
                db.get(sql, params, (err, row) => {
                if (err) return reject(err);
                resolve(row);
                });
        });
        try{
                photo = await getRow(SQLQuery, [req.params.photoId]);
        }catch(err){
                console.error(err.message);
                if(res) res.status(500).send("Internal Server Error fetching photo");
                db.close();
                return null;
        }
        if(!photo){
                return res.status(404).send("image Not found");
        }

        res.set("Content-Type", photo.mimeType);
        res.send(photo.fotografija);

})

module.exports = router;