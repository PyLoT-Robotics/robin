import { createRouter, createWebHistory } from 'vue-router'
import Controller from '../pages/controller.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: Controller, name: "controller" },
  ],
})

export default router