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

// Navigation guard: protect routes that require authentication
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore();
  const isAuthenticated = userStore.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next("/login");
  } else if (to.path === "/login" && isAuthenticated) {
    next("/inicio");
  } else {
    next();
  }
});

export default router;
