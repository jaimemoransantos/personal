import { Router } from "express";
import { ProjectPhotoController } from "../controllers/projectPhotoController";
import { loadOrganization } from "../middleware/loadOrganization";

const router = Router();
router.use(loadOrganization);

router.get("/", ProjectPhotoController.list);
router.post("/", ProjectPhotoController.add);
router.get("/:id/image", ProjectPhotoController.getImage);
router.delete("/:id", ProjectPhotoController.remove);

export default router;
