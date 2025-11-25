const { Router } = require("express");
const { isAuthenticated, redirectIfAuthenticated } = require('../middewares/auth')
const upload = require('../middewares/upload.js');
const appController = require('../controllers/appController')
const appRouter = Router();

appRouter.get('/', isAuthenticated, appController.getHome)
appRouter.get('/folder/:folderId', isAuthenticated, appController.getFolderView)
appRouter.post('/folder/:folderId/delete', isAuthenticated, appController.postFolderDelete)
appRouter.post('/folder/:folderId/share', isAuthenticated, appController.postFolderShare)
appRouter.get('/files/:id/download', isAuthenticated, appController.downloadFile);
appRouter.get('/share/success', isAuthenticated, appController.getShareSuccess)
appRouter.get('/share/:token', appController.getSharedFolder);
appRouter.get('/share/:token/download/:fileId', appController.downloadSharedFile);
appRouter.post('/folder/create', isAuthenticated, appController.postCreateFolder)
appRouter.post('/files/:fileId/delete', isAuthenticated, appController.postDeleteFile);
appRouter.get('/signup', redirectIfAuthenticated, appController.getSignup)
appRouter.post('/signup', appController.postSignup)
appRouter.get('/login', redirectIfAuthenticated, appController.getLogin)
appRouter.post('/login', appController.postLogin)
appRouter.post('/logout', isAuthenticated, appController.postLogout)
appRouter.post('/upload', upload.single('avatar'), appController.postUpload);
module.exports = appRouter;
