const { Router } = require("express");
const { isAuthenticated, redirectIfAuthenticated } = require('../middewares/auth')
const upload = require('../middewares/upload.js');
const appController = require('../controllers/appController')
const appRouter = Router();

appRouter.get('/', isAuthenticated, appController.getHome)
appRouter.get('/signup', redirectIfAuthenticated, appController.getSignup)
appRouter.post('/signup', appController.postSignup)
appRouter.get('/login', redirectIfAuthenticated, appController.getLogin)
appRouter.post('/login', appController.postLogin)
appRouter.post('/logout', isAuthenticated, appController.postLogout)
appRouter.post(
    '/upload',
    (req, res, next) => { console.log('before multer middleware'); next(); },
    upload.single('avatar'),
    (req, res, next) => { console.log('after multer middleware'); next(); },
    appController.postUpload
);
module.exports = appRouter;
