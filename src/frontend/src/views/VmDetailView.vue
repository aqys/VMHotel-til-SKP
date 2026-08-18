<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconTerminal2,
  IconRefresh,
  IconPlayerPlay,
  IconPlayerStop,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconPlus,
  IconX,
} from '@tabler/icons-vue'
import { vms, statusLabels, toggleVmStatus, restartVm, forceStopVm, updateVmResource } from '@/data/vms'
import { vmActivity, logVmActivity, formatNowLabel } from '@/data/vmActivity'
import { vmSnapshots, type VmSnapshot } from '@/data/vmSnapshots'
import { quotas } from '@/data/quotas'
import AppModal from '@/components/common/AppModal.vue'

const route = useRoute()
const router = useRouter()

const vm = computed(() => vms.find((candidate) => candidate.name === route.params.name))

type TabId = 'oversigt' | 'hardware' | 'snapshots' | 'aktivitet'
const tabs: { id: TabId; label: string }[] = [
  { id: 'oversigt', label: 'Oversigt' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'snapshots', label: 'Snapshots' },
  { id: 'aktivitet', label: 'Aktivitet' },
]
const activeTab = ref<TabId>('oversigt')

// --- Header "..." menu --------------------------------------------------
const headerMenuOpen = ref(false)
function toggleHeaderMenu() {
  headerMenuOpen.value = !headerMenuOpen.value
}
function closeHeaderMenu() {
  headerMenuOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (headerMenuOpen.value && !target.closest('.header-menu')) closeHeaderMenu()
}
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeHeaderMenu()
}
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})

function handleForceStop() {
  if (!vm.value) return
  forceStopVm(vm.value)
  closeHeaderMenu()
}

// --- Modals ---------------------------------------------------------------
// Mock, client-side only (no backend yet) — but every action here mutates
// the shared reactive `vms`/`vmActivity`/`vmSnapshots` state, so the
// Dashboard, "Mine VM'er" list, and this page always agree with each other.
type ModalState =
  | { type: 'terminal' }
  | { type: 'delete-vm' }
  | { type: 'edit-vm' }
  | { type: 'edit-resource'; field: 'vcpu' | 'ram' | 'disk' }
  | { type: 'create-snapshot' }
  | { type: 'rollback-snapshot'; snapshot: VmSnapshot }
  | { type: 'delete-snapshot'; snapshot: VmSnapshot }

const activeModal = ref<ModalState | null>(null)
function closeModal() {
  activeModal.value = null
}

const editingField = computed(() => (activeModal.value?.type === 'edit-resource' ? activeModal.value.field : null))
const rollbackTarget = computed(() =>
  activeModal.value?.type === 'rollback-snapshot' ? activeModal.value.snapshot : null,
)
const deleteSnapshotTarget = computed(() =>
  activeModal.value?.type === 'delete-snapshot' ? activeModal.value.snapshot : null,
)

// --- Resource usage bars (Oversigt) ---------------------------------------
function usageColor(percent: number) {
  if (percent >= 90) return '#e03131'
  if (percent >= 70) return '#f08c00'
  return '#2b6fc2'
}

const resourceRows = computed(() => {
  if (!vm.value) return []
  const v = vm.value
  const running = v.status === 'running'
  return [
    {
      key: 'cpu',
      label: 'CPU',
      valueText: running ? `${v.cpuUsagePercent}%` : '—',
      percent: running ? v.cpuUsagePercent : 0,
      footnote: `${v.vcpu} vCPU`,
    },
    {
      key: 'ram',
      label: 'RAM',
      valueText: running ? `${v.ramUsedGb} / ${v.ram} GB` : `— / ${v.ram} GB`,
      percent: running ? Math.round((v.ramUsedGb / v.ram) * 100) : 0,
      footnote: null,
    },
    {
      key: 'disk',
      label: 'Disk',
      valueText: `${v.diskUsedGb} / ${v.disk} GB`,
      percent: Math.round((v.diskUsedGb / v.disk) * 100),
      footnote: null,
    },
  ]
})

