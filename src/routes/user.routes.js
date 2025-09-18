import { Router } from 'express';
import { registerUser, loginUser ,logoutUser } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route("/register").post(
    upload.single("profileimage"),
    registerUser
);

router.route("/login").post(upload.none(),loginUser);

// A protected route example
router.route("/protected-route").get(verifyJWT, (req, res) => {
    res.json({ message: `Welcome, ${req.user.name}! This is a protected route.` });
});

// logout
router.post("/logout", verifyJWT,upload.none(), logoutUser);

export default router;