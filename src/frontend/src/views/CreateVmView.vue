<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconCheck, IconMinus, IconPlus, IconAlertTriangle, IconCircleCheck, IconCircleDashed } from '@tabler/icons-vue'
import { templates, type VmTemplate } from '@/data/templates'
import { vms, createVm } from '@/data/vms'
import { quotas } from '@/data/quotas'

const route = useRoute()
const router = useRouter()

type StepId = 1 | 2 | 3
const steps: { id: StepId; label: string }[] = [
  { id: 1, label: 'Vælg template' },
  { id: 2, label: 'Konfigurer VM' },
  { id: 3, label: 'Gennemgå og opret' },
]
const currentStep = ref<StepId>(1)

const selectedTemplateId = ref<string | null>(null)
const selectedTemplate = computed(() => templates.find((t) => t.id === selectedTemplateId.value) ?? null)

const vcpuOptions = [1, 2, 4, 8]
const ramOptions = [1, 2, 4, 6, 8, 12, 16]
const diskOptions = [10, 20, 30, 40, 60, 100]

const vcpu = ref(vcpuOptions[0]!)
const ram = ref(ramOptions[0]!)
const disk = ref(diskOptions[0]!)

function selectTemplate(template: VmTemplate) {
  selectedTemplateId.value = template.id
  vcpu.value = template.vcpu
  ram.value = template.ram
  disk.value = template.disk
}

const routeTemplate = templates.find((t) => t.id === route.query.template)
if (routeTemplate) selectTemplate(routeTemplate)

function resourceOptions(field: 'vcpu' | 'ram' | 'disk') {
  return field === 'vcpu' ? vcpuOptions : field === 'ram' ? ramOptions : diskOptions
}
function resourceRef(field: 'vcpu' | 'ram' | 'disk') {
  return field === 'vcpu' ? vcpu : field === 'ram' ? ram : disk
}
function stepResource(field: 'vcpu' | 'ram' | 'disk', direction: 1 | -1) {
  const options = resourceOptions(field)
  const target = resourceRef(field)
  const index = options.indexOf(target.value)
  const nextIndex = Math.min(options.length - 1, Math.max(0, index + direction))
  target.value = options[nextIndex]!
}
function isResourceAtMin(field: 'vcpu' | 'ram' | 'disk') {
  return resourceRef(field).value === resourceOptions(field)[0]
}
function isResourceAtMax(field: 'vcpu' | 'ram' | 'disk') {
  const options = resourceOptions(field)
  return resourceRef(field).value === options[options.length - 1]
}

const vmName = ref('')
const hostname = ref('')
const hostnameTouched = ref(false)
const attemptedNext = ref(false)

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
}

watch(vmName, (value) => {
  if (!hostnameTouched.value) hostname.value = slugify(value)
})

function onHostnameInput(event: Event) {
  hostnameTouched.value = true
  hostname.value = (event.target as HTMLInputElement).value.toLowerCase()
}

const nameError = computed(() => {
  const value = vmName.value.trim()
  if (!value) return null
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(value)) return '3-30 tegn · kun bogstaver, tal, - og _.'
  if (vms.some((vm) => vm.name.toLowerCase() === value.toLowerCase())) return 'Der findes allerede en VM med dette navn.'
  return null
})
const nameValid = computed(() => vmName.value.trim().length > 0 && !nameError.value)

const hostnameError = computed(() => {
  const value = hostname.value.trim()
  if (!value) return null
  return /^[a-z0-9-]{3,30}$/.test(value) ? null : '3-30 tegn · kun små bogstaver, tal og -.'
})
const hostnameValid = computed(() => hostname.value.trim().length > 0 && !hostnameError.value)

function sumField(field: 'vcpu' | 'ram' | 'disk') {
  return vms.reduce((sum, vm) => sum + vm[field], 0)
}
const used = computed(() => ({
  vms: vms.length,
  vcpu: sumField('vcpu'),
  ram: sumField('ram'),
  disk: sumField('disk'),
}))