// --- Info panels (Oversigt) ------------------------------------------------
const statusInfoRows = computed(() => {
  if (!vm.value) return []
  const v = vm.value
  return [
    { label: 'Status', value: statusLabels[v.status] },
    { label: 'Uptime', value: v.status === 'running' ? v.sinceLabel : '—' },
    { label: 'IP', value: v.ip },
    { label: 'Node', value: v.node },
    { label: 'VM ID', value: String(v.vmId) },
    { label: 'Oprettet', value: v.createdLabel },
  ]
})

const vmInfoRows = computed(() => {
  if (!vm.value) return []
  const v = vm.value
  const rows = [
    { label: 'Operativsystem', value: v.os },
    { label: 'Template', value: v.template },
    { label: 'Hostname', value: v.hostname },
    { label: 'VM ID', value: String(v.vmId) },
    { label: 'Node', value: v.node },
    { label: 'Oprettet', value: `${v.createdLabel} ${v.createdTimeLabel}` },
  ]
  if (v.description) rows.push({ label: 'Beskrivelse', value: v.description })
  return rows
})

const networkRows = computed(() => {
  if (!vm.value) return []
  const v = vm.value
  return [
    { label: 'IP-adresse', value: v.ip },
    { label: 'MAC', value: v.mac },
    { label: 'Bridge', value: v.bridge },
  ]
})

// --- Hardware tab: resource edit modal -------------------------------------
const resourceLabels = { vcpu: 'CPU', ram: 'RAM', disk: 'Disk' } as const
const resourceQuotaMax: Record<'vcpu' | 'ram' | 'disk', number> = {
  vcpu: quotas.maxVcpu,
  ram: quotas.maxRamGb,
  disk: quotas.maxDiskGb,
}

const resourceModalTitle = computed(() => (editingField.value ? resourceLabels[editingField.value] : ''))

const currentResourceLabel = computed(() => {
  if (!vm.value || !editingField.value) return ''
  const value = vm.value[editingField.value]
  return editingField.value === 'vcpu' ? `${value} vCPU` : `${value} GB`
})

// Disk can only be expanded, never shrunk — the option list simply never
// offers a smaller value.
const resourceModalOptions = computed<number[]>(() => {
  if (!vm.value || !editingField.value) return []
  if (editingField.value === 'disk') {
    const current = vm.value.disk
    return [current, current + 10, current + 20, current + 40]
  }
  return editingField.value === 'ram' ? [1, 2, 4, 6, 8, 12, 16] : [1, 2, 4, 6, 8]
})

const selectedResourceValue = ref<number | null>(null)

function openResourceModal(field: 'vcpu' | 'ram' | 'disk') {
  if (!vm.value) return
  selectedResourceValue.value = vm.value[field]
  activeModal.value = { type: 'edit-resource', field }
}

const resourceQuotaAfterChange = computed(() => {
  if (!vm.value || !editingField.value || selectedResourceValue.value == null) return null
  const field = editingField.value
  const others = vms.filter((v) => v.name !== vm.value!.name).reduce((sum, v) => sum + v[field], 0)
  return others + selectedResourceValue.value
})

const resourceExceedsQuota = computed(
  () => editingField.value != null && (resourceQuotaAfterChange.value ?? 0) > resourceQuotaMax[editingField.value],
)

const resourceQuotaPreviewText = computed(() => {
  if (!editingField.value || resourceQuotaAfterChange.value == null) return ''
  const unit = editingField.value === 'vcpu' ? '' : ' GB'
  return `${resourceQuotaAfterChange.value}${unit} / ${resourceQuotaMax[editingField.value]}${unit}`
})

function saveResourceEdit() {
  const currentVm = vm.value
  const field = editingField.value
  if (!currentVm || !field || selectedResourceValue.value == null || resourceExceedsQuota.value) return
  updateVmResource(currentVm, field, selectedResourceValue.value)
  closeModal()
}

