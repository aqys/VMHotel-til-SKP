<script setup lang="ts">
import { ref } from 'vue'
import {
  IconFile,
  IconPlus,
  IconDeviceDesktop,
  IconTerminal2,
  IconChevronDown,
  IconCircleCheck,
} from '@tabler/icons-vue'

type SectionId = 'start' | 'guides' | 'faq' | 'feedback'

const sections: { id: SectionId; label: string }[] = [
  { id: 'start', label: 'Kom godt i gang' },
  { id: 'guides', label: 'Guides' },
  { id: 'faq', label: 'Ofte stillede spørgsmål' },
  { id: 'feedback', label: 'Feedback' },
]

const activeSection = ref<SectionId>('start')

const steps = [
  {
    icon: IconFile,
    title: 'Vælg en template',
    text: 'Vælg det operativsystem, du vil bruge.',
  },
  {
    icon: IconPlus,
    title: 'Opret din VM',
    text: "Giv VM'en et navn og vælg ressourcer inden for din kvote.",
  },
  {
    icon: IconDeviceDesktop,
    title: 'Administrer din VM',
    text: "Start, stop og administrer dine VM'er under Mine VM'er.",
  },
  {
    icon: IconTerminal2,
    title: 'Brug terminalen',
    text: "Åbn terminalen fra VM'ens detaljeside.",
  },
]

const guides = [
  {
    id: 'opret-vm',
    title: 'Sådan opretter du en VM',
    text: "Gå ind under Templates og vælg det operativsystem du har brug for. Giv din VM et navn, sæt ressourcer inden for din kvote, og bekræft oprettelsen. Efter et par minutter er VM'en klar under Mine VM'er.",
  },
  {
    id: 'start-stop',
    title: 'Start, stop og genstart en VM',
    text: "Under Mine VM'er eller på VM'ens egen side kan du starte, stoppe og genstarte den med et enkelt klik. En stoppet VM tæller stadig med i din ressourcekvote.",
  },
  {
    id: 'terminal',
    title: 'Sådan bruger du terminalen',
    text: "Åbn VM'ens detaljeside og klik på Terminal. Du bliver forbundet direkte i browseren uden at skulle installere noget selv. Terminalen kræver at VM'en er startet.",
  },
  {
    id: 'ressourcer',
    title: 'Ændring af CPU og RAM',
    text: "Du kan justere vCPU og RAM under VM'ens ressourcer, så længe ændringen holder sig inden for din samlede kvote. Nogle ændringer kræver at VM'en genstartes før de slår igennem.",
  },
  {
    id: 'snapshots',
    title: 'Snapshots og gendannelse',
    text: "Et snapshot gemmer VM'ens tilstand på et bestemt tidspunkt, så du kan gå tilbage til det senere. Det er praktisk lige inden du laver noget der kan gå galt. Du opretter og gendanner snapshots fra VM'ens detaljeside.",
  },
  {
    id: 'kvoter',
    title: 'Forstå dine ressourcekvoter',
    text: 'Din kvote sætter en grænse for hvor mange VM\'er, og hvor meget RAM, vCPU og disk du samlet kan have i brug. Du kan se din nuværende og ledige kapacitet på Dashboard og under Templates.',
  },
  {
    id: 'slet-vm',
    title: 'Sletning af en VM',
    text: "Du sletter en VM fra dens detaljeside eller fra listen over dine VM'er. Sletningen kan ikke fortrydes, og alt data på VM'en går tabt, så sørg for at have det du skal bruge gemt et andet sted.",
  },
]

