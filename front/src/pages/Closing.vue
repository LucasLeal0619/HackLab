<script setup>
import { computed } from 'vue'
import { go } from '../store'
import Page from '../components/Page.vue'
import Tabs from '../components/Tabs.vue'
import Judges from './Judges.vue'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const CLOSE = [
  { id: 'jurados', label: 'Jurados' },
  { id: 'avaliacoes', label: 'Avaliações' },
  { id: 'votacao', label: 'Votação' },
  { id: 'resultados', label: 'Resultados' },
]

const aba = computed(() => (CLOSE.some((item) => item.id === props.params.aba) ? props.params.aba : 'jurados'))
</script>

<template>
  <Page title="Encerramento" subtitle="Jurados, avaliações, votação e divulgação dos resultados.">
    <Tabs :tabs="CLOSE" :model-value="aba" @update:model-value="(id) => go(`encerramento?aba=${id}`)" />
  </Page>
  <div class="journey-slot">
    <Judges :params="params" :part="aba" />
  </div>
</template>
