import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { applyTheme, loadTheme } from '@/lib/theme-storage'

applyTheme(loadTheme())

const app = createApp(App)

app.use(router)

app.mount('#app')