const hasSelection = computed(() => selectedTemplate.value !== null)
const after = computed(() => ({
  vms: used.value.vms + (hasSelection.value ? 1 : 0),
  vcpu: used.value.vcpu + (hasSelection.value ? vcpu.value : 0),
  ram: used.value.ram + (hasSelection.value ? ram.value : 0),
  disk: used.value.disk + (hasSelection.value ? disk.value : 0),
}))

const quotaRows = computed(() => [
  { key: 'vms', label: "VM'er", used: used.value.vms, after: after.value.vms, max: quotas.maxVms, unit: '' },
  { key: 'vcpu', label: 'vCPU', used: used.value.vcpu, after: after.value.vcpu, max: quotas.maxVcpu, unit: '' },
  { key: 'ram', label: 'RAM', used: used.value.ram, after: after.value.ram, max: quotas.maxRamGb, unit: ' GB' },
  { key: 'disk', label: 'Lagring', used: used.value.disk, after: after.value.disk, max: quotas.maxDiskGb, unit: ' GB' },
])

function percent(value: number, max: number) {
  return Math.round((value / max) * 100)
}

const exceededRows = computed(() => quotaRows.value.filter((row) => row.after > row.max))
const quotaExceeded = computed(() => hasSelection.value && exceededRows.value.length > 0)

const canProceedStep1 = computed(() => selectedTemplate.value !== null)
const canProceedStep2 = computed(() => nameValid.value && hostnameValid.value && !quotaExceeded.value)

function goNext() {
  attemptedNext.value = true
  if (currentStep.value === 1 && canProceedStep1.value) {
    currentStep.value = 2
    attemptedNext.value = false
  } else if (currentStep.value === 2 && canProceedStep2.value) {
    currentStep.value = 3
    attemptedNext.value = false
  }
}

function goBack() {
  if (currentStep.value === 1) {
    router.push('/templates')
  } else {
    currentStep.value = (currentStep.value - 1) as StepId
  }
}

type Phase = 'review' | 'running' | 'success' | 'error'
const phase = ref<Phase>('review')

const provisioningSteps = computed(() => [
  { id: 'validate', label: 'Validerer ressourcer' },
  { id: 'reserve', label: 'Reserverer VM ID' },
  { id: 'clone', label: `Kloner ${selectedTemplate.value?.name ?? 'template'}` },
  { id: 'configure', label: 'Konfigurerer CPU og RAM' },
  { id: 'network', label: 'Konfigurerer netværk' },
  { id: 'finish', label: 'Færdiggør VM' },
])
const activeStepIndex = ref(-1)
const createdVmName = ref('')

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runProvisioning() {
  phase.value = 'running'
  activeStepIndex.value = -1

  for (let i = 0; i < provisioningSteps.value.length; i++) {
    activeStepIndex.value = i
    await delay(600)
    if (provisioningSteps.value[i]!.id === 'clone' && Math.random() < 0.12) {
      phase.value = 'error'
      return
    }
  }

  const template = selectedTemplate.value
  if (!template) return
  const vm = createVm({
    name: vmName.value.trim(),
    hostname: hostname.value.trim(),
    os: template.name,
    template: template.name,
    osFamily: template.osFamily,
    vcpu: vcpu.value,
    ram: ram.value,
    disk: disk.value,
  })
  createdVmName.value = vm.name
  activeStepIndex.value = provisioningSteps.value.length
  phase.value = 'success'
}

function stepStatus(index: number): 'done' | 'active' | 'pending' {
  if (index < activeStepIndex.value) return 'done'
  if (index === activeStepIndex.value && phase.value === 'running') return 'active'
  if (phase.value === 'success') return 'done'
  return 'pending'
}
</script>

