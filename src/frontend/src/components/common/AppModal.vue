<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const emit = defineEmits<{ close: [] }>()

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-panel" :class="`modal-panel--${size}`" role="dialog" aria-modal="true">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 18, 25, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 2000;
}

.modal-panel {
  width: 100%;
  max-height: calc(100vh - 3rem);
  overflow-y: auto;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(15, 18, 25, 0.3);
  padding: 1.5rem;
  box-sizing: border-box;
}

.modal-panel--sm {
  max-width: 360px;
}

.modal-panel--md {
  max-width: 440px;
}

.modal-panel--lg {
  max-width: 640px;
}
</style>
