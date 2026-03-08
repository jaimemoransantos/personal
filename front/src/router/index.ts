import { createRouter, createWebHistory } from "vue-router";
import Login from "../views/Login.vue";
import MainLayout from "../layouts/MainLayout.vue";
import Dashboard from "../views/Dashboard.vue";
import Cotizaciones from "../views/Cotizaciones.vue";
import NewQuote from "../views/NewQuote.vue";
import Clientes from "../views/Clientes.vue";
import Productos from "../views/Productos.vue";
import { useUserStore } from "../stores/index";

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
          path: "cotizaciones",
          name: "Quotes",
          component: Cotizaciones,
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
          path: "",
          redirect: "/inicio",
        },
      ],
    },
  ],
});

// Navigation guard: protect routes that require authentication.
// If auth is not ready yet (e.g. after refresh), allow navigation and let App show loader
// until session is restored; only redirect to login when authReady and user is missing.
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore();
  const isAuthenticated = userStore.isAuthenticated;
  const authReady = userStore.authReady;

  if (to.meta.requiresAuth && !isAuthenticated) {
    if (!authReady) {
      next(); // stay on requested URL; App shows loader until auth is resolved
    } else {
      next({ path: "/login", query: { redirect: to.fullPath } });
    }
  } else if (to.path === "/login" && isAuthenticated) {
    const redirect = to.query.redirect;
    const path =
      typeof redirect === "string" &&
      redirect.startsWith("/") &&
      !redirect.startsWith("//")
        ? redirect
        : "/inicio";
    next(path);
  } else {
    next();
  }
});

export default router;
