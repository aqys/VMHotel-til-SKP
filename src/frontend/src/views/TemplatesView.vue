<script setup lang="ts">
import { computed, ref } from 'vue'
import { IconSearch } from '@tabler/icons-vue'
import { templates, type VmTemplate } from '@/data/templates'
import { vms } from '@/data/vms'
import { quotas } from '@/data/quotas'

const searchQuery = ref('')
const osFilter = ref<'all' | VmTemplate['osFamily']>('all')

const filteredTemplates = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return templates.filter((template) => {
    const matchesQuery = !q || template.name.toLowerCase().includes(q)
    const matchesOs = osFilter.value === 'all' || template.osFamily === osFilter.value
    return matchesQuery && matchesOs
  })
})

function sumVms(field: 'vcpu' | 'ram' | 'disk') {
  return vms.reduce((sum, vm) => sum + vm[field], 0)
}

const freeCapacity = computed(() => ({
  vms: Math.max(0, quotas.maxVms - vms.length),
  ram: Math.max(0, quotas.maxRamGb - sumVms('ram')),
  vcpu: Math.max(0, quotas.maxVcpu - sumVms('vcpu')),
  disk: Math.max(0, quotas.maxDiskGb - sumVms('disk')),
}))

function canCreate(template: VmTemplate): boolean {
  const free = freeCapacity.value
  return free.vms >= 1 && template.vcpu <= free.vcpu && template.ram <= free.ram && template.disk <= free.disk
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page__title">Templates</h1>
    </div>

    <p class="quota-line">
      Din ledige kapacitet: {{ freeCapacity.vms }} VM · {{ freeCapacity.ram }} GB RAM · {{ freeCapacity.vcpu }} vCPU ·
      {{ freeCapacity.disk }} GB disk
    </p>

    <div class="toolbar">
      <label class="toolbar__search">
        <IconSearch :size="18" :stroke-width="1.75" />
        <input v-model="searchQuery" type="text" placeholder="Søg efter template..." />
      </label>
      <select v-model="osFilter" class="toolbar__select" aria-label="Filtrer OS">
        <option value="all">OS: Alle</option>
        <option value="linux">OS: Linux</option>
        <option value="windows">OS: Windows</option>
      </select>
    </div>

    <p v-if="filteredTemplates.length === 0" class="empty-state">Ingen templates matcher din søgning eller filter.</p>

    <div v-else class="template-grid">
      <article v-for="template in filteredTemplates" :key="template.id" class="template-card">
        <div class="template-card__icon">
          <component :is="template.icon" :size="22" :stroke-width="1.5" />
        </div>
        <div class="template-card__head">
          <h2 class="template-card__name">{{ template.name }}</h2>
          <span class="template-card__os">{{ template.osLabel }}</span>
        </div>
        <p class="template-card__description">{{ template.description }}</p>

        <div class="template-card__specs">
          <span class="template-card__specs-label">Anbefalet</span>
          <span class="template-card__specs-value">{{ template.vcpu }} vCPU · {{ template.ram }} GB RAM</span>
          <span class="template-card__specs-value">{{ template.disk }} GB disk</span>
        </div>

        <p v-if="!canCreate(template)" class="template-card__quota-note">Kan ikke oprettes med din nuværende kvote</p>

        <RouterLink
          v-if="canCreate(template)"
          :to="`/vms/new?template=${template.id}`"
          class="btn-primary template-card__cta"
        >
          Opret VM
        </RouterLink>
        <button v-else type="button" class="btn-primary template-card__cta" disabled>Opret VM</button>
      </article>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
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

.quota-line {
  margin: 0;
  font-size: 0.82rem;
  color: #6b7280;
}

.toolbar {
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

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.template-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.1rem 1.2rem;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 18, 25, 0.06);
}

.template-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: #f4f5f7;
  color: #4b5160;
}

.template-card__head {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.template-card__name {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f2430;
}

.template-card__os {
  font-size: 0.76rem;
  color: #9aa0ac;
}

.template-card__description {
  margin: 0;
  font-size: 0.84rem;
  color: #4b5160;
  line-height: 1.4;
}

.template-card__specs {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-top: 0.2rem;
  padding-top: 0.6rem;
  border-top: 1px solid #eef1f5;
}

.template-card__specs-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: #9aa0ac;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.template-card__specs-value {
  font-size: 0.82rem;
  color: #1f2430;
  font-weight: 600;
}

.template-card__quota-note {
  margin: 0;
  font-size: 0.76rem;
  color: #e03131;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  height: 36px;
  padding: 0 1rem;
  border: none;
  border-radius: 8px;
  background: #2b6fc2;
  color: #fff;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: #1c5fa8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.template-card__cta {
  margin-top: 0.2rem;
}
</style>
