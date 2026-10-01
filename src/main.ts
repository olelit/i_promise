import { createApp } from 'vue'
import App from './App.vue'
import { locale, m, messages } from './i18n'

document.documentElement.lang = locale
document.title = m(messages.appTitle)

createApp(App).mount('#app')
