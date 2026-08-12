import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import VmListView from '@/views/VmListView.vue'
import VmDetailView from '@/views/VmDetailView.vue'
import CreateVmView from '@/views/CreateVmView.vue'
import TemplatesView from '@/views/TemplatesView.vue'
import InfoView from '@/views/InfoView.vue'
import SettingsView from '@/views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
  { path: '/', name: 'home', component: HomeView },
  { path: '/vms', name: 'vms', component: VmListView },
  { path: '/vms/new', name: 'vm-create', component: CreateVmView },
  { path: '/vms/:name', name: 'vm-detail', component: VmDetailView },
  { path: '/templates', name: 'templates', component: TemplatesView },
  { path: '/info', name: 'info', component: InfoView },
  { path: '/settings', name: 'settings', component: SettingsView },
]
})

export default router
