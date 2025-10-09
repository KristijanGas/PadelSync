const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");


// INSERT DATABASE CREATION SQL CODE HERE
const DBCreateQuery = "CREATE TABLE IF NOT EXISTS example_table (id INTEGER PRIMARY KEY, name TEXT)";

// Create a new table as an example

db.serialize(() => {
  db.run(DBCreateQuery, (err) => {
    if (err) {
      console.error("Error creating table:", err.message);
    } else {
      console.log("Table created successfully");
    }
  });
});