// --- Header "Rediger" modal (name + description only — CPU/RAM/disk are
// edited from the Hardware tab, so we don't duplicate that UI here) --------
const editVmName = ref('')
const editVmDescription = ref('')

function openEditVmModal() {
  if (!vm.value) return
  editVmName.value = vm.value.name
  editVmDescription.value = vm.value.description ?? ''
  activeModal.value = { type: 'edit-vm' }
  closeHeaderMenu()
}

function saveEditVm() {
  const currentVm = vm.value
  if (!currentVm || !editVmName.value.trim()) return
  const previousName = currentVm.name
  const newName = editVmName.value.trim()
  currentVm.description = editVmDescription.value.trim() || undefined

  if (newName !== previousName) {
    currentVm.name = newName
    // Carry the activity log and snapshots over to the new key so a rename
    // doesn't orphan the VM's history.
    if (vmActivity[previousName]) {
      vmActivity[newName] = vmActivity[previousName]
      delete vmActivity[previousName]
    }
    if (vmSnapshots[previousName]) {
      vmSnapshots[newName] = vmSnapshots[previousName]
      delete vmSnapshots[previousName]
    }
    logVmActivity(newName, `VM omdøbt fra "${previousName}" til "${newName}"`)
    closeModal()
    router.replace(`/vms/${newName}`)
  } else {
    logVmActivity(newName, 'VM-oplysninger opdateret')
    closeModal()
  }
}

// --- Delete VM --------------------------------------------------------
function openDeleteVmModal() {
  activeModal.value = { type: 'delete-vm' }
  closeHeaderMenu()
}

function confirmDeleteVm() {
  if (!vm.value) return
  const name = vm.value.name
  const index = vms.findIndex((v) => v.name === name)
  if (index !== -1) vms.splice(index, 1)
  delete vmActivity[name]
  delete vmSnapshots[name]
  closeModal()
  router.push('/vms')
}

// --- Snapshots tab ----------------------------------------------------
const currentSnapshots = computed(() => (vm.value ? (vmSnapshots[vm.value.name] ?? []) : []))
const snapshotCountLabel = computed(
  () => `Snapshots: ${currentSnapshots.value.length} / ${quotas.maxSnapshotsPerVm}`,
)
const canCreateSnapshot = computed(() => currentSnapshots.value.length < quotas.maxSnapshotsPerVm)

const newSnapshotName = ref('')
const newSnapshotDescription = ref('')

function openCreateSnapshotModal() {
  newSnapshotName.value = ''
  newSnapshotDescription.value = ''
  activeModal.value = { type: 'create-snapshot' }
}

function createSnapshot() {
  const currentVm = vm.value
  if (!currentVm || !newSnapshotName.value.trim() || !canCreateSnapshot.value) return
  const name = newSnapshotName.value.trim()
  const list = vmSnapshots[currentVm.name] ?? (vmSnapshots[currentVm.name] = [])
  list.unshift({
    id: `${currentVm.name}-${Date.now()}`,
    name,
    createdLabel: formatNowLabel(),
    description: newSnapshotDescription.value.trim() || undefined,
  })
  logVmActivity(currentVm.name, `Snapshot "${name}" oprettet`)
  closeModal()
}

function openRollbackModal(snapshot: VmSnapshot) {
  activeModal.value = { type: 'rollback-snapshot', snapshot }
}

function confirmRollback() {
  const currentVm = vm.value
  const target = rollbackTarget.value
  if (!currentVm || !target) return
  logVmActivity(currentVm.name, `Gendannet til snapshot "${target.name}"`)
  closeModal()
}

function openDeleteSnapshotModal(snapshot: VmSnapshot) {
  activeModal.value = { type: 'delete-snapshot', snapshot }
}

