const express = require('express');
var sqlite3 = require('sqlite3').verbose();
const verifyInputText = require('../backendutils/verifyInputText');
const router = express.Router();
// podstranica za pretraživanje klubova, igrača


router.get('/', (req, res) => {
    res.render('terrain_search');
});

async function searchTerrains(criteria) {
    //console.log("Search criteria received:", criteria);
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    let SQLQuery = 'SELECT * FROM TEREN WHERE 1=1';
    //[ NEEDS WORK ]
    if (criteria.username) {
        SQLQuery += ` AND lower(username) LIKE \"%${criteria.username.toLowerCase()}%\"`;
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
    let { username, visinaStropa, tipTeren, cijena, osvjetljenje, tipPodloge } = req.query;

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

    const results = await searchTerrains({ username, visinaStropa, tipTeren, cijena, osvjetljenje, tipPodloge, unutarnjiVanjski });
    res.render('terrain_search', {
        results: results,
        searchParams: req.query
    });
});




module.exports = router;