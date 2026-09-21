const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('./mwpDB');

const app = express();
const PORT = 3000;

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'pages'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/images', express.static(path.join(__dirname, 'images')));

class MongoSessionStore extends session.Store {
    constructor() {
        super();
        this.collectionName = 'sessions';
    }

    async get(sid, callback) {
        try {
            const db = await connectToDatabase();
            const doc = await db.collection(this.collectionName).findOne({ _id: sid });
            if (!doc) return callback(null, null);
            if (doc.expiresAt && new Date(doc.expiresAt) <= new Date()) {
                await db.collection(this.collectionName).deleteOne({ _id: sid });
                return callback(null, null);
            }
            callback(null, doc.session);
        } catch (err) {
            callback(err);
        }
    }

    async set(sid, sess, callback) {
        try {
            const db = await connectToDatabase();
            let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            if (sess.cookie && sess.cookie.expires) {
                expiresAt = new Date(sess.cookie.expires);
            }
            await db.collection(this.collectionName).updateOne(
                { _id: sid },
                { $set: { session: sess, expiresAt } },
                { upsert: true }
            );
            callback && callback(null);
        } catch (err) {
            callback && callback(err);
        }
    }

    async destroy(sid, callback) {
        try {
            const db = await connectToDatabase();
            await db.collection(this.collectionName).deleteOne({ _id: sid });
            callback && callback(null);
        } catch (err) {
            callback && callback(err);
        }
    }
}

app.use(session({
    secret: 'comp2406-a4-secret',
    resave: false,
    saveUninitialized: false,
    store: new MongoSessionStore(),
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(async (req, res, next) => {
    try {
        res.locals.currentPath = req.path;
        res.locals.user = null;
        if (req.session.userId) {
            const db = await connectToDatabase();
            const user = await db.collection('users').findOne({ _id: new ObjectId(req.session.userId) });
            if (user) {
                req.currentUser = user;
                res.locals.user = {
                    _id: user._id.toString(),
                    username: user.username,
                    admin: !!user.admin,
                    privacy: !!user.privacy
                };
            } else {
                req.session.destroy(() => {});
            }
        }
        next();
    } catch (err) {
        next(err);
    }
});

function requireLogin(req, res, next) {
    if (!req.currentUser) return res.status(403).send('Forbidden');
    next();
}

function requireAdmin(req, res, next) {
    if (!req.currentUser || !req.currentUser.admin) return res.status(403).send('Forbidden');
    next();
}

function requireLoggedOut(req, res, next) {
    if (req.currentUser) return res.status(403).send('Forbidden');
    next();
}

function canViewProfile(requester, targetUser) {
    if (!requester) return false;
    if (requester.admin) return true;
    return requester._id.toString() === targetUser._id.toString() || !targetUser.privacy;
}

async function getAllServices() {
    const db = await connectToDatabase();
    return db.collection('services').find().sort({ id: 1 }).toArray();
}

async function getServiceById(id) {
    const db = await connectToDatabase();
    return db.collection('services').findOne({ id: Number(id) });
}

async function replaceService(service) {
    const db = await connectToDatabase();
    await db.collection('services').replaceOne({ _id: service._id }, service);
}

async function getOrders() {
    const db = await connectToDatabase();
    return db.collection('orders').find().toArray();
}

async function calcStatsData() {
    const services = await getAllServices();
    const orders = await getOrders();
    const statsData = [];

    for (const service of services) {
        let totalOrdered = 0;
        let totalSales = 0;
        let totalOrderCost = 0;
        let validOrders = 0;
        const counts = {};

        for (const order of orders) {
            const fee = order.fees?.[service.name] || 0;
            const movies = order.movies?.[service.name] || [];
            if (movies.length > 0) {
                totalOrdered += movies.length;
                validOrders += 1;
                let orderTotal = fee;
                totalSales += fee;
                for (const movie of movies) {
                    totalSales += movie.price;
                    orderTotal += movie.price;
                    counts[movie.id] = (counts[movie.id] || 0) + 1;
                }
                totalOrderCost += orderTotal;
            }
        }

        const allMovies = Object.values(service.genres || {}).flat();
        const rankedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        let mostPopular = '';
        for (const movieId of rankedIds) {
            const movie = allMovies.find(m => m.id === Number(movieId));
            if (movie) {
                mostPopular = movie.title;
                break;
            }
        }

        statsData.push({
            name: service.name,
            totalOrdered,
            totalSales,
            avgCost: validOrders ? totalOrderCost / validOrders : 0,
            mostPopular
        });
    }

    return statsData;
}

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', requireLoggedOut, (req, res) => {
    res.render('login', { errorMessage: '' });
});

app.post('/login', requireLoggedOut, async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const db = await connectToDatabase();
        const user = await db.collection('users').findOne({ username, password });
        if (!user) {
            return res.status(401).render('login', { errorMessage: 'Invalid username or password.' });
        }
        req.session.userId = user._id.toString();
        res.redirect('/');
    } catch (err) {
        next(err);
    }
});