<template>
  <div class="page">
    <h1 class="page__title">Opret ny virtuel maskine</h1>

    <ol class="stepper">
      <li
        v-for="step in steps"
        :key="step.id"
        class="stepper__item"
        :class="{
          'stepper__item--active': currentStep === step.id,
          'stepper__item--done': currentStep > step.id,
        }"
      >
        <span class="stepper__index">
          <IconCheck v-if="currentStep > step.id" :size="14" :stroke-width="2.5" />
          <template v-else>{{ step.id }}</template>
        </span>
        <span class="stepper__label">{{ step.label }}</span>
        <span v-if="step.id !== steps.length" class="stepper__connector" :class="{ 'stepper__connector--done': currentStep > step.id }" />
      </li>
    </ol>

    <div class="layout">
      <div class="main">
        <section v-if="currentStep === 1" class="panel">
          <h2 class="panel__title">Vælg VM-template</h2>
          <p class="panel__subtitle">Vælg den skabelon, din virtuelle maskine skal baseres på.</p>

          <div class="template-grid">
            <button
              v-for="template in templates"
              :key="template.id"
              type="button"
              class="template-card"
              :class="{ 'template-card--selected': selectedTemplateId === template.id }"
              @click="selectTemplate(template)"
            >
              <IconCheck v-if="selectedTemplateId === template.id" :size="14" :stroke-width="2.5" class="template-card__check" />
              <div class="template-card__icon">
                <component :is="template.icon" :size="22" :stroke-width="1.5" />
              </div>
              <div class="template-card__head">
                <h3 class="template-card__name">{{ template.name }}</h3>
                <span class="template-card__os">{{ template.osLabel }}</span>
              </div>
              <p class="template-card__description">{{ template.description }}</p>
              <span class="template-card__specs">{{ template.vcpu }} vCPU · {{ template.ram }} GB RAM · {{ template.disk }} GB disk</span>
            </button>
          </div>
        </section>

        <section v-else-if="currentStep === 2" class="panel">
          <h2 class="panel__title">Konfigurer VM</h2>
          <p class="panel__subtitle">Navngiv din VM, og vælg de ressourcer den skal have.</p>

          <div class="form-grid">
            <label class="form-field">
              <span>VM-navn</span>
              <input
                v-model="vmName"
                type="text"
                placeholder="ubuntu-webserver"
                :class="{ 'form-field__input--error': attemptedNext && nameError }"
              />
              <small class="field-hint" :class="{ 'field-hint--error': attemptedNext && nameError }">
                {{ (attemptedNext && nameError) || '3-30 tegn · bogstaver, tal, - og _' }}
              </small>
            </label>

            <label class="form-field">
              <span>Hostname</span>
              <input
                :value="hostname"
                type="text"
                placeholder="ubuntu-webserver"
                :class="{ 'form-field__input--error': attemptedNext && hostnameError }"
                @input="onHostnameInput"
              />
              <small class="field-hint" :class="{ 'field-hint--error': attemptedNext && hostnameError }">
                {{ (attemptedNext && hostnameError) || 'Genereres automatisk fra VM-navnet — du kan ændre det.' }}
              </small>
            </label>
          </div>

          <div class="resources">
            <h3 class="resources__title">Ressourcer</h3>
            <div class="resource-row">
              <div v-for="field in (['vcpu', 'ram', 'disk'] as const)" :key="field" class="resource-control">
                <span class="resource-control__label">{{ field === 'vcpu' ? 'vCPU' : field === 'ram' ? 'RAM' : 'Lagring' }}</span>
                <div class="stepper-control">
                  <button
                    type="button"
                    class="stepper-control__btn"
                    :disabled="isResourceAtMin(field)"
                    aria-label="Formindsk"
                    @click="stepResource(field, -1)"
                  >
                    <IconMinus :size="15" :stroke-width="2" />
                  </button>
                  <span class="stepper-control__value">
                    {{ resourceRef(field).value }}{{ field === 'vcpu' ? '' : ' GB' }}
                  </span>
                  <button
                    type="button"
                    class="stepper-control__btn"
                    :disabled="isResourceAtMax(field)"
                    aria-label="Forøg"
                    @click="stepResource(field, 1)"
                  >
                    <IconPlus :size="15" :stroke-width="2" />
                  </button>
                </div>
              </div>
            </div>
            <p v-if="quotaExceeded" class="resources__warning">
              <IconAlertTriangle :size="15" :stroke-width="2" />
              Du overskrider din kvote for {{ exceededRows.map((row) => row.label).join(', ') }}.
            </p>
          </div>
        </section>

        <section v-else class="panel">
          <template v-if="phase === 'review'">
            <h2 class="panel__title">Gennemgå din virtuelle maskine</h2>

            <div class="review-rows">
              <div class="review-rows__item">
                <span class="review-rows__label">Template</span>
                <span class="review-rows__value">{{ selectedTemplate?.name }}</span>
              </div>
              <div class="review-rows__item">
                <span class="review-rows__label">VM-navn</span>
                <span class="review-rows__value">{{ vmName }}</span>
              </div>
              <div class="review-rows__item">
                <span class="review-rows__label">Hostname</span>
                <span class="review-rows__value">{{ hostname }}</span>
              </div>
              <div class="review-rows__item">
                <span class="review-rows__label">Ressourcer</span>
                <span class="review-rows__value">{{ vcpu }} vCPU · {{ ram }} GB RAM · {{ disk }} GB disk</span>
              </div>
            </div>
          </template>

          <template v-else-if="phase === 'running'">
            <h2 class="panel__title">Opretter virtuel maskine...</h2>
            <ul class="provisioning">
              <li
                v-for="(step, index) in provisioningSteps"
                :key="step.id"
                class="provisioning__item"
                :class="`provisioning__item--${stepStatus(index)}`"
              >
                <IconCircleCheck v-if="stepStatus(index) === 'done'" :size="18" :stroke-width="2" />
                <span v-else-if="stepStatus(index) === 'active'" class="provisioning__dot provisioning__dot--active" />
                <IconCircleDashed v-else :size="18" :stroke-width="2" />
                <span>{{ step.label }}</span>
              </li>
            </ul>
          </template>

          <template v-else-if="phase === 'success'">
            <div class="result result--success">
              <IconCircleCheck :size="40" :stroke-width="1.75" />
              <h2 class="panel__title">Din virtuelle maskine er klar</h2>
              <p class="result__text">{{ createdVmName }} er blevet oprettet.</p>
              <div class="result__actions">
                <RouterLink :to="`/vms/${createdVmName}`" class="btn-primary">Åbn VM</RouterLink>
                <RouterLink to="/vms" class="btn-ghost">Tilbage til Mine VM'er</RouterLink>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="result result--error">
              <IconAlertTriangle :size="40" :stroke-width="1.75" />
              <h2 class="panel__title">VM'en kunne ikke oprettes</h2>
              <p class="result__text">Kloning af {{ selectedTemplate?.name }} mislykkedes.</p>
              <div class="result__actions">
                <button type="button" class="btn-primary" @click="runProvisioning">Prøv igen</button>
              </div>
            </div>
          </template>
        </section>

        <div v-if="phase === 'review'" class="footer-nav">
          <button type="button" class="btn-ghost" @click="goBack">← Tilbage</button>
          <button
            v-if="currentStep < 3"
            type="button"
            class="btn-primary"
            :disabled="(currentStep === 1 && !canProceedStep1) || (currentStep === 2 && !canProceedStep2)"
            @click="goNext"
          >
            Næste →
          </button>
          <button v-else type="button" class="btn-primary" @click="runProvisioning">Opret virtuel maskine</button>
        </div>
      </div>

      <aside class="quota-panel">
        <h2 class="quota-panel__title">Din kvote</h2>
        <div class="quota-rows">
          <div v-for="row in quotaRows" :key="row.key" class="quota-row">
            <div class="quota-row__head">
              <span>{{ row.label }}</span>
              <span>{{ row.used }} / {{ row.max }}{{ row.unit }}</span>
            </div>
            <div class="quota-row__track">
              <div
                class="quota-row__fill"
                :style="{ width: `${Math.min(100, percent(row.used, row.max))}%` }"
              />
            </div>
          </div>
        </div>

        <template v-if="hasSelection">
          <div class="quota-panel__divider" />
          <h3 class="quota-panel__subtitle">Efter oprettelse</h3>
          <div class="quota-rows">
            <div v-for="row in quotaRows" :key="row.key" class="quota-row">
              <div class="quota-row__head">
                <span>{{ row.label }}</span>
                <span :class="{ 'quota-row__head--danger': row.after > row.max }">
                  {{ row.after }} / {{ row.max }}{{ row.unit }}
                  <template v-if="row.after > row.max">({{ percent(row.after, row.max) }}%)</template>
                </span>
              </div>
              <div class="quota-row__track">
                <div
                  class="quota-row__fill"
                  :class="{ 'quota-row__fill--danger': row.after > row.max }"
                  :style="{ width: `${Math.min(100, percent(row.after, row.max))}%` }"
                />
              </div>
            </div>
          </div>

          <p v-if="quotaExceeded" class="quota-panel__warning">
            <IconAlertTriangle :size="15" :stroke-width="2" />
            Du overskrider din kvote for {{ exceededRows.map((row) => row.label).join(', ') }}.
          </p>

          <div class="quota-panel__divider" />
          <h3 class="quota-panel__subtitle">Denne VM bruger</h3>
          <p class="quota-delta">+{{ vcpu }} vCPU · +{{ ram }} GB RAM · +{{ disk }} GB lager</p>
        </template>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.3rem;
}

