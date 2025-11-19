const prisma = require('../db/prisma');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
// const db = require('../db/queries');
// TODO:replace with prisma(the db)
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            // TODO:replace with prisma(the db)
            const user = await prisma.user.findUnique({
                where: { username: username }
            });
            if (!user) {
                return done(null, false, { message: `there is no such user as ${username}` })
            }
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return done(null, false, { message: 'wrong password' })
            }
            return done(null, user)
        } catch (err) {
            return done(err)
        }
    })
)
//for session managment(adding and retriving from session)
passport.serializeUser((user, done) => {
    done(null, user.id);
})
passport.deserializeUser(async (id, done) => {
    try {
        // TODO:replace with prisma(the db)
        const user = await prisma.user.findUnique({
            where: { id: id }
        });
        if (!user) {
            return done(null, false);
        }
        done(null, user);
    } catch (err) {
        done(err);
    }
})
module.exports = passport;
