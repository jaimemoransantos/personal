import { Router } from "express";
import { UserController } from "../controllers/userController";

const router = Router();

// POST /api/users/sync-profile - Sync profile to Firestore (auth via Firebase Auth)
router.post("/sync-profile", UserController.syncProfile);

// GET /api/users/profile - Get profile
router.get("/profile", UserController.getProfile);

// GET /api/users/me/avatar - Proxy profile photo (avoids 429 from Google, etc.)
router.get("/me/avatar", UserController.getAvatar);

// PUT /api/users/profile - Update profile
router.put("/profile", UserController.updateProfile);

export default router;