.page__title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  color: #1f2430;
}

.stepper {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

.stepper__item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.stepper__index {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid #d5d5d5;
  color: #9aa0ac;
  font-size: 0.78rem;
  font-weight: 700;
  background: #fff;
}

.stepper__label {
  font-size: 0.86rem;
  font-weight: 600;
  color: #9aa0ac;
  white-space: nowrap;
}

.stepper__connector {
  width: clamp(24px, 6vw, 72px);
  height: 2px;
  margin: 0 0.6rem;
  background: #e0e2e8;
  flex-shrink: 1;
}

.stepper__connector--done {
  background: #2b6fc2;
}

.stepper__item--active .stepper__index {
  border-color: #2b6fc2;
  background: #2b6fc2;
  color: #fff;
}

.stepper__item--active .stepper__label {
  color: #1f2430;
}

.stepper__item--done .stepper__index {
  border-color: #2b6fc2;
  background: #eaf1fb;
  color: #1c5fa8;
}

.stepper__item--done .stepper__label {
  color: #4b5160;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  align-items: start;
  gap: 1.25rem;
}

.main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.panel {
  padding: 1.3rem 1.4rem;
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
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2430;
}

.panel__subtitle {
  margin: -0.5rem 0 0;
  font-size: 0.86rem;
  color: #6b7280;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.template-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 1.1rem 1.2rem;
  border: 1.5px solid #e6e8ec;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

.template-card:hover {
  border-color: #9dbfe6;
}

.template-card--selected {
  border-color: #2b6fc2;
  background: #eef4fc;
}

.template-card__check {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  color: #2b6fc2;
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
  gap: 0.1rem;
}

.template-card__name {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: #1f2430;
}

.template-card__os {
  font-size: 0.76rem;
  color: #9aa0ac;
}

.template-card__description {
  margin: 0;
  font-size: 0.83rem;
  color: #4b5160;
  line-height: 1.4;
}

.template-card__specs {
  font-size: 0.78rem;
  font-weight: 600;
  color: #1f2430;
  padding-top: 0.5rem;
  border-top: 1px solid #eef1f5;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(200px, 1fr));
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4b5160;
}

.form-field input {
  border: 1px solid #d5d5d5;
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  font-family: inherit;
  font-size: 0.88rem;
  color: #1f2430;
}

.form-field input:focus {
  outline: 2px solid #2b6fc2;
  outline-offset: -1px;
}

.form-field__input--error {
  border-color: #e03131;
}

.field-hint {
  font-size: 0.74rem;
  font-weight: 500;
  color: #9aa0ac;
}

.field-hint--error {
  color: #e03131;
}

.resources {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding-top: 0.6rem;
  border-top: 1px solid #eef1f5;
}

.resources__title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1f2430;
}

.resource-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(140px, 1fr));
  gap: 1rem;
}

