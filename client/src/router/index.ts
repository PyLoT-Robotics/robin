import { createRouter, createWebHistory } from 'vue-router'
import Controller from '../pages/controller.vue'
import Face from '../pages/face.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: Controller, name: "controller" },
    { path: '/face', component: Face, name: "face" },
  ],
})

export default router