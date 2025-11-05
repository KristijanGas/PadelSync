cd /PadelSync
npm test
node server.js &
node auth_apis/app.js &

cd frontend
npm start &

