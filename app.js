require('@dotenvx/dotenvx').config();
const express = require('express')
const path = require('path');
const appRouter = require('./routes/appRoutes');
const passport = require('./config/passport');
const session = require('express-session');
const expressSession = require('express-session');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const { PrismaClient } = require('@prisma/client');
const app = express()

app.use(session({
    store: new PrismaSessionStore(
        new PrismaClient(),
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
        secure: true,
        sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));
app.use(passport.initialize());
app.use(passport.session());

//NOTE:starting passport(making it available on all routes)
app.use(passport.initialize());
//NOTE:connecting passport to session(useing session in passport)
app.use(passport.session());
//NOTE:make user available to all views
app.use(setUser);
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).send(err.message);
});
// choose a port
const PORT = 3009;
app.listen(PORT, (error) => {
    if (error) {
        throw error;
    }
    console.log(`my app - listening on port ${PORT}!`);
});
module.exports = app;
