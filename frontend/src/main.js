import { createApp } from 'vue'
import './style.css'
import './assets/main.css'
import App from './App.vue'
import router from './router/index.js'
import { initAuth } from './composables/useAuth.js'

initAuth().finally(() => {
  createApp(App).use(router).mount('#app')
})
