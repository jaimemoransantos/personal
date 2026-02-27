import { createRouter, createWebHistory } from "vue-router";
import Login from "../views/Login.vue";
import MainLayout from "../layouts/MainLayout.vue";
import Dashboard from "../views/Dashboard.vue";
import Cotizaciones from "../views/Cotizaciones.vue";
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
          name: "Inicio",
          component: Dashboard,
        },
        {
          path: "cotizaciones",
          name: "Cotizaciones",
          component: Cotizaciones,
        },
        {
          path: "",
          redirect: "/inicio",
        },
      ],
    },
  ],
});

// Navigation guard - proteger rutas que requieren autenticación
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore();
  const isAuthenticated = userStore.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    // Redirigir a login si no está autenticado
    next("/login");
  } else if (to.path === "/login" && isAuthenticated) {
    // Si ya está autenticado y va a login, redirigir a inicio
    next("/inicio");
  } else {
    next();
  }
});

export default router;
