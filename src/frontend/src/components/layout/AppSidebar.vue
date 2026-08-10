<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  IconLayoutDashboard, IconLayoutDashboardFilled,
  IconDeviceDesktop, IconDeviceDesktopFilled,
  IconFile, IconFileFilled,
  IconSettings, IconSettingsFilled,
  IconInfoCircle, IconInfoCircleFilled,
  IconDotsVertical,
  IconUser,
  IconLogout,
} from '@tabler/icons-vue'
import logo from '@/assets/logo.png'

const route = useRoute()

const userMenuRef = ref<HTMLElement | null>(null)
const isUserMenuOpen = ref(false)

function toggleUserMenu() {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

function closeUserMenu() {
  isUserMenuOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (isUserMenuOpen.value && !userMenuRef.value?.contains(event.target as Node)) {
    closeUserMenu()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeUserMenu()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})

function logOut() {
  closeUserMenu()
  // TODO: add auth når implemented
}

const sections = [
  {
    title: 'Hovedmenu',
    links: [
      { to: '/', label: 'Dashboard', icon: IconLayoutDashboard, iconFilled: IconLayoutDashboardFilled },
      { to: '/vms', label: "VM'er", icon: IconDeviceDesktop, iconFilled: IconDeviceDesktopFilled },
      { to: '/templates', label: 'Templates', icon: IconFile, iconFilled: IconFileFilled },
    ],
  },
  {
    title: 'System',
    links: [
      { to: '/info', label: 'Information', icon: IconInfoCircle, iconFilled: IconInfoCircleFilled },
      { to: '/settings', label: 'Indstillinger', icon: IconSettings, iconFilled: IconSettingsFilled },
    ],
  },
]

// placeholder
const currentUser = {
  name: 'Mikkel Larsen',
  role: 'Elev',
}

const initials = currentUser.name
  .split(' ')
  .map((part) => part[0])
  .join('')
  .toUpperCase()
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__brand">
      <img class="sidebar__logo" :src="logo" alt="VMHotel logo" />
      <div class="sidebar__brand-text">
        <span class="sidebar__brand-name">VMHotel</span>
      </div>
    </div>

    <nav class="sidebar__nav">
      <div v-for="section in sections" :key="section.title" class="sidebar__section">
        <div class="sidebar__section-title">{{ section.title }}</div>
        <RouterLink
          v-for="link in section.links"
          :key="link.to"
          :to="link.to"
          class="sidebar__link"
          active-class="sidebar__link--active"
          :title="link.label"
        >
          <component :is="link.to === route.path ? link.iconFilled : link.icon" :size="19" :stroke-width="1.75" class="sidebar__link-icon" />
          <span class="sidebar__link-label">{{ link.label }}</span>
        </RouterLink>
      </div>
    </nav>

    <div ref="userMenuRef" class="sidebar__user">
      <div class="sidebar__avatar">{{ initials }}</div>
      <div class="sidebar__user-text">
        <span class="sidebar__user-name">{{ currentUser.name }}</span>
        <span class="sidebar__user-role">{{ currentUser.role }}</span>
      </div>
      <button
        type="button"
        class="sidebar__user-menu-trigger"
        aria-label="Brugermenu"
        :aria-expanded="isUserMenuOpen"
        @click="toggleUserMenu"
      >
        <IconDotsVertical :size="17" :stroke-width="1.75" />
      </button>

      <Transition name="user-menu">
        <div v-if="isUserMenuOpen" class="sidebar__user-popover" role="menu">
          <RouterLink to="/settings" class="sidebar__user-popover-item" role="menuitem" @click="closeUserMenu">
            <IconUser :size="16" :stroke-width="1.75" />
            <span>Min profil</span>
          </RouterLink>
          <div class="sidebar__user-popover-divider" />
          <button type="button" class="sidebar__user-popover-item sidebar__user-popover-item--danger" role="menuitem" @click="logOut">
            <IconLogout :size="16" :stroke-width="1.75" />
            <span>Log ud</span>
          </button>
        </div>
      </Transition>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  flex-shrink: 0;
  height: 100vh;
  box-sizing: border-box;
  background: #f8f9fb;
  border-right: 1px solid #e6e8ec;
  color: #1f2430;
  display: flex;
  flex-direction: column;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 1.1rem;
  border-bottom: 1px solid #e6e8ec;
}

.sidebar__logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  flex-shrink: 0;
}

.sidebar__brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar__brand-name {
  font-size: 1.25rem;
  font-weight: 700;
}

.sidebar__brand-subtitle {
  font-size: 0.7rem;
  color: #9aa0ac;
  font-weight: 500;
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sidebar__section {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.sidebar__section-title {
  font-size: 0.68rem;
  font-weight: 600;
  color: #9aa0ac;
  letter-spacing: 0.06em;
  padding: 0 0.6rem 0.45rem;
}

.sidebar__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  height: 44px;
  padding: 0 0.6rem;
  border-radius: 8px;
  color: #4b5160;
  text-decoration: none;
  font-size: 0.9rem;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.sidebar__link-icon {
  flex-shrink: 0;
  color: #7c828f;
  transition: color 0.12s ease;
}

.sidebar__link-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__link:hover {
  background: #eaf1fb;
  color: #1c5fa8;
}

.sidebar__link:hover .sidebar__link-icon {
  color: #2b6fc2;
}

.sidebar__link--active {
  background: #eaf1fb;
  color: #1c5fa8;
  font-weight: 600;
}

.sidebar__link--active .sidebar__link-icon {
  color: #2b6fc2;
}

.sidebar__link--active::before {
  content: '';
  position: absolute;
  left: -0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  border-radius: 0 3px 3px 0;
  background: #2b6fc2;
}

.sidebar__link:focus-visible {
  outline: 2px solid #2b6fc2;
  outline-offset: -2px;
}

.sidebar__user {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.1rem;
  border-top: 1px solid #e6e8ec;
}

.sidebar__avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #2b6fc2;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar__user-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.sidebar__user-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #232734;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__user-role {
  font-size: 0.72rem;
  color: #9aa0ac;
}

.sidebar__user-menu-trigger {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #9aa0ac;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.sidebar__user-menu-trigger:hover,
.sidebar__user-menu-trigger[aria-expanded='true'] {
  background: #eaf1fb;
  color: #1c5fa8;
}

.sidebar__user-menu-trigger:focus-visible {
  outline: 2px solid #2b6fc2;
  outline-offset: 1px;
}

.sidebar__user-popover {
  position: absolute;
  right: 0.75rem;
  bottom: calc(100% + 0.4rem);
  min-width: 170px;
  background: #fff;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(20, 24, 33, 0.12);
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  z-index: 20;
}

.sidebar__user-popover-item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  height: 34px;
  padding: 0 0.6rem;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #4b5160;
  font-size: 0.84rem;
  text-decoration: none;
  cursor: pointer;
  font-family: inherit;
}

.sidebar__user-popover-item:hover {
  background: #eaf1fb;
  color: #1c5fa8;
}

.sidebar__user-popover-item--danger {
  color: #c53030;
}

.sidebar__user-popover-item--danger:hover {
  background: #fdecec;
  color: #c53030;
}

.sidebar__user-popover-divider {
  height: 1px;
  margin: 0.25rem 0.2rem;
  background: #e6e8ec;
}

.user-menu-enter-active,
.user-menu-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.user-menu-enter-from,
.user-menu-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

</style>
