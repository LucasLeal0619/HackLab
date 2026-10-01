<script setup>
import { go } from '../store'

defineProps({
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  action: { type: String, default: '' },
  to: { type: String, default: '' },
})
</script>

<template>
  <section v-if="action" class="next-step">
    <div>
      <p class="kicker">Próxima etapa</p>
      <h3>{{ title }}</h3>
      <p>{{ text }}</p>
    </div>
    <button class="btn" type="button" @click="go(to)">{{ action }}</button>
  </section>
</template>
