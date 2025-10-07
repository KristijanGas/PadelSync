
const express = require('express');
const app = express();
const port = 3000;
app.use(express.static("public"));

const session = require('express-session')



app.set('views','./views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(express.json());

app.use(session({
    secret: 'verysecretyesyes', // used to sign the session ID cookie
    resave: false, // do not save the session if it's not modified
    // do not save new sessions that have not been modified
    saveUninitialized: false
}));

// Middleware to log session data
app.use((req, res, next) => {
    //console.log('Session id example :', req.session.id);


    // IMPLEMENTIRATI LOGGING U BAZU!!!! //



    next();
});


app.get('/', (req, res) => {
    res.redirect('/home');
});

// routes

const homeRouter = require('./routes/home.routes'); // pocetna stranica
//const profileRouter = require('./routes/profiles.routes');
//const kalendarRouter = require('./routes/kalendar.routes');

app.use('/home', homeRouter);
//app.use('/profiles', profileRouter);
//app.use('/kalendar', kalendarRouter);


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;