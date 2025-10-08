const express = require('express');

const router = express.Router()


router.get('/', (req, res) => {
    res.render('calendar');
});


module.exports = router;