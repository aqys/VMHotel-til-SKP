<script setup lang="ts">
import { useRoute } from 'vue-router'
import {
  IconLayoutDashboard, IconLayoutDashboardFilled,
  IconDeviceDesktop, IconDeviceDesktopFilled,
  IconFile, IconFileFilled,
  IconSettings, IconSettingsFilled,
  IconInfoCircle, IconInfoCircleFilled,
} from '@tabler/icons-vue'

const route = useRoute()

const links = [
  { to: '/', label: "Dashboard", icon: IconLayoutDashboard, iconFilled: IconLayoutDashboardFilled },
  { to: '/vms', label: "VM's", icon: IconDeviceDesktop, iconFilled: IconDeviceDesktopFilled },
  { to: '/templates', label: "Templates", icon: IconFile, iconFilled: IconFileFilled },
  { to: '/info', label: "Information", icon: IconInfoCircle, iconFilled: IconInfoCircleFilled },
  { to: '/settings', label: "Indstillinger", icon: IconSettings, iconFilled: IconSettingsFilled },
]
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__title">VMHotel</div>
    <nav class="sidebar__nav">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="sidebar__link"
        active-class="sidebar__link--active"
      >
        <component :is="link.to === route.path ? link.iconFilled : link.icon" :size="24" :stroke-width="2" />
        {{ link.label }}
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 300px;
  flex-shrink: 0;
  height: 100vh;
  padding: 0.3rem;
  box-sizing: border-box;
  background: #ecf0f3;
  color: #010101;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar__title {
  font-size: 2rem;
  font-weight: bold;
  padding-bottom: 0.5rem;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: .6rem;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #141418;
  text-decoration: none;
  width: 85%;
  padding: 0.75rem .75rem;
  border-radius: 8px;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
  font-size: 1.15rem;
}

.sidebar__link:hover {
  background: rgba(220, 225, 231, 0.807);
  color: #5598d7;
}

.sidebar__link--active {
  background: rgba(220, 225, 231, 0.807);
  color: #3179bd;
  font-weight: 600;
}

.sidebar__link--active:hover {
  background: rgba(220, 225, 231, 0.807);
}
</style>
