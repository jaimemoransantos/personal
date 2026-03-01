import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes";
import organizationRoutes from "./routes/organizationRoutes";
import customerRoutes from "./routes/customerRoutes";
import productRoutes from "./routes/productRoutes";
import quoteRoutes from "./routes/quoteRoutes";
import { handleError } from "./utils/errors";
import { authenticate } from "./middleware/auth";

const app = express();

// Global middleware (higher limit for Excel base64 uploads)
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes protected by Firebase Auth (all /api/**)
app.use("/api", authenticate);
app.use("/api/users", userRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/quotes", quoteRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Ruta no encontrada",
  });
});

// Global error handler
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
