const prisma = require('../db/prisma');
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');


//TODO:gonna come back to this project and implement move for file and folder
//but now want to move on to api and learn about new things so i can shape my stack
//cause im not happy with ejs(and view) mybe seperate part of frontend and bakend
//(cause im ok with react) or mybe use nextjs or some other fullstack framework!
//
//TODO: add animaiton for download and delete and upload(cause the supabase storage delay)
function buildFolderTree(folders, parentId = null) {
    const tree = [];

    folders
        .filter(folder => folder.parentId === parentId)
        .forEach(folder => {
            tree.push({
                ...folder,
                children: buildFolderTree(folders, folder.id)
            });
        });

    return tree;
}
//NOTE:part of move functionality
const postMoveFolder = async (req, res) => {
    const folderId = parseInt(req.params.folderId);
    const { destinationId, currentParentId } = req.body;

    try {
        const folder = await prisma.folder.findFirst({
            where: {
                id: folderId,
                userId: req.user.id
            }
        });

        if (!folder) {
            req.flash('error', 'Folder not found');
            return res.redirect('/');
        }

        //  Prevent moving folder into itself
        if (destinationId && parseInt(destinationId) === folderId) {
            req.flash('error', 'Cannot move folder into itself');
            return res.redirect(currentParentId ? `/folder/${currentParentId}` : '/');
        }

        //  Prevent moving folder into its own descendant
        if (destinationId) {
            const isDescendant = await checkIfDescendant(folderId, parseInt(destinationId));
            if (isDescendant) {
                req.flash('error', 'Cannot move folder into its own subfolder');
                return res.redirect(currentParentId ? `/folder/${currentParentId}` : '/');
            }
        }

        // Move folder
        await prisma.folder.update({
            where: { id: folderId },
            data: {
                parentId: destinationId ? parseInt(destinationId) : null
            }
        });

        req.flash('success', 'Folder moved successfully');
        res.redirect(currentParentId ? `/folder/${currentParentId}` : '/');

    } catch (err) {
        console.error('Move error:', err);
        req.flash('error', 'Failed to move folder');
        res.redirect('/');
    }
}
//NOTE:part of move functionality
// Helper to check if destinationId is a descendant of folderId
async function checkIfDescendant(ancestorId, potentialDescendantId) {
    let currentId = potentialDescendantId;

    while (currentId) {
        if (currentId === ancestorId) {
            return true;  // Found ancestor in the chain!
        }

        const folder = await prisma.folder.findUnique({
            where: { id: currentId }
        });

        if (!folder) break;
        currentId = folder.parentId;
    }

    return false;
}
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

    // NOTE: part of the move functionality
    // const allFolders = await prisma.folder.findMany({
    //     where: { userId: req.user.id },
    //     orderBy: { name: 'asc' }
    // })
    // const folderTree = buildFolderTree(allFolders);
    const { userFiles, userFolders } = await getfolderContent(req.user.id, null)
    res.render('index', {
        title: 'home page',
        userInfo: req.user,
        userFiles,
        userFolders,
        currentFolder: null,  // null = root
        breadcrumbs: []
        // NOTE:part of move functionality
        // allFolders,
        // folderTree
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

    // NOTE:part of move functionality
    // const allFolders = await prisma.folder.findMany({
    //     where: { userId: req.user.id },
    //     orderBy: { name: 'asc' }
    // })
    // const folderTree = buildFolderTree(allFolders, currentFolder.parentId);
    const { userFiles, userFolders } = await getfolderContent(req.user.id, folderId)
    const breadcrumbs = await buildBreadcrumbs(folderId)
    res.render('index', {
        title: currentFolder.name || 'home',
        userInfo: req.user,
        userFiles,
        userFolders,
        currentFolder,
        breadcrumbs
        // NOTE:part of move functionality
        // allFolders,
        // folderTree
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
        if (!req.file) {
            req.flash('error', 'No file uploaded');
            return res.redirect('/');
        }

        // Generate unique filename to avoid collisions
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${req.user.id}/${fileName}`;  // Organize by user ID

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false  // Don't overwrite if file exists
            });

        if (error) {
            console.error('Supabase upload error:', error);
            req.flash('error', 'Failed to upload file to storage');
            return res.redirect('/');
        }


        const folderId = req.body.folderId ? parseInt(req.body.folderId) : null;
        // Save file metadata to database
        await prisma.file.create({
            data: {
                name: req.file.originalname,      // Original filename
                path: filePath,                    // Path in Supabase bucket
                size: req.file.size,               // File size in bytes (optional)
                mimeType: req.file.mimetype,       // MIME type (optional)
                userId: req.user.id,
                folderId: folderId
            }
        });

        req.flash('success', 'File uploaded successfully');
        if (folderId) {
            res.redirect(`/folder/${folderId}`);
        } else {
            res.redirect('/');
        }

    } catch (err) {
        console.error('Upload error:', err);
        req.flash('error', 'Failed to upload file');
        const folderId = req.body.folderId ? parseInt(req.body.folderId) : null;
        res.redirect(folderId ? `/folder/${folderId}` : '/');
    }
};
exports.postDeleteFile = async (req, res) => {
    const fileId = parseInt(req.params.id);

    try {
        // Get file metadata
        const file = await prisma.file.findFirst({
            where: {
                id: fileId,
                userId: req.user.id
            }
        });

        if (!file) {
            req.flash('error', 'File not found');
            return res.redirect('/');
        }

        const currentFolderId = file.folderId;

        // Delete from Supabase Storage
        const { error: storageError } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .remove([file.path]);

        if (storageError) {
            console.error('Supabase delete error:', storageError);
            // Continue anyway to remove from database
        }

        // Delete from database
        await prisma.file.delete({
            where: { id: fileId }
        });

        req.flash('success', 'File deleted successfully');

        if (currentFolderId) {
            res.redirect(`/folder/${currentFolderId}`);
        } else {
            res.redirect('/');
        }

    } catch (err) {
        console.error('Delete error:', err);
        req.flash('error', 'Failed to delete file');
        res.redirect('/');
    }
};
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
                        children: true  // Include subfolders
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
            subfolders: sharedLink.folder.children,
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
        // Verify share link
        const sharedLink = await prisma.sharedLink.findUnique({
            where: { token: token }
        });

        if (!sharedLink) {
            return res.status(404).send('Share link not found');
        }

        if (new Date() > new Date(sharedLink.expiresAt)) {
            return res.status(410).send('Share link expired');
        }

        // Get file
        const file = await prisma.file.findUnique({
            where: { id: fileId }
        });

        if (!file) {
            return res.status(404).send('File not found');
        }

        // Security: Verify file belongs to shared folder
        if (file.folderId !== sharedLink.folderId) {
            return res.status(403).send('File not in shared folder');
        }

        // Download from Supabase
        const { data, error } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .download(file.path);

        if (error) {
            console.error('Download error:', error);
            return res.status(500).send('Failed to download file');
        }

        // Send file
        const buffer = Buffer.from(await data.arrayBuffer());
        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
        res.send(buffer);

    } catch (err) {
        console.error('Download error:', err);
        res.status(500).send('Failed to download file');
    }
};
exports.downloadFile = async (req, res) => {
    const fileId = parseInt(req.params.id);

    try {
        // Get file metadata
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

        // Download from Supabase
        const { data, error } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .download(file.path);

        if (error) {
            console.error('Supabase download error:', error);
            req.flash('error', 'Failed to download file');
            return res.redirect('/');
        }

        // Convert Blob to Buffer (if needed)
        const buffer = Buffer.from(await data.arrayBuffer());

        // Send file to user
        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
        res.send(buffer);

    } catch (err) {
        console.error('Download error:', err);
        req.flash('error', 'Failed to download file');
        res.redirect('/');
    }
};
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
            return res.redirect('/signup');
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
