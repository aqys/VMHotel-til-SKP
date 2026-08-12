<script setup lang="ts">
import { ref } from 'vue'

const profile = {
  name: 'Bruger',
  username: 'bruger123',
  role: 'Elev',
  email: 'bruger123@edu.sde.dk',
}

const notifyVmReady = ref(true)
const notifyVmFailed = ref(true)
const notifyQuotaWarning = ref(true)
const notifyVmStateChange = ref(false)

</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page__title">Indstillinger</h1>
    </div>

    <section class="panel">
      <h2 class="panel__title">Profil</h2>
      <div class="info-rows">
        <div class="info-row">
          <span class="info-row__label">Navn</span>
          <span class="info-row__value">{{ profile.name }}</span>
        </div>
        <div class="info-row">
          <span class="info-row__label">Brugernavn</span>
          <span class="info-row__value">{{ profile.username }}</span>
        </div>
        <div class="info-row">
          <span class="info-row__label">Rolle</span>
          <span class="info-row__value">{{ profile.role }}</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2 class="panel__title">Notifikationer</h2>
      <div class="checkbox-rows">
        <label class="checkbox-row">
          <input v-model="notifyVmReady" type="checkbox" />
          <span>VM er færdigoprettet</span>
        </label>
        <label class="checkbox-row">
          <input v-model="notifyVmFailed" type="checkbox" />
          <span>VM-oprettelse fejlede</span>
        </label>
        <label class="checkbox-row">
          <input v-model="notifyQuotaWarning" type="checkbox" />
          <span>Nærmer sig kvote</span>
        </label>
        <label class="checkbox-row">
          <input v-model="notifyVmStateChange" type="checkbox" />
          <span>VM stoppet eller genstartet</span>
        </label>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  max-width: 640px;
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

.info-rows {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0;
  border-top: 1px solid #eef1f5;
  font-size: 0.86rem;
}

.info-row:first-child {
  border-top: none;
  padding-top: 0;
}

.info-row__label {
  color: #9aa0ac;
}

.info-row__value {
  color: #1f2430;
  font-weight: 600;
}

.checkbox-rows {
  display: flex;
  flex-direction: column;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0;
  border-top: 1px solid #eef1f5;
  font-size: 0.86rem;
  color: #1f2430;
  cursor: pointer;
}

.checkbox-row:first-child {
  border-top: none;
  padding-top: 0;
}

.checkbox-row input {
  width: 16px;
  height: 16px;
  accent-color: #2b6fc2;
  cursor: pointer;
}
</style>