app.get('/register', requireLoggedOut, (req, res) => {
    res.render('register', { errorMessage: '', formData: { username: '', privacy: false } });
});

app.post('/register', requireLoggedOut, async (req, res, next) => {
    try {
        const username = (req.body.username || '').trim();
        const password = (req.body.password || '').trim();
        const privacy = req.body.privacy === 'on';

        if (!username || !password) {
            return res.status(400).render('register', {
                errorMessage: 'Username and password are required.',
                formData: { username, privacy }
            });
        }

        const db = await connectToDatabase();
        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
            return res.status(400).render('register', {
                errorMessage: 'That username is already in use.',
                formData: { username, privacy }
            });
        }

        const result = await db.collection('users').insertOne({ username, password, privacy, admin: false });
        req.session.userId = result.insertedId.toString();
        res.redirect('/');
    } catch (err) {
        next(err);
    }
});

app.get('/logout', requireLogin, (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

app.get('/order', requireLogin, async (req, res, next) => {
    try {
        const services = await getAllServices();
        const basicServiceData = services.map(s => ({
            id: s.id,
            name: s.name,
            minOrder: s.minOrder,
            serviceFee: s.serviceFee
        }));
        res.render('orderForm', { basicServiceData });
    } catch (err) {
        next(err);
    }
});

app.get('/stats', requireLogin, async (req, res, next) => {
    try {
        const statsData = await calcStatsData();
        res.render('stats', { statsData });
    } catch (err) {
        next(err);
    }
});

app.get('/users', requireAdmin, async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const users = (await db.collection('users').find().sort({ username: 1 }).toArray()).map(user => ({
            id: user._id.toString(),
            username: user.username,
            privacy: !!user.privacy
        }));
        const accept = req.headers.accept || '';
        if (accept.includes('application/json')) return res.json(users);
        res.render('users', { users });
    } catch (err) {
        next(err);
    }
});

app.delete('/users/:uID', requireAdmin, async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const userId = new ObjectId(req.params.uID);
        const targetUser = await db.collection('users').findOne({ _id: userId });
        if (!targetUser) return res.status(404).json({ success: false, error: 'User not found.' });
        await db.collection('users').deleteOne({ _id: userId });
        await db.collection('orders').deleteMany({ user: userId });
        await db.collection('sessions').deleteMany({ 'session.userId': req.params.uID });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

app.get('/users/:uID', requireLogin, async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const userId = new ObjectId(req.params.uID);
        const profileUser = await db.collection('users').findOne({ _id: userId });
        if (!profileUser) return res.status(404).send('User not found');
        if (!canViewProfile(req.currentUser, profileUser)) return res.status(403).send('Forbidden');

        const orders = await db.collection('orders').find({ user: userId }).toArray();
        const viewModel = {
            _id: profileUser._id.toString(),
            username: profileUser.username,
            password: profileUser.password,
            privacy: !!profileUser.privacy,
            isOwnProfile: req.currentUser._id.toString() === profileUser._id.toString(),
            orders: orders.map(order => ({
                id: order._id.toString(),
                fees: order.fees || {},
                subtotal: order.subtotal || 0,
                tax: order.tax || 0,
                total: order.total || 0,
                movies: Object.entries(order.movies || {}).flatMap(([serviceName, movies]) =>
                    movies.map(movie => ({ serviceName, ...movie }))
                )
            }))
        };

        res.render('userProfile', { profileUser: viewModel });
    } catch (err) {
        next(err);
    }
});