function confirmDeleteSnapshot() {
  const currentVm = vm.value
  const target = deleteSnapshotTarget.value
  if (!currentVm || !target) return
  const list = vmSnapshots[currentVm.name]
  if (list) {
    const idx = list.findIndex((s) => s.id === target.id)
    if (idx !== -1) list.splice(idx, 1)
  }
  logVmActivity(currentVm.name, `Snapshot "${target.name}" slettet`)
  closeModal()
}

// --- Activity tab -----------------------------------------------------
const activityEntries = computed(() => (vm.value ? (vmActivity[vm.value.name] ?? []) : []))
</script>

<template>
  <div class="page">
    <RouterLink to="/vms" class="back-link">
      <IconArrowLeft :size="16" :stroke-width="2" />
      Mine VM'er
    </RouterLink>

    <template v-if="vm">
      <header class="vm-header">
        <div class="vm-header__info">
          <div class="vm-header__title-row">
            <h1 class="vm-header__name">{{ vm.name }}</h1>
            <span class="vm-header__status" :class="`vm-header__status--${vm.status}`">
              {{ statusLabels[vm.status] }}
            </span>
          </div>
          <p class="vm-header__os">{{ vm.os }}</p>
          <p class="vm-header__meta">VM ID {{ vm.vmId }} · {{ vm.ip }} · {{ vm.node }}</p>
        </div>

        <div class="vm-header__actions">
          <button v-if="vm.status === 'running'" type="button" class="action-btn" @click="activeModal = { type: 'terminal' }">
            <IconTerminal2 :size="16" :stroke-width="1.75" />
            Terminal
          </button>
          <button v-if="vm.status === 'running'" type="button" class="action-btn" @click="restartVm(vm)">
            <IconRefresh :size="16" :stroke-width="1.75" />
            Genstart
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
          <div class="header-menu">
            <button
              type="button"
              class="action-btn action-btn--icon-only"
              aria-label="Flere handlinger"
              :aria-expanded="headerMenuOpen"
              @click.stop="toggleHeaderMenu"
            >
              <IconDotsVertical :size="16" :stroke-width="1.75" />
            </button>
            <div v-if="headerMenuOpen" class="header-menu__popover" role="menu">
              <button type="button" class="header-menu__item" role="menuitem" @click="openEditVmModal">
                <IconPencil :size="15" :stroke-width="1.75" />
                <span>Rediger</span>
              </button>
              <button
                v-if="vm.status === 'running'"
                type="button"
                class="header-menu__item"
                role="menuitem"
                @click="handleForceStop"
              >
                <IconPlayerStop :size="15" :stroke-width="1.75" />
                <span>Gennemtving stop</span>
              </button>
              <div class="header-menu__divider" />
              <button
                type="button"
                class="header-menu__item header-menu__item--danger"
                role="menuitem"
                @click="openDeleteVmModal"
              >
                <IconTrash :size="15" :stroke-width="1.75" />
                <span>Slet VM</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="tabs__item"
          :class="{ 'tabs__item--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- Oversigt -->
      <div v-if="activeTab === 'oversigt'" class="tab-panel">
        <section class="panel">
          <h2 class="panel__title">Status &amp; information</h2>
          <div class="info-grid">
            <div v-for="row in statusInfoRows" :key="row.label" class="info-grid__item">
              <span class="info-grid__label">{{ row.label }}</span>
              <span class="info-grid__value">{{ row.value }}</span>
            </div>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel__title">Ressourceforbrug</h2>
          <div class="resource-rows">
            <div v-for="row in resourceRows" :key="row.key" class="resource-row">
              <div class="resource-row__head">
                <span class="resource-row__label">{{ row.label }}</span>
                <span class="resource-row__value">{{ row.valueText }}</span>
              </div>
              <div class="resource-row__track">
                <div
                  class="resource-row__fill"
                  :style="{ width: `${row.percent}%`, background: usageColor(row.percent) }"
                />
              </div>
              <span v-if="row.footnote" class="resource-row__footnote">{{ row.footnote }}</span>
            </div>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel__title">Virtuel maskine</h2>
          <div class="detail-rows">
            <div v-for="row in vmInfoRows" :key="row.label" class="detail-rows__item">
              <span class="detail-rows__label">{{ row.label }}</span>
              <span class="detail-rows__value">{{ row.value }}</span>
            </div>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel__title">Netværk</h2>
          <div class="detail-rows">
            <div v-for="row in networkRows" :key="row.label" class="detail-rows__item">
              <span class="detail-rows__label">{{ row.label }}</span>
              <span class="detail-rows__value">{{ row.value }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- Hardware -->
      <div v-else-if="activeTab === 'hardware'" class="tab-panel">
        <section class="panel">
          <h2 class="panel__title">Hardware</h2>
          <div class="hw-rows">
            <div class="hw-row">
              <div class="hw-row__info">
                <span class="hw-row__label">CPU</span>
                <span class="hw-row__value">{{ vm.vcpu }} vCPU kerner</span>
              </div>
              <button type="button" class="btn-outline-sm" @click="openResourceModal('vcpu')">Rediger</button>
            </div>
            <div class="hw-row">
              <div class="hw-row__info">
                <span class="hw-row__label">RAM</span>
                <span class="hw-row__value">{{ vm.ram }} GB</span>
              </div>
              <button type="button" class="btn-outline-sm" @click="openResourceModal('ram')">Rediger</button>
            </div>
            <div class="hw-row">
              <div class="hw-row__info">
                <span class="hw-row__label">Disk</span>
                <span class="hw-row__value">{{ vm.disk }} GB</span>
              </div>
              <button type="button" class="btn-outline-sm" @click="openResourceModal('disk')">Udvid disk</button>
            </div>
            <div class="hw-row">
              <div class="hw-row__info">
                <span class="hw-row__label">Netværkskort</span>
                <span class="hw-row__value">{{ vm.nic }} · {{ vm.bridge }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Snapshots -->
      <div v-else-if="activeTab === 'snapshots'" class="tab-panel">
        <section class="panel">
          <div class="panel__head-row">
            <h2 class="panel__title">Snapshots</h2>
            <button type="button" class="btn-primary" :disabled="!canCreateSnapshot" @click="openCreateSnapshotModal">
              <IconPlus :size="16" :stroke-width="2" />
              Opret snapshot
            </button>
          </div>
          <p class="snapshot-quota">{{ snapshotCountLabel }}</p>

          <p v-if="currentSnapshots.length === 0" class="empty-state">Ingen snapshots endnu.</p>
          <div v-else class="snapshot-list">
            <div v-for="snap in currentSnapshots" :key="snap.id" class="snapshot-row">
              <div class="snapshot-row__info">
                <span class="snapshot-row__name">{{ snap.name }}</span>
                <span class="snapshot-row__date">{{ snap.createdLabel }}</span>
              </div>
              <div class="snapshot-row__actions">
                <button type="button" class="action-btn" @click="openRollbackModal(snap)">Rollback</button>
                <button
                  type="button"
                  class="action-btn action-btn--icon-only"
                  title="Slet snapshot"
                  aria-label="Slet snapshot"
                  @click="openDeleteSnapshotModal(snap)"
                >
                  <IconTrash :size="15" :stroke-width="1.75" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Aktivitet -->
      <div v-else class="tab-panel">
        <section class="panel">
          <h2 class="panel__title">Aktivitet</h2>
          <p v-if="activityEntries.length === 0" class="empty-state">Ingen aktivitet endnu.</p>
          <ul v-else class="timeline">
            <li v-for="entry in activityEntries" :key="entry.id" class="timeline__item">
              <span class="timeline__time">{{ entry.timestampLabel }}</span>
              <span class="timeline__text" :class="{ 'timeline__text--failed': entry.failed }">{{ entry.text }}</span>
              <span v-if="entry.detail" class="timeline__detail">{{ entry.detail }}</span>
              <span v-if="entry.actor" class="timeline__actor">af {{ entry.actor }}</span>
            </li>
          </ul>
        </section>
      </div>
    </template>

    <template v-else>
      <h1 class="page__title">VM ikke fundet</h1>
      <p class="empty-state">Der findes ingen VM med navnet "{{ route.params.name }}".</p>
    </template>

    <!-- Terminal -->
    <AppModal v-if="activeModal?.type === 'terminal' && vm" size="lg" @close="closeModal">
      <div class="modal-head">
        <h2 class="modal-title">{{ vm.name }} — Console</h2>
        <button type="button" class="icon-btn" aria-label="Luk" @click="closeModal">
          <IconX :size="18" :stroke-width="1.75" />
        </button>
      </div>
      <div class="terminal-mock">{{ vm.hostname }} login:</div>
    </AppModal>

    <!-- Delete VM -->
    <AppModal v-else-if="activeModal?.type === 'delete-vm' && vm" size="sm" @close="closeModal">
      <h2 class="modal-title">Slet {{ vm.name }}?</h2>
      <p class="modal-text">VM'en og dens data slettes permanent. Handlingen kan ikke fortrydes.</p>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" @click="closeModal">Annuller</button>
        <button type="button" class="btn-danger" @click="confirmDeleteVm">Slet VM</button>
      </div>
    </AppModal>

    <!-- Rediger VM -->
    <AppModal v-else-if="activeModal?.type === 'edit-vm'" @close="closeModal">
      <h2 class="modal-title">Rediger VM</h2>
      <label class="form-field">
        <span>VM-navn</span>
        <input v-model="editVmName" type="text" />
      </label>
      <label class="form-field">
        <span>Beskrivelse (valgfri)</span>
        <textarea v-model="editVmDescription" rows="3" placeholder="Valgfri beskrivelse..." />
      </label>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" @click="closeModal">Annuller</button>
        <button type="button" class="btn-primary" :disabled="!editVmName.trim()" @click="saveEditVm">Gem</button>
      </div>
    </AppModal>

    <!-- Rediger ressource -->
    <AppModal v-else-if="activeModal?.type === 'edit-resource'" @close="closeModal">
      <h2 class="modal-title">{{ resourceModalTitle }}</h2>
      <p class="modal-text">Nuværende: {{ currentResourceLabel }}</p>
      <label class="form-field">
        <span>Ny værdi</span>
        <select v-model.number="selectedResourceValue">
          <option v-for="opt in resourceModalOptions" :key="opt" :value="opt">
            {{ opt }}{{ editingField === 'vcpu' ? ' vCPU' : ' GB' }}
          </option>
        </select>
      </label>
      <p class="modal-text">
        Din kvote efter ændring:
        <strong :class="{ 'modal-text--danger': resourceExceedsQuota }">{{ resourceQuotaPreviewText }}</strong>
      </p>
      <p v-if="resourceExceedsQuota" class="modal-warning">Denne ændring overskrider din kvote.</p>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" @click="closeModal">Annuller</button>
        <button type="button" class="btn-primary" :disabled="resourceExceedsQuota" @click="saveResourceEdit">
          Gem
        </button>
      </div>
    </AppModal>

    <!-- Opret snapshot -->
    <AppModal v-else-if="activeModal?.type === 'create-snapshot'" @close="closeModal">
      <h2 class="modal-title">Opret snapshot</h2>
      <label class="form-field">
        <span>Navn</span>
        <input v-model="newSnapshotName" type="text" placeholder="before-install" />
      </label>
      <label class="form-field">
        <span>Beskrivelse (valgfri)</span>
        <textarea v-model="newSnapshotDescription" rows="2" placeholder="Valgfri beskrivelse..." />
      </label>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" @click="closeModal">Annuller</button>
        <button type="button" class="btn-primary" :disabled="!newSnapshotName.trim()" @click="createSnapshot">
          Opret snapshot
        </button>
      </div>
    </AppModal>

    <!-- Rollback snapshot -->
    <AppModal v-else-if="activeModal?.type === 'rollback-snapshot' && rollbackTarget" size="sm" @close="closeModal">
      <h2 class="modal-title">Gendan snapshot</h2>
      <p class="modal-text">
        Dette gendanner VM'en til snapshot "{{ rollbackTarget.name }}". Ændringer efter snapshot-tidspunktet går tabt.
      </p>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" @click="closeModal">Annuller</button>
        <button type="button" class="btn-danger" @click="confirmRollback">Gendan</button>
      </div>
    </AppModal>

    <!-- Slet snapshot -->
    <AppModal
      v-else-if="activeModal?.type === 'delete-snapshot' && deleteSnapshotTarget"
      size="sm"
      @close="closeModal"
    >
      <h2 class="modal-title">Slet snapshot "{{ deleteSnapshotTarget.name }}"?</h2>
      <p class="modal-text">Denne handling kan ikke fortrydes.</p>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" @click="closeModal">Annuller</button>
        <button type="button" class="btn-danger" @click="confirmDeleteSnapshot">Slet snapshot</button>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  width: fit-content;
  color: #6b7280;
  font-size: 0.84rem;
  font-weight: 500;
  text-decoration: none;
}

.back-link:hover {
  color: #1c5fa8;
  text-decoration: underline;
}

.page__title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  color: #1f2430;
}

