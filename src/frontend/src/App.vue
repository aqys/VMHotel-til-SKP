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
}

.layout__content {
  flex: 1;
  padding: 1.5rem;
}
</style>
