
const express = require('express');
const { Server } = require('socket.io')
const app = express();
const port = 3000;
app.use(express.static("public"));
require("dotenv").config();
const http = require("http");
const sharedSession = require("express-socket.io-session");


const session = require('express-session')
const { auth } = require('express-openid-connect');
const path = require("path");
const {checkPayments, checkPonavljajuce} = require('./backendutils/periodic');
const cors=require("cors");

const { initSocket } = require("./socket/index.js");



let baseURL;
let isProduction = process.env.NODE_ENV === "production"
let isDevelopment = process.env.NODE_ENV === "development" && !!process.env.NGROK_BASE;

if (isDevelopment) {
  baseURL = process.env.NGROK_BASE;
} else {
  baseURL = process.env.BASEURL || `http://localhost:${port}`;
}

if(isProduction || isDevelopment){
  app.set('trust proxy', 1); // potrebno za HTTPS + secure cookies iza proxy
}


const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: baseURL,
  clientID: process.env.CLIENTID,
  issuerBaseURL: process.env.ISSUER,
  clientSecret: process.env.CLIENTSECRET,
  authorizationParams: {
    response_type: 'code',
    audience: 'https://www.padelsync-api.com',
    scope: 'openid profile email username offline_access'
  },
  session: {
      cookie: {
        secure: isProduction || isDevelopment,
        sameSite: 'Lax'
      }
    }
};


//place auth0 middleware here
app.use(auth(config));


const server = http.createServer(app);
const io =  new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});



initSocket(io);



const corsOptions ={
   origin: "http://localhost:8080", 
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200,
}

app.use(cors(corsOptions));
if(process.env.NGROK_BASE){
  app.set('trust proxy', 1);
}

app.set('views','./views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);


app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  require("./routes/stripePayment.routes").webhookHandler
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Middleware to log session data
app.use((req, res, next) => {
    //console.log('Session id example :', req.session.id);


    // IMPLEMENTIRATI LOGGING U BAZU!!!! //



    next();
});

app.use(session({
  secret: "verysecretyesyes",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true u production + https
}));


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
const stripeClubRouter = require('./routes/stripeClub.routes')
const stripePaymentRouter = require('./routes/stripePayment.routes');
const socketRouter = require('./routes/socket.routes');
const reservationHandleRouter = require('./routes/reservationHandle.routes.js');
const inboxRouter = require("./routes/inbox.routes.js")

app.use('/home', homeRouter);
app.use('/user_search', user_searchRouter);
app.use('/user', userRouter);
app.use('/terrain_search', terrain_searchRouter);
app.use('/terrain', terrainRouter);
app.use('/stripeClub', stripeClubRouter)
app.use('/stripe', stripePaymentRouter.router)
app.use('/socket', socketRouter);
app.use('/myInbox', inboxRouter)
app.use('/reservationHandle', reservationHandleRouter)

app.get('/react', (req, res) => {
  res.redirect('http://localhost:8080');
});
app.use("/calendar", express.static(path.join(__dirname, "../progi_g12_4/frontend/build")));
app.get("/terrain/:id/react-calendar", (req, res) =>{
  const id = req.params.id;
  res.render("calendar", {
    terrainID: id
  });
});
/* const registrationRouter = require('./routes/registration.routes');
const loginRouter = require('./routes/login.routes');
app.use('/login', loginRouter);
app.use('/registration', registrationRouter); */
/*
const calendarRouter = require('./routes/calendar.routes');
app.use('/calendar', calendarRouter);
*/

const edituserRouter = require('./routes/edituser.routes');
app.use('/edituser', edituserRouter);

const editterrainRouter = require('./routes/editterrain.routes');
app.use('/editterrain', editterrainRouter);

const myprofileRouter = require('./routes/myprofile.routes');
app.use('/myprofile', myprofileRouter);

const editscheduleRouter = require('./routes/editschedule.routes');
const { checkAvailability } = require('./backendutils/checkAvailability');
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

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
setInterval(checkPayments, 1000 * 60 * 60 * 24);
setInterval(checkPonavljajuce, 1000 * 60 * 60 * 24);

module.exports = app;