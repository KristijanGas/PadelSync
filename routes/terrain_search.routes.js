const express = require('express');
var sqlite3 = require('sqlite3').verbose();
const {verifyInputText} = require('../backendutils/verifyInputText');
const { fetchAddresses } = require("../backendutils/mapbox");
const router = express.Router();
// podstranica za pretraživanje klubova, igrača


router.get('/', (req, res) => {
    res.render('terrain_search', {
        isAuthenticated: req.oidc.isAuthenticated(),
        user: req.oidc.user,
        session: req.session,
        oidcWhole: req.oidc,
        show_search_results: false
    });
});

async function searchTerrains(criteria) {
    //console.log("Search criteria received:", criteria);
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    let SQLQuery = 'SELECT * FROM TEREN WHERE 1=1';
    //[ NEEDS WORK ]
    if (criteria.username) {
        SQLQuery += ` AND (lower(username) LIKE \"%${criteria.username.toLowerCase()}%\"`;
        SQLQuery += ` OR lower(teren.imeTeren) LIKE \"%${criteria.username.toLowerCase()}%\")`;
    }
    if (criteria.visinaStropa) {
        SQLQuery += ` AND (visinaStrop >= ${criteria.visinaStropa} OR visinaStrop IS NULL)`;
    }
    if(criteria.unutarnjiVanjski === undefined || criteria.unutarnjiVanjski.length === 0) {
        criteria.unutarnjiVanjski = [];
    }
    for (let i = 0; i < criteria.unutarnjiVanjski.length; i++) {
        const element = criteria.unutarnjiVanjski[i];
        if (i === 0) {
            SQLQuery += ' AND (';
        }
        if( i == criteria.unutarnjiVanjski.length - 1 ){
            SQLQuery += `(vanjskiUnutarnji = "${element}"))`;
            break;
        }
        //console.log("Criteria unutarnjiVanjski:", criteria);
        SQLQuery += `(vanjskiUnutarnji = "${element}") OR `;
    }
    //console.log("Criteria tipTeren:", criteria);
    if (criteria.tipTeren === undefined || criteria.tipTeren.length === 0) {
        criteria.tipTeren = [];
    }
    for (let i = 0; i < criteria.tipTeren.length; i++) {
        const element = criteria.tipTeren[i];
        if (i === 0) {
            SQLQuery += ' AND (';
        }
        if( i == criteria.tipTeren.length - 1 ){
            SQLQuery += ` (velicinaTeren = "${element}"))`;
            break;
        }
        SQLQuery += ` (velicinaTeren = "${element}") OR `;
    }
    if (criteria.cijena) {
        SQLQuery += ` AND cijenaTeren <= ${criteria.cijena}`;
    }
    if (criteria.osvjetljenje) {
        if(criteria.osvjetljenje === 'yes'){
            SQLQuery += ` AND osvjetljenje = 1`;
        }
    }
    if (criteria.tipPodloge === undefined || criteria.tipPodloge.length === 0) {
        criteria.tipPodloge = [];
    }
    for (let i = 0; i < criteria.tipPodloge.length; i++) {
        if (i === 0) {
            SQLQuery += ' AND (';
        }
        SQLQuery += ` tipPodloge = "${criteria.tipPodloge[i]}"`;
        if (i !== criteria.tipPodloge.length - 1) {
            SQLQuery += ' OR';
        } else {
            SQLQuery += ')';
        }
    }
    SQLQuery += ' ORDER BY cijenaTeren ASC';
    SQLQuery += ';';
    // console.log("Constructed SQL Query:", SQLQuery);
    return new Promise((resolve, reject) => {
        db.all(SQLQuery, [], (err, rows) => {
            if (err) {
                console.error(err.message);
                reject("Internal Server Error");
                return;
            }
            //console.log("Search results:", rows);
            resolve(rows);
        });
    });
    db.close();

};