const faqs = [
  {
    id: 'antal-vms',
    q: "Hvor mange VM'er må jeg have?",
    a: "Du kan maksimalt have 3 VM'er.",
  },
  {
    id: 'kan-ikke-oprette',
    q: 'Hvorfor kan jeg ikke oprette en ny VM?',
    a: 'Du har sandsynligvis nået din grænse for enten antal VM\'er, RAM, vCPU eller disk.',
  },
  {
    id: 'eget-os',
    q: 'Kan jeg installere mit eget operativsystem?',
    a: 'Nej, VM\'er oprettes ud fra de templates der er gjort tilgængelige for dig.',
  },
  {
    id: 'instruktoer-ser-vm',
    q: "Kan en instruktør se mine VM'er?",
    a: "Ja. Instruktører kan se grundlæggende oplysninger om dine VM'er, f.eks. navn, status, IP-adresse, operativsystem og tildelte ressourcer. De kan ikke åbne VM'ens konsol, terminal eller filer. En instruktør kan dog slette en VM, hvis det er nødvendigt.",
  },
  {
    id: 'instruktoer-ser-indhold',
    q: 'Kan en instruktør se hvad jeg laver inde på min VM?',
    a: "Nej. Instruktører har ikke adgang til VM'ens konsol, terminal eller filer gennem VMHotel.",
  },
  {
    id: 'hvilke-ressourcer',
    q: 'Hvilke ressourcer kan en instruktør se?',
    a: 'De kan se de ressourcer der er tildelt VM\'en, fx 2 vCPU, 4 GB RAM og 30 GB disk. De kan ikke se det faktiske forbrug, altså om VM\'en lige nu bruger 75% CPU eller 2,3 GB RAM.',
  },
  {
    id: 'adgangskode',
    q: 'Hvor ændrer jeg min adgangskode?',
    a: 'Din konto administreres gennem skolens Active Directory, så adgangskoden skifter du ikke inde i VMHotel.',
  },
]

const openGuides = ref<Set<string>>(new Set())
const openFaqs = ref<Set<string>>(new Set())

function toggleGuide(id: string) {
  if (openGuides.value.has(id)) openGuides.value.delete(id)
  else openGuides.value.add(id)
}

function toggleFaq(id: string) {
  if (openFaqs.value.has(id)) openFaqs.value.delete(id)
  else openFaqs.value.add(id)
}

const feedbackTypes = [
  { value: 'forslag', label: 'Forslag' },
  { value: 'fejl', label: 'Fejl/problem' },
  { value: 'brugervenlighed', label: 'Brugervenlighed' },
  { value: 'andet', label: 'Andet' },
]

const feedbackType = ref('forslag')
const feedbackSubject = ref('')
const feedbackDescription = ref('')
const feedbackSent = ref(false)

