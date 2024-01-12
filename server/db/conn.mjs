import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://127.0.0.1:27017");

let conn;
try {
    console.log("connecting to Local MongoDB");
    conn = await client.connect();
} catch(e) {
    console.error(e);
}

// let db = conn.db("telephone");
let db = conn.db("players");

export default db;