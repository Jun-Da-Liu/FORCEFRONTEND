import { createRouter, createWebHashHistory } from "vue-router";

export const Layout = () => import("@/layouts/index.vue");

// Static routes
export const constantRoutes = [
  {
    path: "/redirect",
    component: Layout,
    meta: { hidden: true },
    children: [
      {
        path: "/redirect/:path(.*)",
        component: () => import("@/views/redirect.vue"),
      },
    ],
  },

  {
    path: "/login",
    component: () => import("@/views/login/index.vue"),
    meta: { hidden: true },
  },

  {
    path: "/",
    name: "/",
    component: Layout,
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        component: () => import("@/views/dashboard/index.vue"),
        // keep-alive requires this name to match the SFC component name.
        name: "Dashboard",
        meta: {
          title: "dashboard",
          icon: "homepage",
          affix: true,
          keepAlive: true,
        },
      },
      {
        path: "401",
        component: () => import("@/views/error/401.vue"),
        meta: { hidden: true },
      },
      {
        path: "404",
        component: () => import("@/views/error/404.vue"),
        meta: { hidden: true },
      },
      {
        path: "profile",
        name: "Profile",
        component: () => import("@/views/profile/index.vue"),
        meta: { title: "Profile", icon: "user", hidden: true },
      },
      {
        path: "profile/notice",
        name: "MyNotice",
        component: () => import("@/views/profile/notice/index.vue"),
        meta: { title: "My Notice", icon: "user", hidden: true },
      },
      {
        path: "/:pathMatch(.*)*",
        name: "DynamicRouteFallback",
        component: () => import("@/views/error/404.vue"),
        meta: { hidden: true },
      },
    ],
  },
];

/**
 * Create router
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: constantRoutes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
});

export function setupRouter(app) {
  app.use(router);
}

export default router;
