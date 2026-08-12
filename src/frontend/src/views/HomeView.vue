<script setup lang="ts">
import { computed } from 'vue'
import {
  IconBell,
  IconPlus,
  IconArrowRight,
  IconPlayerPlay,
  IconPlayerStop,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-vue'
import { vms, statusLabels, toggleVmStatus } from '@/data/vms'
import { quotas } from '@/data/quotas'
import { vmActivity, type VmActivityEntry } from '@/data/vmActivity'

interface Stat {
  label: string
  used: number
  total: number
  unit: string
}

const notificationCount = 3

function sumVms(field: 'vcpu' | 'ram' | 'disk') {
  return vms.reduce((sum, vm) => sum + vm[field], 0)
}

const stats = computed<Stat[]>(() => [
  { label: 'VM Antal', used: vms.length, total: quotas.maxVms, unit: 'VMs' },
  { label: 'RAM Forbrug', used: sumVms('ram'), total: quotas.maxRamGb, unit: 'GB brugt' },
  { label: 'vCPU Kerner', used: sumVms('vcpu'), total: quotas.maxVcpu, unit: 'tildelt' },
  { label: 'Lagring', used: sumVms('disk'), total: quotas.maxDiskGb, unit: 'GB brugt' },
])

const ringRadius = 52
const ringCircumference = 2 * Math.PI * ringRadius

function ringColor(percent: number) {
  if (percent >= 90) return '#e03131'
  if (percent >= 70) return '#f08c00'
  return '#2b6fc2'
}

function ringStyle(percent: number) {
  return {
    strokeDasharray: `${ringCircumference}`,
    strokeDashoffset: `${ringCircumference * (1 - percent / 100)}`,
    stroke: ringColor(percent),
  }
}

const statsWithColor = computed(() =>
  stats.value.map((stat) => {
    const percent = Math.round((stat.used / stat.total) * 100)
    return {
      ...stat,
      percent,
      valueText: `${stat.used} / ${stat.total} ${stat.unit}`,
      color: ringColor(percent),
    }
  }),
)

const previewVms = computed(() => vms.slice(0, 3))

function parseTimestamp(label: string): number {
  const [datePart, timePart] = label.split(' ')
  const [day, month, year] = datePart!.split('.').map(Number)
  const [hour, minute] = (timePart ?? '00:00').split(':').map(Number)
  return new Date(year!, month! - 1, day!, hour, minute).getTime()
}

function relativeTimeLabel(ms: number): string {
  const minutes = Math.floor((Date.now() - ms) / 60000)
  if (minutes < 1) return 'lige nu'
  if (minutes < 60) return `for ${minutes} min. siden`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `for ${hours} time${hours === 1 ? '' : 'r'} siden`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'i går' : `for ${days} dage siden`
}

function activityKind(entry: VmActivityEntry): 'start' | 'stop' | 'warning' | 'info' {
  if (entry.failed) return 'warning'
  if (entry.text.includes('startet')) return 'start'
  if (entry.text.includes('stoppet')) return 'stop'
  return 'info'
}

const activity = computed(() =>
  Object.values(vmActivity)
    .flat()
    .map((entry) => ({ ...entry, ms: parseTimestamp(entry.timestampLabel), kind: activityKind(entry) }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 4)
    .map((entry) => ({ ...entry, time: relativeTimeLabel(entry.ms) })),
)
</script>

<template>
  <div class="page">
    <button type="button" class="topbar__bell" aria-label="Notifikationer">
      <IconBell :size="20" :stroke-width="1.75" />
      <span v-if="notificationCount" class="topbar__badge">{{ notificationCount }}</span>
    </button>

    <h1 class="page__title">Dashboard</h1>

    <section class="stats">
      <div v-for="stat in statsWithColor" :key="stat.label" class="stat-card">
        <div class="stat-card__info">
          <span class="stat-card__label">{{ stat.label }}</span>
          <span class="stat-card__value">{{ stat.valueText }}</span>
        </div>
        <div class="stat-card__ring">
          <svg viewBox="0 0 120 120" class="ring">
            <circle class="ring__track" cx="60" cy="60" :r="ringRadius" />
            <circle
              class="ring__progress"
              cx="60"
              cy="60"
              :r="ringRadius"
              :style="ringStyle(stat.percent)"
            />
          </svg>
          <span class="stat-card__percent" :style="{ color: stat.color }">{{ stat.percent }}%</span>
        </div>
      </div>
    </section>

    <div class="dashboard-grid">
      <section class="vm-panel">
        <div class="vm-panel__header">
          <h2>Mine VM'er</h2>
          <div class="vm-panel__header-actions">
            <RouterLink to="/vms" class="panel-link">
              Se alle
              <IconArrowRight :size="15" :stroke-width="2" />
            </RouterLink>
            <RouterLink to="/vms/new" class="btn-primary">
              <IconPlus :size="16" :stroke-width="2" />
              Opret ny VM
            </RouterLink>
          </div>
        </div>

        <div class="vm-preview-list">
          <div v-for="vm in previewVms" :key="vm.name" class="vm-preview">
            <div class="vm-preview__main">
              <span class="vm-preview__name">{{ vm.name }}</span>
              <div class="vm-preview__meta">
                <span class="vm-preview__status-label" :class="`vm-preview__status-label--${vm.status}`">
                  {{ statusLabels[vm.status] }}
                </span>
                <span class="vm-preview__meta-sep">-</span>
                <span class="vm-preview__os">{{ vm.os }}</span>
              </div>
              <span class="vm-preview__specs">{{ vm.vcpu }} vCPU - {{ vm.ram }} GB - {{ vm.disk }} GB</span>
            </div>
            <div class="vm-preview__actions">
              <RouterLink :to="`/vms/${vm.name}`" class="mini-btn" :aria-label="`Åbn ${vm.name}`">Åbn</RouterLink>
              <button
                type="button"
                class="mini-btn"
                :class="vm.status === 'running' ? 'mini-btn--stop' : 'mini-btn--start'"
                @click="toggleVmStatus(vm)"
              >
                {{ vm.status === 'running' ? 'Stop' : 'Start' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="activity-panel">
        <h2>Seneste aktivitet</h2>
        <ul class="activity-list">
          <li v-for="item in activity" :key="item.id" class="activity-item">
            <span class="activity-item__icon" :class="`activity-item__icon--${item.kind}`">
              <IconPlayerPlay v-if="item.kind === 'start'" :size="13" :stroke-width="2" />
              <IconPlayerStop v-else-if="item.kind === 'stop'" :size="13" :stroke-width="2" />
              <IconAlertTriangle v-else-if="item.kind === 'warning'" :size="13" :stroke-width="2" />
              <IconInfoCircle v-else :size="13" :stroke-width="2" />
            </span>
            <div class="activity-item__body">
              <span class="activity-item__text">{{ item.text }}</span>
              <span class="activity-item__time">{{ item.time }}</span>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.topbar__bell {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  border: 1px solid #e6e8ec;
  background: #fff;
  color: #4b5160;
  cursor: pointer;
}

.topbar__bell:hover {
  background: #eaf1fb;
  color: #1c5fa8;
}

.topbar__badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 999px;
  background: #e03131;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page__title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  color: #1f2430;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.1rem 1.2rem;
  border: solid 1px #d1d1d1;
  border-radius: 14px;
  background-color: #ffffff;
  box-shadow: 0 3px 7px rgba(0, 0, 0, 0.21);
}

.stat-card__info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

.stat-card__label {
  font-size: 0.86rem;
  font-weight: 600;
  color: #1f2430;
}

.stat-card__value {
  font-size: 0.78rem;
  color: #9aa0ac;
}

.stat-card__ring {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}

.ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring__track {
  fill: none;
  stroke: #eef1f5;
  stroke-width: 10;
}

.ring__progress {
  fill: none;
  stroke-width: 10;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.3s ease, stroke 0.3s ease;
}

.stat-card__percent {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #1f2430;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
  align-items: start;
}

.vm-panel,
.activity-panel {
  padding: 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: solid 1px #d1d1d1;
  border-radius: 14px;
  background-color: #ffffff;
  box-shadow: 0 3px 7px rgba(0, 0, 0, 0.21);
}

.vm-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.vm-panel__header-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.vm-panel__header h2,
.activity-panel h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2430;
}

.panel-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #6b7280;
  font-size: 0.84rem;
  font-weight: 500;
  text-decoration: none;
}

.panel-link:hover {
  color: #1c5fa8;
  text-decoration: underline;
}

.vm-preview-list {
  display: flex;
  flex-direction: column;
}

.vm-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0;
  border-top: 1px solid #eef1f5;
}

