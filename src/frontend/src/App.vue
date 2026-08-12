<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue'
</script>

<template>
  <div class="layout">
    <AppSidebar />
    <main class="layout__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.layout__content {
  flex: 1;
  min-width: 0;
  padding: 1.5rem;
  overflow-y: auto;
}
</style>
