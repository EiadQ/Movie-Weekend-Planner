COMP 2406 Assignment 4 - Movie Weekend Planner

Design notes:
- MongoDB is used for services, users, orders, and session data.
- Sessions are stored in the mwp.sessions collection through a custom Mongo session store.
- The site now supports login, registration, profile editing, user directory, and authorization rules.
- Order history is linked to the logged-in user's MongoDB _id.

How to run:
1. Open a terminal in this folder.
2. Run: npm install
3. Make sure MongoDB is running in a separate terminal:
   mongod --dbpath=C:\data\db
4. Initialize the database from this same folder:
   node initializeDatabase.js
5. Start the server:
   node server.js
6. Open your browser to:
   http://localhost:3000

Useful test accounts after re-initializing the database:
- Admin: username admin / password admin
- Non-admin: username Jen / password Jen

Important notes:
- Do not submit node_modules.
- Re-run initializeDatabase.js if you want to reset services, users, orders, and start from a clean state.
