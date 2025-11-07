
const express = require('express');
const app = express();
const port = 3000;
app.use(express.static("public"));
require("dotenv").config();

const session = require('express-session')
const { auth } = require('express-openid-connect');

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASEURL,
  clientID: process.env.CLIENTID,
  issuerBaseURL: process.env.ISSUER,
  clientSecret: process.env.CLIENTSECRET,
  authorizationParams: {
    response_type: 'code',
    audience: 'https://www.padelsync-api.com',
    scope: 'openid profile email username offline_access'
  }
};

app.set('views','./views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

//place auth0 middleware here
app.use(auth(config));

app.get('/login/google', (req, res) => {
  res.redirect('/login?connection=google-oauth2');
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

app.get('/react', (req, res) => {
  res.redirect('http://localhost:8080');
});

/* const registrationRouter = require('./routes/registration.routes');
const loginRouter = require('./routes/login.routes');
app.use('/login', loginRouter);
app.use('/registration', registrationRouter); */

const calendarRouter = require('./routes/calendar.routes');
app.use('/calendar', calendarRouter);

const edituserRouter = require('./routes/edituser.routes');
app.use('/edituser', edituserRouter);

const editterrainRouter = require('./routes/editterrain.routes');
app.use('/editterrain', editterrainRouter);

const myprofileRouter = require('./routes/myprofile.routes');
app.use('/myprofile', myprofileRouter);

const editscheduleRouter = require('./routes/editschedule.routes');
app.use('/editschedule', editscheduleRouter);

app.use('/signup', (req, res) => {
  if(!req.oidc.isAuthenticated()){
     res.oidc.login({
    authorizationParams: {
      screen_hint: 'signup offline_access'
    }
  })
  }else{
    res.redirect("/");
  }
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;