import { createApp } from 'vue'
import App from './App.vue'
import { createHackStore } from './store'
import './styles.css'

const app = createApp(App)
app.provide('hacklab', createHackStore())
app.mount('#app')
