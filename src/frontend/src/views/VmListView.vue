<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  IconSearch,
  IconPlus,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconTerminal2,
  IconSettings,
  IconTrash,
  IconDotsVertical,
} from '@tabler/icons-vue'
import { vms, statusLabels, toggleVmStatus, restartVm, type Vm } from '@/data/vms'

const searchQuery = ref('')
const statusFilter = ref<'all' | Vm['status']>('all')
const sortBy = ref<'recent' | 'name'>('recent')

function parseCreatedDate(label: string): number {
  const [day, month, year] = label.split('.').map(Number)
  return new Date(year!, month! - 1, day).getTime()
}

const filteredVms = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const filtered = vms.filter((vm) => {
    const matchesQuery =
      !q || vm.name.toLowerCase().includes(q) || vm.os.toLowerCase().includes(q) || vm.ip.includes(q)
    const matchesStatus = statusFilter.value === 'all' || vm.status === statusFilter.value
    return matchesQuery && matchesStatus
  })
  return [...filtered].sort((a, b) =>
    sortBy.value === 'name'
      ? a.name.localeCompare(b.name, 'da')
      : parseCreatedDate(b.createdLabel) - parseCreatedDate(a.createdLabel),
  )
})

const runningCount = computed(() => vms.filter((vm) => vm.status === 'running').length)
const stoppedCount = computed(() => vms.length - runningCount.value)

const openMenuFor = ref<string | null>(null)
const menuPosition = ref<{ top: number; right: number } | null>(null)

