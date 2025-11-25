const prisma = require('../db/prisma');
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');


async function getfolderContent(userId, folderId) {
    const userFiles = await prisma.file.findMany({
        where: {
            userId: userId,
            folderId: folderId
        }
    })

    const userFolders = await prisma.folder.findMany({
        where: {
            userId: userId,
            parentId: folderId
        }
    })
    return { userFiles, userFolders }
}
exports.getHome = async (req, res) => {

    const { userFiles, userFolders } = await getfolderContent(req.user.id, null)

    res.render('index', {
        title: 'home page',
        userInfo: req.user,
        userFiles,
        userFolders,
        currentFolder: null,  // null = root
        breadcrumbs: []
    })
}

exports.getFolderView = async (req, res) => {
    const folderId = parseInt(req.params.folderId)
    const currentFolder = await prisma.folder.findFirst({
        where: {
            id: folderId,
            userId: req.user.id
        }
    });
    if (!currentFolder) {
        req.flash('error', 'Folder not found')
        res.redirect('/')
    }
    const { userFiles, userFolders } = await getfolderContent(req.user.id, folderId)
    const breadcrumbs = await buildBreadcrumbs(folderId)
    res.render('index', {
        title: currentFolder.name || 'home',
        userInfo: req.user,
        userFiles,
        userFolders,
        currentFolder,
        breadcrumbs
    });
}
async function buildBreadcrumbs(folderId) {
    const breadcrumbs = [];
    let currentId = folderId
    while (currentId) {
        const folder = await prisma.folder.findUnique({
            where: {
                id: currentId
            }
        })
        breadcrumbs.unshift({ id: currentId, name: folder.name })
        currentId = folder.parentId

    }
    return breadcrumbs
}
exports.postCreateFolder = async (req, res) => {
    const { folderName, parentId } = req.body;
    await prisma.folder.create({
        data: {
            name: folderName,
            userId: req.user.id,
            parentId: parentId ? parseInt(parentId) : null
        }
    })
    if (parentId) {
        res.redirect(`/folder/${parentId}`)
    } else {
        res.redirect(`/`)
    }
}
exports.postUpload = async (req, res) => {
    try {
        const folderId = req.body.folderId ? parseInt(req.body.folderId) : null;

        await prisma.file.create({
            data: {
                name: req.file.originalname,
                path: req.file.filename,
                userId: req.user.id,
                folderId: folderId
            }
        });

        req.flash('success', 'File uploaded successfully!');

        // Redirect back to current location
        if (folderId) {
            res.redirect(`/folder/${folderId}`);
        } else {
            res.redirect('/');
        }
    } catch (err) {
        console.error('Upload error:', err);
        req.flash('error', 'Failed to upload file');
        res.redirect('back');
    }
}
exports.postDeleteFile = async (req, res) => {
    const fileId = parseInt(req.params.fileId);

    try {
        const file = await prisma.file.findFirst({
            where: {
                id: fileId,
                userId: req.user.id  // ✅ Security check
            }
        });

        if (!file) {
            req.flash('error', 'File not found or access denied');
            return res.redirect('/');
        }

        const folderId = file.folderId;

        if (folderId) {
            await prisma.file.delete({
                where: { id: fileId }
            });
            req.flash('success', 'File deleted successfully');
            res.redirect(`/folder/${folderId}`);
        } else {
            res.redirect('/');
        }

    } catch (err) {
        console.error('Delete error:', err);
        req.flash('error', 'Failed to delete file');
        res.redirect('/');
    }
}
exports.postFolderDelete = async (req, res) => {
    const folderId = parseInt(req.params.folderId);

    try {
        const folder = await prisma.folder.findFirst({
            where: {
                id: folderId,
                userId: req.user.id  // ✅ security check
            }
        });

        if (!folder) {
            req.flash('error', 'folder not found or access denied');
            return res.redirect('/');
        }

        const parentid = folder.parentId;

        await prisma.folder.delete({
            where: { id: folderId }
        });
        req.flash('success', 'folder deleted successfully');
        if (parentid) {
            res.redirect(`/folder/${parentid}`);
        } else {
            res.redirect('/');
        }

    } catch (err) {
        console.error('delete error:', err);
        req.flash('error', 'failed to delete folder');
        res.redirect('/');
    }
}
exports.postFolderShare = async (req, res) => {
    const folderId = parseInt(req.params.folderId);
    console.log('folderId in postFolderShare:', folderId)
    const { duration } = req.body;
    console.log('duration in postFolderShare:', duration)

    try {
        const folder = await prisma.folder.findFirst({
            where: {
                id: folderId,
                userId: req.user.id  // ✅ security check
            }
        });

        if (!folder) {
            req.flash('error', 'folder not found or access denied');
            return res.redirect('/');
        }

        const shareToken = crypto.randomUUID()
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(duration));
        console.log('expiresAt:', expiresAt)

        await prisma.sharedLink.create({
            data: {
                token: shareToken,
                folderId: folderId,
                userId: req.user.id,
                expiresAt: expiresAt
            }
        });

        res.redirect(`/share/success?token=${shareToken}`)

    } catch (err) {
        console.error('delete error:', err);
        req.flash('error', 'failed to delete folder');
        res.redirect('/');
    }
}
exports.getShareSuccess = async (req, res) => {
    const shareToken = req.query.token;
    if (!shareToken) {
        console.log('bru!')
        return res.redirect('/');
    }
    const sharedLink = await prisma.sharedLink.findFirst({
        where: {
            token: shareToken,
            userId: req.user.id
        },
        include: {
            folder: true
        }
    })
    if (!sharedLink) {
        req.flash('error', 'Share link dosent exist')
        res.redirect('/')
    }
    const shareUrl = `${req.protocol}://${req.get('host')}/share/${shareToken}`;
    res.render('share-success', {
        title: 'Share Link Created',
        shareUrl: shareUrl,
        folder: sharedLink.folder,
        expiresAt: sharedLink.expiresAt
    });
}
exports.getSharedFolder = async (req, res) => {
    const token = req.params.token;

    try {
        // Find the shared link
        const sharedLink = await prisma.sharedLink.findUnique({
            where: { token: token },
            include: {
                folder: {
                    include: {
                        files: true,
                    }
                }
            }
        });

        // Check if link exists
        if (!sharedLink) {
            return res.status(404).render('error', {
                title: 'Link Not Found',
                message: 'This share link does not exist or has been deleted.'
            });
        }

        // Check if expired
        if (new Date() > new Date(sharedLink.expiresAt)) {
            return res.status(410).render('error', {
                title: 'Link Expired',
                message: 'This share link has expired.'
            });
        }

        // Show the shared folder (public view)
        res.render('shared-folder', {
            title: `Shared: ${sharedLink.folder.name || 'Folder'}`,
            folder: sharedLink.folder,
            files: sharedLink.folder.files,
            expiresAt: sharedLink.expiresAt,
            token
        });

    } catch (err) {
        console.error('Share access error:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load shared folder.'
        });
    }
}
exports.downloadSharedFile = async (req, res) => {
    const token = req.params.token;
    const fileId = parseInt(req.params.fileId);

    try {
        const sharedLink = await prisma.sharedLink.findUnique({
            where: { token: token }
        });

        if (!sharedLink) {
            return res.status(404).send('Share link not found');
        }

        if (new Date() > new Date(sharedLink.expiresAt)) {
            return res.status(410).send('Share link expired');
        }

        const file = await prisma.file.findUnique({
            where: { id: fileId }
        });

        if (!file) {
            return res.status(404).send('File not found');
        }

        // Security check: file must belong to shared folder
        if (file.folderId !== sharedLink.folderId) {
            return res.status(403).send('File not in shared folder');
        }

        // Build actual file path
        const filePath = path.join(__dirname, '../uploads', file.path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found on server');
        }

        // Send file with original name
        res.download(filePath, file.name);

    } catch (err) {
        console.error('Download error:', err);
        res.status(500).send('Failed to download file');
    }
}
exports.downloadFile = async (req, res) => {
    const fileId = parseInt(req.params.id);

    try {
        const file = await prisma.file.findFirst({
            where: {
                id: fileId,
                userId: req.user.id  // Security: must own file
            }
        });

        if (!file) {
            req.flash('error', 'File not found');
            return res.redirect('/');
        }

        const filePath = path.join(__dirname, '../uploads', file.path);

        if (!fs.existsSync(filePath)) {
            req.flash('error', 'File not found on server');
            return res.redirect('/');
        }

        res.download(filePath, file.name);

    } catch (err) {
        console.error('Download error:', err);
        req.flash('error', 'Failed to download file');
        res.redirect('/');
    }
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