// Search results route
router.get('/results', async (req, res) => {
    // Extract and parse array fields
    let { username, visinaStropa, tipTeren, cijena, osvjetljenje, tipPodloge, udaljenost } = req.query;

    tipTeren = req.query['tipTeren[]'];
    tipPodloge = req.query['tipPodloge[]'];
    unutarnjiVanjski = req.query['unutarnjiVanjski[]'];

    // Adjust tipPodloge based on unutarnjiVanjski selection
    if (typeof unutarnjiVanjski === 'string') {
        unutarnjiVanjski = [unutarnjiVanjski];
    }
    if (typeof tipTeren === 'string') {
        tipTeren = [tipTeren];
    }
    if (typeof tipPodloge === 'string') {
        tipPodloge = [tipPodloge];
    }

    // Validate string parameters
    if (username) {
        valid = verifyInputText(username);
        if (!valid) {
            return res.status(400).send('Invalid input for username');
        }
    }

    if (osvjetljenje) {
        valid = verifyInputText(osvjetljenje);
        if (!valid) {
            return res.status(400).send('Invalid input for osvjetljenje');
        }
    }

    // visinaStropa and cijena are numbers, skip unless you want to check them as strings
    // Validate array parameters
    if (Array.isArray(tipTeren)) {
        tipTeren.forEach(val => {
            valid = verifyInputText(val);
            if (!valid) {
                return res.status(400).send('Invalid input for tipTeren');
            }
        });
    }
    if (Array.isArray(tipPodloge)) {
        tipPodloge.forEach(val => {
            valid = verifyInputText(val);
            if (!valid) {
                return res.status(400).send('Invalid input for tipPodloge');
            }
        });
    }

    if(udaljenost && udaljenost < 0.2){
        return res.status(400).send('Invalid input for distance');
    }

    const results = await searchTerrains({ username, visinaStropa, tipTeren, cijena, osvjetljenje, tipPodloge, unutarnjiVanjski });

    if(udaljenost){
        const userLat = parseFloat(req.query.userLat);
        const userLong = parseFloat(req.query.userLong);
        const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
        const getRow = (sql, params) => new Promise((resolve, reject) => {
                                            db.get(sql, params, (err, row) => {
                                            if (err) return reject(err);
                                            resolve(row);
                                            });
                                    });
        if (!isNaN(userLat) && !isNaN(userLong)) {
            const SQLQuery = `SELECT adresaKlub AS adresa 
                                FROM teren JOIN klub
                                    ON teren.username = klub.username
                                WHERE teren.terenId = ?`;
            for (const teren of results) {
                try {
                    let clubLat, clubLong;
                    const row = await getRow(SQLQuery, [teren.terenID]);
                    if(!row){
                        console.log('nema tog terena')
                    }const koordinateRes = await fetchAddresses(row.adresa);

                    if (!koordinateRes || !Array.isArray(koordinateRes.features) || koordinateRes.features.length === 0) {
                        console.log("neispravna adresa");
                    } else {
                        const adresaUnesena = row.adresa.trim().toLowerCase();
                        const featureFound = koordinateRes.features.find(
                            feature => feature.place_name.toLowerCase() === adresaUnesena
                        );

                        if (!featureFound) {
                            console.log("'neispravna adresa'");
                        } else {
                            [clubLong, clubLat] = featureFound.center;
                            teren.udaljenost = getDistanceFromLatLonInKm(userLat, userLong, clubLat, clubLong);
                        }
                    }
                } catch(err) {
                    console.log(err);
                }
            }
        }else{
            return res.status(500).send("neispravne koordinate ili niste dali dopuštenje")
        }
        db.close();
    }

    let filteredTerreni;
    if(udaljenost){
        filteredTerreni = results.filter(teren => teren.udaljenost && teren.udaljenost < udaljenost);
    }else{
        filteredTerreni = results;
    }
    


    res.render('terrain_search', {
        isAuthenticated: req.oidc.isAuthenticated(),
        user: req.oidc.user,
        session: req.session,
        oidcWhole: req.oidc,
        show_search_results: true,
        results: filteredTerreni,
        searchParams: req.query
    });
});


function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


module.exports = router;