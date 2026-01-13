let baseURL;
let isProduction = process.env.NODE_ENV === "production"
let isDevelopment = process.env.NODE_ENV === "development" && !!process.env.NGROK_BASE;

if (isDevelopment) {
  baseURL = process.env.NGROK_BASE;
} else {
  baseURL = process.env.BASEURL || `http://localhost:${port}`;
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
module.exports = { config }