function submitFeedback() {
  if (!feedbackSubject.value.trim() || !feedbackDescription.value.trim()) return
  feedbackSent.value = true
  feedbackType.value = 'forslag'
  feedbackSubject.value = ''
  feedbackDescription.value = ''
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page__title">Hjælp & information</h1>
      <p class="page__subtitle">Kom i gang, find en guide, eller send os din feedback.</p>
    </div>

    <nav class="info-nav">
      <button
        v-for="section in sections"
        :key="section.id"
        type="button"
        class="info-nav__item"
        :class="{ 'info-nav__item--active': activeSection === section.id }"
        @click="activeSection = section.id"
      >
        {{ section.label }}
      </button>
    </nav>

    <section v-if="activeSection === 'start'" class="panel">
      <h2 class="panel__title">Kom godt i gang med VMHotel</h2>
      <p class="panel__intro">Her får du et hurtigt overblik over, hvordan du kommer i gang med VMHotel.</p>

      <div class="step-grid">
        <div v-for="(step, index) in steps" :key="step.title" class="step-card">
          <div class="step-card__top">
            <div class="step-card__icon">
              <component :is="step.icon" :size="20" :stroke-width="1.75" />
            </div>
            <span class="step-card__number">{{ index + 1 }}</span>
          </div>
          <h3 class="step-card__title">{{ step.title }}</h3>
          <p class="step-card__text">{{ step.text }}</p>
        </div>
      </div>
    </section>

    <section v-if="activeSection === 'guides'" class="panel">
      <h2 class="panel__title">Guides</h2>
      <div class="accordion">
        <div v-for="guide in guides" :key="guide.id" class="accordion__item">
          <button type="button" class="accordion__head" @click="toggleGuide(guide.id)">
            <span>{{ guide.title }}</span>
            <IconChevronDown
              :size="16"
              :stroke-width="2"
              class="accordion__chevron"
              :class="{ 'accordion__chevron--open': openGuides.has(guide.id) }"
            />
          </button>
          <p v-if="openGuides.has(guide.id)" class="accordion__body">{{ guide.text }}</p>
        </div>
      </div>
    </section>

    <section v-if="activeSection === 'faq'" class="panel">
      <h2 class="panel__title">Ofte stillede spørgsmål</h2>
      <div class="accordion">
        <div v-for="faq in faqs" :key="faq.id" class="accordion__item">
          <button type="button" class="accordion__head" @click="toggleFaq(faq.id)">
            <span>{{ faq.q }}</span>
            <IconChevronDown
              :size="16"
              :stroke-width="2"
              class="accordion__chevron"
              :class="{ 'accordion__chevron--open': openFaqs.has(faq.id) }"
            />
          </button>
          <p v-if="openFaqs.has(faq.id)" class="accordion__body">{{ faq.a }}</p>
        </div>
      </div>
    </section>

    <section v-if="activeSection === 'feedback'" class="panel">
      <h2 class="panel__title">Har du en idé eller fundet et problem?</h2>
      <p class="panel__intro">Vi vil gerne høre, hvordan VMHotel kan blive bedre. Skriv løs, så kigger vi på det.</p>

      <p v-if="feedbackSent" class="feedback-success">
        <IconCircleCheck :size="18" :stroke-width="1.75" />
        Tak for din feedback. Din besked er blevet sendt.
      </p>

      <form v-else class="feedback-form" @submit.prevent="submitFeedback">
        <label class="field">
          <span class="field__label">Type</span>
          <select v-model="feedbackType" class="field__select">
            <option v-for="type in feedbackTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
          </select>
        </label>

        <label class="field">
          <span class="field__label">Emne</span>
          <input v-model="feedbackSubject" type="text" class="field__input" placeholder="Kort beskrivelse" />
        </label>

        <label class="field">
          <span class="field__label">Beskrivelse</span>
          <textarea
            v-model="feedbackDescription"
            class="field__textarea"
            rows="5"
            placeholder="Beskriv din idé eller det problem du er stødt på"
          ></textarea>
        </label>

        <button type="submit" class="btn-primary feedback-form__submit">Send feedback</button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  max-width: 880px;
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

.page__subtitle {
  margin: 0;
  font-size: 0.86rem;
  color: #6b7280;
}

.info-nav {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid #e6e8ec;
}

.info-nav__item {
  padding: 0.5rem 0.9rem;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
}

.info-nav__item:hover {
  background: #f4f5f7;
  color: #1f2430;
}

.info-nav__item--active {
  background: #2b6fc2;
  color: #fff;
}

.info-nav__item--active:hover {
  background: #2b6fc2;
  color: #fff;
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

.panel__intro {
  margin: 0;
  font-size: 0.86rem;
  color: #4b5160;
  line-height: 1.5;
}

.step-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.9rem;
  margin-top: 0.2rem;
}

.step-card {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.9rem 1rem;
  border: 1px solid #e3e3e3;
  border-radius: 10px;
  background: #fafbfc;
}

.step-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.step-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #eaf1fb;
  color: #2b6fc2;
}

.step-card__number {
  font-size: 0.72rem;
  font-weight: 700;
  color: #9aa0ac;
}

.step-card__title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 700;
  color: #1f2430;
}

.step-card__text {
  margin: 0;
  font-size: 0.8rem;
  color: #6b7280;
  line-height: 1.45;
}

.accordion {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.accordion__item {
  border: 1px solid #eef1f5;
  border-radius: 10px;
  overflow: hidden;
}

.accordion__head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.75rem 0.9rem;
  border: none;
  background: #fff;
  text-align: left;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  color: #1f2430;
  cursor: pointer;
}

.accordion__head:hover {
  background: #f9fafb;
}

.accordion__chevron {
  flex-shrink: 0;
  color: #9aa0ac;
  transition: transform 0.15s ease;
}

.accordion__chevron--open {
  transform: rotate(180deg);
}

.accordion__body {
  margin: 0;
  padding: 0 0.9rem 0.9rem;
  font-size: 0.84rem;
  color: #4b5160;
  line-height: 1.55;
}

.feedback-success {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  background: #eaf6ee;
  color: #1c7a3e;
  font-size: 0.86rem;
  font-weight: 600;
}

.feedback-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  max-width: 480px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #4b5160;
}

.field__select,
.field__input,
.field__textarea {
  border: 1px solid #d5d5d5;
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  font-family: inherit;
  font-size: 0.86rem;
  color: #1f2430;
  background: #fff;
}

.field__select {
  cursor: pointer;
}

.field__textarea {
  resize: vertical;
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
  cursor: pointer;
}

.btn-primary:hover {
  background: #1c5fa8;
}

.feedback-form__submit {
  align-self: flex-start;
}
</style>
