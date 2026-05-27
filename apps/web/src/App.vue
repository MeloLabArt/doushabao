<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import RouteTransition from '@/components/RouteTransition.vue'
import TopBar from '@/components/TopBar.vue'

const router = useRouter()
const transitionDirection = ref<'forward' | 'back'>('forward')

router.beforeEach((to, from) => {
  if (to.name === 'settings') {
    transitionDirection.value = 'forward'
  } else if (from.name === 'settings') {
    transitionDirection.value = 'back'
  }
})

function openSettings() {
  router.push('/settings')
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-white text-neutral-900">
    <TopBar @settings-click="openSettings" />
    <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <RouteTransition :direction="transitionDirection" />
    </main>
  </div>
</template>
