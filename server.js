
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
const userRouter = require('./routes/user.routes');
const user_searchRouter = require('./routes/user_search.routes');
const terrainRouter = require('./routes/terrain.routes');
const terrain_searchRouter = require('./routes/terrain_search.routes');
app.use('/home', homeRouter);
app.use('/user_search', user_searchRouter);
app.use('/user', userRouter);
app.use('/terrain_search', terrain_searchRouter);
app.use('/terrain', terrainRouter);

const registrationRouter = require('./routes/registration.routes');
const loginRouter = require('./routes/login.routes');
app.use('/login', loginRouter);
app.use('/registration', registrationRouter);

const calendarRouter = require('./routes/calendar.routes');
app.use('/calendar', calendarRouter);

const adminloginRouter = require('./routes/adminlogin.routes');
app.use('/adminlogin', adminloginRouter);

const adminRouter = require('./routes/adminlogin.routes');
app.use('/admin', adminRouter);

const edituserRouter = require('./routes/edituser.routes');
app.use('/edituser', edituserRouter);

const editterrainRouter = require('./routes/editterrain.routes');
app.use('/editterrain', editterrainRouter);

// start server


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;