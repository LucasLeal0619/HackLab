<script setup>
import { computed } from 'vue'
import { go } from '../store'
import NextStep from '../components/NextStep.vue'
import Page from '../components/Page.vue'
import Tabs from '../components/Tabs.vue'
import Meetings from './Meetings.vue'
import Sectors from './Sectors.vue'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const GESTAO = [
  { id: 'setores', label: 'Setores' },
  { id: 'reunioes', label: 'Reuniões' },
  { id: 'pendencias', label: 'Pendências' },
  { id: 'documentos', label: 'Documentos' },
]

const aba = computed(() => (GESTAO.some((item) => item.id === props.params.aba) ? props.params.aba : 'setores'))
const meetingAba = computed(() => (props.params.lista === 'atas' ? 'atas' : props.params.lista === 'decisoes' ? 'decisoes' : 'reunioes'))
</script>

<template>
  <Page title="Gestão" subtitle="Acompanhe setores, reuniões, pendências e documentos.">
    <Tabs :tabs="GESTAO" :model-value="aba" @update:model-value="(id) => go(`gestao?aba=${id}`)" />
  </Page>
  <div class="journey-slot">
    <Sectors v-if="aba === 'setores'" :params="params" />
    <Meetings v-else-if="aba === 'reunioes'" :params="{ aba: meetingAba }" embedded />
    <Meetings v-else-if="aba === 'pendencias'" :params="{ aba: 'pendencias' }" embedded />
    <Meetings v-else-if="aba === 'documentos'" :params="{ aba: 'documentos' }" embedded />
  </div>
  <NextStep
    v-if="aba === 'setores' && !params.setor"
    title="Gestão em andamento"
    text="Quando os setores estiverem encaminhados, acompanhe o evento."
    action="Ir para Modo Evento"
    to="evento"
  />
</template>
