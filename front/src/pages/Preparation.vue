<script setup>
import { computed } from 'vue'
import { journeySteps } from '../model'
import { go, useHack } from '../store'
import NextStep from '../components/NextStep.vue'
import Page from '../components/Page.vue'
import Tabs from '../components/Tabs.vue'
import Companies from './Companies.vue'
import Config from './Config.vue'
import People from './People.vue'
import Teams from './Teams.vue'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const PREP = [
  { id: 'evento', label: 'Evento' },
  { id: 'participantes', label: 'Participantes' },
  { id: 'equipes', label: 'Equipes' },
  { id: 'empresas', label: 'Empresas e Desafios' },
]

const { state } = useHack()
const aba = computed(() => (PREP.some((item) => item.id === props.params.aba) ? props.params.aba : 'evento'))
const steps = computed(() => journeySteps(state))
const rail = computed(() => [
  ['Evento', steps.value[0]],
  ['Participantes', steps.value[1]],
  ['Equipes', steps.value[2]],
  ['Empresas e desafios', steps.value[3]],
])
const next = computed(() => ({
  evento: steps.value[0].status === 'concluida' ? { title: 'Evento configurado', text: 'Agora cadastre quem vai participar.', action: 'Ir para Participantes', to: 'preparacao?aba=participantes' } : null,
  participantes: state.participantsConfirmed ? { title: 'Lista confirmada', text: 'Agora você pode formar as equipes.', action: 'Ir para Equipes', to: 'preparacao?aba=equipes' } : null,
  equipes: steps.value[2].status === 'concluida' ? { title: 'Equipes organizadas', text: 'Agora associe empresas e desafios.', action: 'Ir para Empresas e Desafios', to: 'preparacao?aba=empresas' } : null,
  empresas: steps.value[0].status === 'concluida' && state.participantsConfirmed && steps.value[2].status === 'concluida' && steps.value[3].status === 'concluida'
    ? { title: 'Preparação concluída', text: 'As informações essenciais do Hackathon estão prontas.', action: 'Ir para Gestão', to: 'gestao?aba=setores' }
    : null,
}[aba.value]))

function mark(status) {
  if (status === 'concluida') return '✓'
  if (status === 'andamento') return '→'
  return '○'
}
</script>

<template>
  <Page title="Preparação" subtitle="Organize o evento, os participantes, as equipes e os desafios.">
    <ol class="prep-rail">
      <li v-for="[label, step] in rail" :key="label" :class="step.status">{{ mark(step.status) }} {{ label }}</li>
    </ol>
    <Tabs :tabs="PREP" :model-value="aba" @update:model-value="(id) => go(`preparacao?aba=${id}`)" />
  </Page>
  <div class="journey-slot">
    <Config v-if="aba === 'evento'" :params="{ aba: params.inner === 'usuarios' ? 'usuarios' : 'hackathon' }" />
    <People v-else-if="aba === 'participantes'" :params="params" />
    <Teams v-else-if="aba === 'equipes'" />
    <Companies v-else-if="aba === 'empresas'" :params="{ aba: params.inner === 'desafios' ? 'desafios' : 'empresas' }" />
  </div>
  <NextStep v-if="next" :title="next.title" :text="next.text" :action="next.action" :to="next.to" />
</template>
