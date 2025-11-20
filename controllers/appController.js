const prisma = require('../db/prisma');
const passport = require('passport');
const bcrypt = require('bcryptjs');

exports.getHome = async (req, res) => {
    const userInfo = await prisma.user.findUnique({
        where: {
            id: req.user.id
        }
    })
    const userFiles = await prisma.file.findMany({
        where: {
            userId: req.user.id
        }
    })
    console.log('userFiles:', userFiles)
    res.render('index', {
        title: 'home page',
        userInfo: userInfo,
        userFiles: userFiles
    })
}

exports.postUpload = async (req, res) => {
    await prisma.file.create({
        data: {
            name: req.file.originalname,
            userId: req.user.id
        }
    });
    res.redirect('/');
}
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
        const { username, password } = req.body;
        const existingUsername = await prisma.user.findUnique({
            where: { username: username }
        });
        if (existingUsername) {
            console.log('existingUsername:', existingUsername);
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
        console.log('error in the catch:', err)
        return next(err);
    }
}
