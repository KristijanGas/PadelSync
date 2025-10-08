const express = require('express');

const router = express.Router()

// podstranica za pretraživanje klubova, igrača

router.get('/', (req, res) => {
    res.render('terrain');
});


module.exports = router;