.vm-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1.2rem 1.4rem;
  border: solid 1px #d1d1d1;
  border-radius: 14px;
  background-color: #ffffff;
  box-shadow: 0 3px 7px rgba(0, 0, 0, 0.21);
}

.vm-header__info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.vm-header__title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.vm-header__name {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #1f2430;
}

.vm-header__status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 600;
}

.vm-header__os {
  margin: 0;
  font-size: 0.9rem;
  color: #4b5160;
}

.vm-header__meta {
  margin: 0;
  font-size: 0.8rem;
  color: #9aa0ac;
}

.vm-header__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
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

.header-menu {
  position: relative;
}

.header-menu__popover {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  min-width: 190px;
  background: #fff;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(20, 24, 33, 0.12);
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  z-index: 30;
}

.header-menu__item {
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
  cursor: pointer;
  font-family: inherit;
}

.header-menu__item:hover {
  background: #eaf1fb;
  color: #1c5fa8;
}

.header-menu__item--danger {
  color: #c53030;
}

.header-menu__item--danger:hover {
  background: #fdecec;
  color: #c53030;
}

.header-menu__divider {
  height: 1px;
  margin: 0.25rem 0.2rem;
  background: #e6e8ec;
}

.tabs {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  border-bottom: 1px solid #e6e8ec;
}

