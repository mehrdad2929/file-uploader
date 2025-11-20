function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login')
}
function setUser(req, res, next) {
    res.locals.currentUser = req.user;
    next();
}
function redirectIfAuthenticated(req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }
    return res.redirect('/');
}
module.exports = {
    setUser,
    isAuthenticated,
    redirectIfAuthenticated
}
