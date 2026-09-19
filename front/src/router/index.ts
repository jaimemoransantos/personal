import { createRouter, createWebHistory } from "vue-router";
import Login from "../views/Login.vue";
import MainLayout from "../layouts/MainLayout.vue";
import Dashboard from "../views/Dashboard.vue";
import Cotizaciones from "../views/Cotizaciones.vue";
import NewQuote from "../views/NewQuote.vue";
import Clientes from "../views/Clientes.vue";
import Productos from "../views/Productos.vue";
import { useUserStore } from "../stores/index";

/** Paths blocked for chief/technician (exact or prefix). */
const FIELD_BLOCKED_PATHS = [
  "/inicio",
  "/cotizaciones",
  "/clientes",
  "/productos",
  "/usuarios",
];

function isFieldBlockedPath(path: string): boolean {
  if (path === "/" || path === "") return true;
  return FIELD_BLOCKED_PATHS.some(
    (blocked) => path === blocked || path.startsWith(`${blocked}/`),
  );
}

function defaultHome(userStore: ReturnType<typeof useUserStore>): string {
  return userStore.isFieldRole ? "/campo" : "/inicio";
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "Login",
      component: Login,
      meta: { requiresAuth: false },
    },
    {
      path: "/",
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: "inicio",
          name: "Home",
          component: Dashboard,
        },
        {
          path: "campo",
          name: "FieldHome",
          component: () => import("../views/FieldDashboardView.vue"),
        },
        {
          path: "inventario",
          name: "Inventory",
          component: () => import("../views/InventoryView.vue"),
        },
        {
          path: "inventario/costeo",
          name: "InventoryCosting",
          component: () => import("../views/InventoryCostingView.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "inventario/producto/:productId",
          name: "ProductRolls",
          component: () => import("../views/ProductRollsView.vue"),
        },
        {
          path: "cotizaciones",
          name: "Quotes",
          component: Cotizaciones,
        },
        {
          path: "disenos",
          name: "designs",
          component: () => import("../views/DesignsView.vue"),
        },
        {
          path: "cotizaciones/nueva",
          name: "NewQuote",
          component: NewQuote,
        },
        {
          path: "cotizaciones/editar/:id",
          name: "EditQuote",
          component: NewQuote,
        },
        {
          path: "proyectos",
          name: "Projects",
          component: () => import("../views/ProjectsView.vue"),
        },
        {
          path: "proyectos/:id",
          name: "ProjectDetail",
          component: () => import("../views/ProjectDetailView.vue"),
        },
        {
          path: "clientes",
          name: "Customers",
          component: Clientes,
        },
        {
          path: "productos",
          name: "Products",
          component: Productos,
        },
        {
          path: "usuarios",
          name: "Users",
          component: () => import("../views/UsersView.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "",
          // Role-aware default; guard still awaits profile before this matters.
          redirect: () => {
            const userStore = useUserStore();
            return defaultHome(userStore);
          },
        },
      ],
    },
  ],
});

/**
 * Never call next() toward a role-gated route while auth/profile are still loading.
 * Field users must never complete navigation to /inicio (Dashboard).
 */
router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore();

  // Hold navigation until Firebase Auth has resolved the session.
  if (!userStore.authReady) {
    await userStore.waitForAuth();
  }

  const isAuthenticated = userStore.isAuthenticated;

  if (!isAuthenticated) {
    if (to.meta.requiresAuth || to.matched.some((r) => r.meta.requiresAuth)) {
      next({ path: "/login", query: { redirect: to.fullPath } });
      return;
    }
    next();
    return;
  }

  // Authenticated: role must be known before any allow/redirect decision.
  await userStore.waitForProfile();
  if (!userStore.profile) {
    await userStore.fetchProfile();
  }

  if (to.path === "/login") {
    const redirect = to.query.redirect;
    const path =
      typeof redirect === "string" &&
      redirect.startsWith("/") &&
      !redirect.startsWith("//") &&
      !(userStore.isFieldRole && isFieldBlockedPath(redirect))
        ? redirect
        : defaultHome(userStore);
    next(path);
    return;
  }

  if (userStore.isFieldRole && isFieldBlockedPath(to.path)) {
    next("/campo");
    return;
  }

  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next(defaultHome(userStore));
    return;
  }

  next();
});

export default router;