.resource-control {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.resource-control__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7280;
}

.stepper-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  border: 1px solid #d5d5d5;
  border-radius: 9px;
  background: #fff;
  overflow: hidden;
}

.stepper-control__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 100%;
  border: none;
  background: #f4f5f7;
  color: #4b5160;
  cursor: pointer;
}

.stepper-control__btn:hover:not(:disabled) {
  background: #eaf1fb;
  color: #1c5fa8;
}

.stepper-control__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stepper-control__value {
  flex: 1;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1f2430;
}

.resources__warning {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: #e03131;
}

.review-rows {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.review-rows__item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0;
  border-top: 1px solid #eef1f5;
  font-size: 0.86rem;
}

.review-rows__item:first-child {
  border-top: none;
  padding-top: 0;
}

.review-rows__label {
  color: #9aa0ac;
}

.review-rows__value {
  color: #1f2430;
  font-weight: 700;
  text-align: right;
}

.provisioning {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.provisioning__item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #c3c7ce;
}

.provisioning__item--done {
  color: #2f9e44;
}

.provisioning__item--active {
  color: #1f2430;
}

.provisioning__dot {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.provisioning__dot--active {
  border-radius: 50%;
  background: #2b6fc2;
  animation: provisioning-pulse 1.1s ease-in-out infinite;
}

.result {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.4rem;
  padding: 1.5rem 1rem;
}

.result--success {
  color: #2f9e44;
}

.result--error {
  color: #e03131;
}

.result .panel__title {
  color: #1f2430;
}

.result__text {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
}

.result__actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.7rem;
}

