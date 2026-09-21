
// Get the MongoClient class from the mondodb module
const { MongoClient } = require("mongodb");

// Connection URL for the MongoDB server (default port for Mongo is 27017)
const url = "mongodb://localhost:27017"; 
const dbName = "mwp";        // This is the name of our database ("Movie Weekend Planner")

// Create a MongoClient instance
const client = new MongoClient(url);

let db = null;   // The database connection (null upon start)

// Connect to the database
async function connectToDatabase() {
    if (!db) { // If not already connected, connect now
        try {
            await client.connect();
            db = client.db(dbName);
            console.log("Connected to MongoDB: " + dbName);
        } catch (err) {
            console.error("Error connecting to MongoDB:", err);
            throw err; // re-throw this error so that the caller knows it failed
        }
    }
    return db;
}

// Disconnect from the database
async function disconnectFromDatabase() {
    try {
        await client.close();
        db = null;  // Reset so next call to connectToDatabase() works properly
        console.log("Disconnected from MongoDB: " + dbName);
    } catch (err) {
        console.error("Error disconnecting from MongoDB:", err);
    }
}

module.exports = { connectToDatabase, disconnectFromDatabase };