function toggleActionsMenu(event: MouseEvent, name: string) {
  if (openMenuFor.value === name) {
    closeActionsMenu()
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  menuPosition.value = {
    top: rect.bottom + 6,
    right: window.innerWidth - rect.right,
  }
  openMenuFor.value = name
}

function closeActionsMenu() {
  openMenuFor.value = null
  menuPosition.value = null
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (openMenuFor.value && !target.closest('.actions-menu') && !target.closest('.actions-menu__popover')) {
    closeActionsMenu()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeActionsMenu()
}

function handleScroll() {
  if (openMenuFor.value) closeActionsMenu()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('scroll', handleScroll, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('scroll', handleScroll, true)
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page__title">Mine VM'er</h1>
    </div>

    <div class="toolbar">
      <div class="toolbar__filters">
        <label class="toolbar__search">
          <IconSearch :size="18" :stroke-width="1.75" />
          <input v-model="searchQuery" type="text" placeholder="Søg efter VM..." />
        </label>
        <select v-model="statusFilter" class="toolbar__select" aria-label="Filtrer status">
          <option value="all">Status: Alle</option>
          <option value="running">Status: Kører</option>
          <option value="stopped">Status: Stoppet</option>
        </select>
        <select v-model="sortBy" class="toolbar__select" aria-label="Sortering">
          <option value="recent">Sorter: Senest oprettet</option>
          <option value="name">Sorter: Navn (A-Å)</option>
        </select>
      </div>
      <RouterLink to="/vms/new" class="btn-primary">
        <IconPlus :size="18" :stroke-width="2" />
        Opret ny VM
      </RouterLink>
    </div>

    <p class="summary-line">{{ vms.length }} VM'er · {{ runningCount }} kører · {{ stoppedCount }} stoppet</p>

    <p v-if="filteredVms.length === 0" class="empty-state">Ingen VM'er matcher din søgning eller filter.</p>

    <div v-else class="vm-list">
      <article v-for="vm in filteredVms" :key="vm.name" class="vm-card">
        <span class="vm-card__name">{{ vm.name }}</span>

        <div class="vm-card__line">
          <span class="vm-card__status-label" :class="`vm-card__status-label--${vm.status}`">
            {{ statusLabels[vm.status] }}
          </span>
          <span>- {{ vm.os }}</span>
        </div>
        <div class="vm-card__line vm-card__line--muted">
          {{ vm.ip }} - {{ vm.vcpu }} vCPU - {{ vm.ram }} GB RAM - {{ vm.disk }} GB disk
        </div>
        <div class="vm-card__line vm-card__line--muted">
          Oprettet {{ vm.createdLabel }} -
          <template v-if="vm.status === 'running'">Uptime {{ vm.sinceLabel }}</template>
          <template v-else>Sidst kørt {{ vm.sinceLabel }}</template>
        </div>

        <div class="vm-card__actions">
          <RouterLink :to="`/vms/${vm.name}`" class="action-btn action-btn--outline">Åbn detaljer</RouterLink>
          <button
            v-if="vm.status === 'running'"
            type="button"
            class="action-btn action-btn--icon-only"
            title="Terminal"
            aria-label="Terminal"
          >
            <IconTerminal2 :size="16" :stroke-width="1.75" />
          </button>
          <button
            type="button"
            class="action-btn"
            :class="vm.status === 'running' ? 'action-btn--stop' : 'action-btn--start'"
            @click="toggleVmStatus(vm)"
          >
            <IconPlayerStop v-if="vm.status === 'running'" :size="15" :stroke-width="2" />
            <IconPlayerPlay v-else :size="15" :stroke-width="2" />
            {{ vm.status === 'running' ? 'Stop' : 'Start' }}
          </button>
          <div class="actions-menu">
            <button
              type="button"
              class="action-btn action-btn--icon-only"
              aria-label="Flere handlinger"
              :aria-expanded="openMenuFor === vm.name"
              @click.stop="toggleActionsMenu($event, vm.name)"
            >
              <IconDotsVertical :size="16" :stroke-width="1.75" />
            </button>
            <Teleport to="body">
              <Transition name="actions-menu">
                <div
                  v-if="openMenuFor === vm.name && menuPosition"
                  class="actions-menu__popover"
                  role="menu"
                  :style="{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }"
                >
                  <button
                    type="button"
                    class="actions-menu__item"
                    role="menuitem"
                    :disabled="vm.status === 'stopped'"
                    @click="restartVm(vm); closeActionsMenu()"
                  >
                    <IconRefresh :size="15" :stroke-width="1.75" />
                    <span>Genstart</span>
                  </button>
                  <button type="button" class="actions-menu__item" role="menuitem" @click="closeActionsMenu">
                    <IconSettings :size="15" :stroke-width="1.75" />
                    <span>Indstillinger</span>
                  </button>
                  <div class="actions-menu__divider" />
                  <button
                    type="button"
                    class="actions-menu__item actions-menu__item--danger"
                    role="menuitem"
                    @click="closeActionsMenu"
                  >
                    <IconTrash :size="15" :stroke-width="1.75" />
                    <span>Slet</span>
                  </button>
                </div>
              </Transition>
            </Teleport>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-head {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.page__title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  color: #1f2430;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.toolbar__filters {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.toolbar__search {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 260px;
  max-width: 100%;
  height: 40px;
  padding: 0 0.9rem;
  border-radius: 10px;
  border: 1px solid #d5d5d5;
  background: #fff;
  color: #9aa0ac;
}

.toolbar__search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 0.88rem;
  color: #1f2430;
  background: transparent;
}

.toolbar__search input::placeholder {
  color: #9aa0ac;
}

.toolbar__select {
  height: 40px;
  padding: 0 0.75rem;
  border-radius: 10px;
  border: 1px solid #d5d5d5;
  background: #fff;
  color: #1f2430;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  height: 40px;
  padding: 0 1rem;
  border: none;
  border-radius: 9px;
  background: #2b6fc2;
  color: #fff;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-primary:hover {
  background: #1c5fa8;
}

.summary-line {
  margin: 0;
  font-size: 0.82rem;
  color: #6b7280;
}

.empty-state {
  margin: 0;
  padding: 2rem 1rem;
  text-align: center;
  color: #9aa0ac;
  font-size: 0.9rem;
  border: 1px dashed #d1d1d1;
  border-radius: 14px;
  background: #fff;
}

.vm-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.vm-card {
  padding: 1.2rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  border: solid 1px #d1d1d1;
  border-radius: 14px;
  background-color: #ffffff;
  box-shadow: 0 3px 7px rgba(0, 0, 0, 0.21);
}

.vm-card__name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1f2430;
}

.vm-card__line {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.86rem;
  color: #4b5160;
}

.vm-card__status-label {
  font-weight: 600;
}

.vm-card__line--muted {
  font-size: 0.8rem;
  color: #9aa0ac;
}

.vm-card__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  height: 34px;
  padding: 0 0.75rem;
  border-radius: 7px;
  border: 1px solid #e6e8ec;
  background: #fff;
  color: #4b5160;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, opacity 0.12s ease;
}

.action-btn--icon-only {
  width: 34px;
  padding: 0;
}

.action-btn:hover:not(:disabled):not(.action-btn--start):not(.action-btn--stop) {
  border-color: #2b6fc2;
  color: #1c5fa8;
}

.action-btn--outline {
  border-color: #2b6fc2;
  color: #1c5fa8;
}

.action-btn--outline:hover {
  background: #eaf1fb;
}

.action-btn--start {
  border-color: #2f9e44;
  background: #2f9e44;
  color: #fff;
}

.action-btn--start:hover {
  border-color: #268a3a;
  background: #268a3a;
}

.action-btn--stop {
  border-color: #e03131;
  background: #e03131;
  color: #fff;
}

.action-btn--stop:hover {
  border-color: #c92a2a;
  background: #c92a2a;
}

.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.actions-menu {
  position: relative;
}

.actions-menu__popover {
  position: fixed;
  min-width: 170px;
  background: #fff;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(20, 24, 33, 0.12);
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  z-index: 1000;
}

.actions-menu__item {
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

.actions-menu__item:hover:not(:disabled) {
  background: #eaf1fb;
  color: #1c5fa8;
}

.actions-menu__item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.actions-menu__item--danger {
  color: #c53030;
}

.actions-menu__item--danger:hover:not(:disabled) {
  background: #fdecec;
  color: #c53030;
}

.actions-menu__divider {
  height: 1px;
  margin: 0.25rem 0.2rem;
  background: #e6e8ec;
}
</style>
