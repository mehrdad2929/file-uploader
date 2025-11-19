const prisma = require('../db/prisma');
const passport = require('passport');
const bcrypt = require('bcryptjs');

exports.getLogin = async (req, res) => {
    res.render('login', { title: 'login page' })
}
exports.postLogin = passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: 'login',
    failureFlash: true
});
exports.postLogout = async (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    })
}
exports.getSignup = async (req, res) => {
    res.render('signup', { title: 'signup page' })
}
exports.postSignup = async (req, res, next) => {
    try {
        console.log('req:', req.body);
        const { username, password } = req.body;
        const existingUsername = await prisma.user.findUnique({
            where: { username: username }
        });
        if (existingUsername) {
            req.flash('error', 'Username already taken');
            res.redirect('/signup');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username: username,
                password: hashedPassword
            }
        });
        req.login(user, (err) => {
            if (err) return next(err);
            req.flash('success', 'Account created!');
            res.redirect('/');  // Go straight to home, logged in!
        });
    } catch (err) {
        return next(err);
    }
}