.tabs__item {
  position: relative;
  padding: 0.6rem 0.1rem;
  border: none;
  background: transparent;
  color: #6b7280;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.tabs__item:hover {
  color: #1f2430;
}

.tabs__item--active {
  color: #1c5fa8;
}

.tabs__item--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: #2b6fc2;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel {
  padding: 1.2rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  border: solid 1px #d1d1d1;
  border-radius: 14px;
  background-color: #ffffff;
  box-shadow: 0 3px 7px rgba(0, 0, 0, 0.21);
}

.panel__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f2430;
}

.panel__head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 0.9rem 1rem;
}

.info-grid__item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.info-grid__label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #9aa0ac;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info-grid__value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1f2430;
}

.resource-rows {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.resource-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.resource-row__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.resource-row__label {
  font-size: 0.84rem;
  font-weight: 600;
  color: #1f2430;
}

.resource-row__value {
  font-size: 0.82rem;
  color: #6b7280;
}

.resource-row__track {
  height: 8px;
  border-radius: 999px;
  background: #eef1f5;
  overflow: hidden;
}

.resource-row__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.resource-row__footnote {
  font-size: 0.76rem;
  color: #9aa0ac;
}

.detail-rows {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.detail-rows__item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.86rem;
}

.detail-rows__label {
  color: #9aa0ac;
}

.detail-rows__value {
  color: #1f2430;
  font-weight: 600;
  text-align: right;
}

.hw-rows {
  display: flex;
  flex-direction: column;
}

.hw-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 0;
  border-top: 1px solid #eef1f5;
}

