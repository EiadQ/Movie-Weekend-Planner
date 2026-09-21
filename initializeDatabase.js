// This code will re-populate the streaming-services collection of the
// MongoDB database called mwp each time that it runs. However, it does 
// not reset the users nor orders collections.

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const MONGO_URL = "mongodb://localhost:27017";
const DB_NAME = "mwp"; // This is the name of our database
const SERVICES_DIR = path.join(__dirname, "streamingServices");

// This function will read the streaming-service information from   
// the streamingServices folder and return an array of them.
async function loadServices() {
    // Get all the JSON files
    const files = fs.readdirSync(SERVICES_DIR)
        .filter(f => f.endsWith(".json"));

    const services = [];

    // Go through each file, read it and add it to an array
    for (const file of files) {
        const fullPath = path.join(SERVICES_DIR, file);
        const raw = fs.readFileSync(fullPath, "utf-8");
        try {
            const json = JSON.parse(raw);
            services.push(json);
        } catch (err) {
            console.error(`Invalid JSON in file ${file}:`, err);
        }
    }

    return services;
}

// Populate the services collection
async function populateServices(db) {
    // Get all the services as an array
    const services = await loadServices();
    if (services.length === 0) {
        console.error('No valid service JSON files found.');
        return;
    }
    // Reset the collection every time we run this
    await db.dropCollection("services").catch(() => {});
    const collection = db.collection("services");

    // Add the streaming services data to the collection
    await collection.insertMany(services);

    console.log(`Inserted ${services.length} services into ${DB_NAME}.services`);     
}

// Populate the users collection with 10 users ... only the first one will have admin privileges
async function populateUsers(db) {
    // Reset the collection every time we run this
    const collection = db.collection("users");
    await db.dropCollection("users").catch(() => {});

    const names = ["admin", "MeiLing", "Santiago", "Fatima", "Hyejin", "Rajesh", "Chiara", "Yusuf", "Ananya", "Jen"];
    const users = names.map(name => ({
        username: name,
        password: name,
        admin: false,
        privacy: false
    }));

    // Make Steve an admin
    users[0].admin = true;

    // Add the users to the collection
    try{
		let result = await db.collection("users").insertMany(users);
		console.log(result.insertedCount + ` users successfully added (should be ${names.length}).`);
	} catch (err) {
		console.error("Error inserting users:", err);
		throw err;
	}     
}

// Create a blank orders collection
async function populateOrders(db) {
    // Reset the collection every time we run this
    await db.dropCollection("orders").catch(() => {});
    await db.createCollection("orders");
    console.log("Reinitialized orders to empty");     
}



// This code will populate the "mwp" database
async function main() {
    const client = new MongoClient(MONGO_URL);

    try {
        await client.connect();
        const db = client.db(DB_NAME);

        // Set up all three collections 
        await populateServices(db);
        await populateUsers(db);
        await populateOrders(db);
    } catch (err) {
        console.error('Error populating collections:', err);
    } finally {
        // Make sure that we close the database connection
        await client.close();
    }
}

main();
