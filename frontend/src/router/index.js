import { createRouter, createWebHistory } from 'vue-router'
import HelloWorld from '../components/HelloWorld.vue'
import RegisterPage from '../views/RegisterPage.vue'
import LoginPage from '../views/LoginPage.vue'
import CreatePage from '../pages/CreatePage.vue'
import GalleryPage from '../views/GalleryPage.vue'
import { supabase } from '../lib/supabase.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HelloWorld,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
      meta: { guestOnly: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { guestOnly: true },
    },
    {
      path: '/generate',
      name: 'Generate',
      component: CreatePage,
      meta: { requiresAuth: true },
    },
    {
      path: '/gallery',
      name: 'Gallery',
      component: GalleryPage,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Failed to read auth session:', error.message)
  }

  const isAuthenticated = Boolean(data.session)

  if (to.meta.requiresAuth && !isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return { path: '/gallery' }
  }

  return true
})

export default router
