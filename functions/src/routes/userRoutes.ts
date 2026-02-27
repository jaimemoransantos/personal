import { Router } from "express";
import { UserController } from "../controllers/userController";

const router = Router();

// POST /api/users/sync-profile - Sincronizar perfil en Firestore
// (La autenticación se hace con Firebase Auth, este endpoint solo sincroniza el perfil)
router.post("/sync-profile", UserController.syncProfile);

// GET /api/users/profile - Obtener perfil
router.get("/profile", UserController.getProfile);

// PUT /api/users/profile - Actualizar perfil
router.put("/profile", UserController.updateProfile);

export default router;