.hw-row:first-child {
  border-top: none;
  padding-top: 0.1rem;
}

.hw-row__info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.hw-row__label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #9aa0ac;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.hw-row__value {
  font-size: 0.92rem;
  font-weight: 600;
  color: #1f2430;
}

.btn-outline-sm {
  height: 32px;
  padding: 0 0.75rem;
  border-radius: 7px;
  border: 1px solid #2b6fc2;
  background: #fff;
  color: #1c5fa8;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-outline-sm:hover {
  background: #eaf1fb;
}

.snapshot-quota {
  margin: -0.4rem 0 0;
  font-size: 0.8rem;
  color: #9aa0ac;
}

.snapshot-list {
  display: flex;
  flex-direction: column;
}

.snapshot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-top: 1px solid #eef1f5;
}

.snapshot-row:first-child {
  border-top: none;
  padding-top: 0.1rem;
}

.snapshot-row__info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.snapshot-row__name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1f2430;
}

.snapshot-row__date {
  font-size: 0.78rem;
  color: #9aa0ac;
}

.snapshot-row__actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.timeline__item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.7rem 0;
  border-top: 1px solid #eef1f5;
}

.timeline__item:first-child {
  border-top: none;
  padding-top: 0;
}

.timeline__time {
  font-size: 0.74rem;
  color: #9aa0ac;
}