.vm-preview:first-child {
  border-top: none;
  padding-top: 0.25rem;
}

.vm-preview__main {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.vm-preview__name {
  font-size: 0.92rem;
  font-weight: 600;
  color: #1f2430;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vm-preview__meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: #6b7280;
}

.vm-preview__status-label {
  font-weight: 600;
}

.vm-preview__meta-sep {
  color: #919191;
}

.vm-preview__specs {
  font-size: 0.76rem;
  color: #4c4c4d;
}

.vm-preview__actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.mini-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 0.7rem;
  border-radius: 7px;
  border: 1px solid #e6e8ec;
  background: #fff;
  color: #4b5160;
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.mini-btn:hover {
  border-color: #2b6fc2;
  color: #1c5fa8;
}

.mini-btn--start {
  border-color: #2f9e44;
  background: #2f9e44;
  color: #fff;
}

.mini-btn--start:hover {
  border-color: #268a3a;
  background: #268a3a;
}

.mini-btn--stop {
  border-color: #e03131;
  background: #e03131;
  color: #fff;
}

.mini-btn--stop:hover {
  border-color: #c92a2a;
  background: #c92a2a;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  height: 34px;
  padding: 0 0.85rem;
  border: none;
  border-radius: 8px;
  text-decoration: none;
  background: #2b6fc2;
  color: #fff;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover {
  background: #1c5fa8;
}

.activity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.activity-item__icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: #f4f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-item__body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.activity-item__text {
  font-size: 0.82rem;
  color: #232734;
  font-weight: 500;
}

.activity-item__time {
  font-size: 0.72rem;
  color: #626262;
}
</style>