import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes";
import { handleError } from "./utils/errors";
import { authenticate } from "./middleware/auth";

const app = express();

// Middleware global
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rutas protegidas por Firebase Auth (todas las /api/**)
app.use("/api", authenticate);
app.use("/api/users", userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Ruta no encontrada",
  });
});

// Error handler global
app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    handleError(err, res);
  }
);

export default app;