.timeline__text {
  font-size: 0.88rem;
  font-weight: 600;
  color: #232734;
}

.timeline__text--failed {
  color: #e03131;
}

.timeline__detail {
  font-size: 0.8rem;
  color: #9aa0ac;
}

.timeline__actor {
  font-size: 0.78rem;
  color: #6b7280;
}

.empty-state {
  margin: 0;
  padding: 1.5rem 1rem;
  text-align: center;
  color: #9aa0ac;
  font-size: 0.88rem;
  border: 1px dashed #d1d1d1;
  border-radius: 12px;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
}

.modal-title {
  margin: 0 0 0.6rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2430;
}

.modal-head .modal-title {
  margin: 0;
}

.modal-text {
  margin: 0 0 0.9rem;
  font-size: 0.88rem;
  color: #4b5160;
  line-height: 1.5;
}

.modal-text--danger {
  color: #e03131;
}

.modal-warning {
  margin: -0.5rem 0 0.9rem;
  font-size: 0.8rem;
  color: #e03131;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
}

.icon-btn:hover {
  background: #f4f5f7;
  color: #1f2430;
}

.terminal-mock {
  height: 220px;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  background: #1a1d24;
  color: #7ee787;
  font-family: 'Courier New', monospace;
  font-size: 0.86rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.9rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4b5160;
}

.form-field input,
.form-field select,
.form-field textarea {
  border: 1px solid #d5d5d5;
  border-radius: 8px;
  padding: 0.5rem 0.7rem;
  font-family: inherit;
  font-size: 0.88rem;
  color: #1f2430;
  resize: vertical;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  outline: 2px solid #2b6fc2;
  outline-offset: -1px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.4rem;
}

.btn-ghost {
  height: 36px;
  padding: 0 1rem;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  background: #fff;
  color: #4b5160;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-ghost:hover {
  border-color: #2b6fc2;
  color: #1c5fa8;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  height: 36px;
  padding: 0 1rem;
  border: none;
  border-radius: 8px;
  background: #2b6fc2;
  color: #fff;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: #1c5fa8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  height: 36px;
  padding: 0 1rem;
  border: none;
  border-radius: 8px;
  background: #e03131;
  color: #fff;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:hover {
  background: #c92a2a;
}
</style>
