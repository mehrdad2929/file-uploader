require('@dotenvx/dotenvx').config();
const express = require('express')
const path = require('path');
const appRouter = require('./routes/appRoutes');
const passport = require('./config/passport');
const { setUser } = require('./middewares/auth')
const session = require('express-session');
const flash = require('connect-flash')
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const prisma = require('./db/prisma');
const app = express()

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({
    store: new PrismaSessionStore(
        prisma,
        {
            checkPeriod: 2 * 60 * 1000,
            dbRecordIdIsSessionId: true,
            dbRecordIdFunction: undefined,
        }
    ),
    secret: process.env.FOO_COOKIE_SECRET,
    saveUninitialized: false,
    createTableIfMissing: true,
    name: 'MyCoolWebAppCookieName',
    resave: false,
    cookie: {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',   // <--- allow local dev
    }
}));
app.use(flash());
app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
})

//NOTE:starting passport(making it available on all routes)
app.use(passport.initialize());
//NOTE:connecting passport to session(useing session in passport)
app.use(passport.session());
//NOTE:make user available to all views
app.use(setUser);
// app.js - Add this BEFORE your routes
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            req.flash('error', 'File too large. Maximum size is 40MB.');
            return res.redirect('/');
        }
        req.flash('error', `Upload error: ${err.message}`);
        return res.redirect('/');
    }

    // Pass to next error handler
    next(err);
});
app.use('/', appRouter)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).send(err.message);
});
// choose a port
const PORT = 3000;
app.listen(PORT, (error) => {
    if (error) {
        throw error;
    }
    console.log(`my app - listening on port ${PORT}!`);
});
module.exports = app;
