<script setup>
defineProps({
  light: { type: Boolean, default: false },
})
</script>

<template>
  <div class="logo" :class="{ 'on-light': light }">
    <img class="logo-img" :src="light ? '/senac-logo-color.png?v=3' : '/senac-logo-white.png?v=3'" alt="Senac" />
    <div class="logo-name"><span class="hack">Hack</span><span class="lab">Lab</span></div>
  </div>
</template>