app.put('/users/:uID', requireLogin, async (req, res, next) => {
    try {
        const targetId = req.params.uID;
        if (!req.currentUser.admin && req.currentUser._id.toString() !== targetId) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        const { username, password, privacy } = req.body;
        const trimmedUsername = (username || '').trim();
        const trimmedPassword = (password || '').trim();
        if (!trimmedUsername || !trimmedPassword) {
            return res.status(400).json({ success: false, error: 'All fields are required.' });
        }

        const db = await connectToDatabase();
        const duplicate = await db.collection('users').findOne({
            username: trimmedUsername,
            _id: { $ne: new ObjectId(targetId) }
        });
        if (duplicate) {
            return res.status(400).json({ success: false, error: 'Username already in use.' });
        }

        await db.collection('users').updateOne(
            { _id: new ObjectId(targetId) },
            { $set: { username: trimmedUsername, password: trimmedPassword, privacy: !!privacy } }
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

app.get('/services', requireAdmin, async (req, res, next) => {
    try {
        const services = await getAllServices();
        const basicServicesList = { count: services.length, services: services.map(s => ({ id: s.id, name: s.name })) };
        const accept = req.headers.accept || '';
        if (accept.includes('application/json')) return res.json(basicServicesList);
        res.render('services', { services: basicServicesList.services });
    } catch (err) {
        next(err);
    }
});

app.get('/services/:id', requireLogin, async (req, res, next) => {
    try {
        const service = await getServiceById(req.params.id);
        if (!service) return res.status(404).send('Service not found');
        const accept = req.headers.accept || '';
        if (accept.includes('application/json')) return res.json(service);
        res.render('serviceInfo', { service });
    } catch (err) {
        next(err);
    }
});

app.post('/submit-order', requireLogin, async (req, res, next) => {
    try {
        const order = req.body;
        order.user = new ObjectId(req.currentUser._id);
        const db = await connectToDatabase();
        await db.collection('orders').insertOne(order);
        res.send('Order received');
    } catch (err) {
        next(err);
    }
});

app.post('/services', requireAdmin, async (req, res, next) => {
    try {
        const name = (req.body.name || '').trim();
        if (!name) return res.status(400).json({ success: false, error: 'Service name required' });
        const services = await getAllServices();
        const maxId = services.length ? Math.max(...services.map(s => s.id)) : 0;
        const newService = { id: maxId + 1, name, minOrder: 0, serviceFee: 0, genres: {} };
        const db = await connectToDatabase();
        await db.collection('services').insertOne(newService);
        res.json({ success: true, service: newService });
    } catch (err) {
        next(err);
    }
});

app.delete('/services/:sID', requireAdmin, async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const result = await db.collection('services').deleteOne({ id: Number(req.params.sID) });
        if (!result.deletedCount) return res.status(404).json({ success: false, error: 'Service not found' });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

app.put('/services/:sID/info', requireAdmin, async (req, res, next) => {
    try {
        const service = await getServiceById(req.params.sID);
        if (!service) return res.status(404).json({ success: false, error: 'Service not found' });
        ['name', 'minOrder', 'serviceFee'].forEach(field => {
            if (req.body[field] !== undefined) service[field] = req.body[field];
        });
        await replaceService(service);
        res.json({ success: true, service });
    } catch (err) {
        next(err);
    }
});

app.post('/services/:sID/genres', requireAdmin, async (req, res, next) => {
    try {
        const service = await getServiceById(req.params.sID);
        if (!service) return res.status(404).json({ success: false, error: 'Service not found' });
        const genreName = (req.body.genre || '').trim();
        if (!genreName) return res.status(400).json({ success: false, error: 'Genre name required' });
        if (service.genres[genreName]) return res.status(400).json({ success: false, error: 'Genre already exists' });
        service.genres[genreName] = [];
        await replaceService(service);
        res.json({ success: true, service });
    } catch (err) {
        next(err);
    }
});

app.post('/services/:sID/movies', requireAdmin, async (req, res, next) => {
    try {
        const service = await getServiceById(req.params.sID);
        if (!service) return res.status(404).json({ success: false, error: 'Service not found' });
        const { genre, movie } = req.body;
        if (!genre || !movie) return res.status(400).json({ success: false, error: 'Genre and movie required' });
        if (!service.genres[genre]) return res.status(400).json({ success: false, error: 'Genre does not exist' });
        const allMovies = Object.values(service.genres).flat();
        const maxId = allMovies.reduce((max, m) => Math.max(max, m.id), 0);
        movie.id = maxId + 1;
        service.genres[genre].push(movie);
        await replaceService(service);
        res.json({ success: true, service });
    } catch (err) {
        next(err);
    }
});

app.delete('/services/:sID/movies/:movieID', requireAdmin, async (req, res, next) => {
    try {
        const service = await getServiceById(req.params.sID);
        if (!service) return res.status(404).json({ success: false, error: 'Service not found' });
        let deleted = false;
        for (const genre of Object.keys(service.genres)) {
            const originalLength = service.genres[genre].length;
            service.genres[genre] = service.genres[genre].filter(m => m.id !== Number(req.params.movieID));
            if (service.genres[genre].length < originalLength) deleted = true;
        }
        if (!deleted) return res.status(404).json({ success: false, error: 'Movie not found' });
        await replaceService(service);
        res.json({ success: true, service });
    } catch (err) {
        next(err);
    }
});

app.use((req, res) => {
    res.status(404).send('Not Found');
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
});

(async () => {
    try {
        const db = await connectToDatabase();
        await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        app.listen(PORT, () => {
            console.log(`"Weekend Movie" Planner Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
})();