.footer-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.quota-panel {
  padding: 1.2rem 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  border: solid 1px #d1d1d1;
  border-radius: 14px;
  background-color: #ffffff;
  box-shadow: 0 3px 7px rgba(0, 0, 0, 0.21);
  position: sticky;
  top: 1rem;
}

.quota-panel__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f2430;
}

.quota-panel__subtitle {
  margin: 0;
  font-size: 0.76rem;
  font-weight: 700;
  color: #9aa0ac;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.quota-panel__divider {
  height: 1px;
  background: #eef1f5;
}

.quota-rows {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.quota-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.quota-row__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 0.82rem;
  color: #4b5160;
  font-weight: 600;
}

.quota-row__head--danger {
  color: #e03131;
}

.quota-row__track {
  height: 7px;
  border-radius: 999px;
  background: #eef1f5;
  overflow: hidden;
}

.quota-row__fill {
  height: 100%;
  border-radius: 999px;
  background: #2b6fc2;
  transition: width 0.25s ease, background-color 0.25s ease;
}

.quota-row__fill--danger {
  background: #e03131;
}

.quota-panel__warning {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  padding: 0.6rem 0.7rem;
  border-radius: 8px;
  background: #fdecec;
  color: #e03131;
  font-size: 0.78rem;
  font-weight: 600;
}

.quota-delta {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 600;
  color: #1f2430;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  height: 40px;
  padding: 0 1.1rem;
  border: none;
  border-radius: 9px;
  background: #2b6fc2;
  color: #fff;
  font-family: inherit;
  font-size: 0.86rem;
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

.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 1.1rem;
  border: 1px solid #e6e8ec;
  border-radius: 9px;
  background: #fff;
  color: #4b5160;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.btn-ghost:hover {
  border-color: #2b6fc2;
  color: #1c5fa8;
}
</style>
