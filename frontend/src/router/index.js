import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import RegisterPage from '../views/RegisterPage.vue'
import LoginPage from '../views/LoginPage.vue'
import CreatePage from '../pages/CreatePage.vue'
import GalleryPage from '../pages/GalleryPage.vue'
import { initAuth, useAuthState } from '../lib/authSession.js'

const { session } = useAuthState()

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomePage,
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
  try {
    await initAuth()
  } catch (error) {
    console.error('Failed to initialize auth session:', error.message)
  }

  const isAuthenticated = Boolean(session.value)

  if (to.meta.requiresAuth && !isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return { path: '/' }
  }

  return true
})

export default router
