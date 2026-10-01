<script setup>
import { computed } from 'vue'
import { journeySteps } from '../model'
import { go, useHack } from '../store'
import Badge from '../components/Badge.vue'
import Page from '../components/Page.vue'
import { toneFor } from '../components/tone'

const { state } = useHack()
const profile = computed(() => state.session?.profile)
const steps = computed(() => journeySteps(state))
const done = computed(() => steps.value.filter((step) => step.status === 'concluida').length)
const current = computed(() => steps.value.find((step) => step.status === 'andamento') || steps.value[steps.value.length - 1])
const actions = computed(() => steps.value.filter((step) => step.status !== 'concluida').slice(0, 3))
const openTasks = computed(() => state.tasks.filter((task) => task.status !== 'Concluído').length)
const openOcc = computed(() => state.occurrences.filter((item) => item.status !== 'Resolvida').length)
const sectors = computed(() => (state.session?.sectors?.length ? state.session.sectors : [state.session?.sector || 'Tecnologia']))
const editorTasks = computed(() => state.tasks.filter((task) => sectors.value.includes(task.sector) && task.status !== 'Concluído'))
const calls = computed(() => state.occurrences.filter((item) => item.category === 'Suporte' && item.status !== 'Resolvida'))

function count(value) {
  return value ? String(value) : '—'
}

function statusLabel(status) {
  if (status === 'concluida') return 'Concluída'
  if (status === 'andamento') return 'Em andamento'
  return 'Pendente'
}
</script>

<template>
  <Page
    v-if="profile === 'Editor'"
    title="Início"
    subtitle="Suas pendências, seu setor e o que acontece no evento."
  >
    <template #actions>
      <button class="btn" type="button" @click="go(`gestao?aba=setores&setor=${encodeURIComponent(sectors[0])}`)">Abrir meu setor</button>
      <button class="btn ghost" type="button" @click="go('evento')">Modo Evento</button>
    </template>
    <div class="grid cols-2 mt">
      <article class="card">
        <h3>Minhas pendências</h3>
        <p v-if="editorTasks.length === 0">Nenhuma pendência encontrada.</p>
        <p v-for="task in editorTasks.slice(0, 3)" :key="task.id">{{ task.title }} · <Badge :tone="toneFor(task.status)">{{ task.status }}</Badge></p>
        <button class="btn ghost small" type="button" @click="go('gestao?aba=pendencias')">Ver pendências</button>
      </article>
      <article class="card">
        <h3>Meu setor</h3>
        <p v-for="name in sectors" :key="name">{{ name }}</p>
        <button class="btn small" type="button" @click="go(`gestao?aba=setores&setor=${encodeURIComponent(sectors[0])}`)">Abrir setor</button>
      </article>
      <article class="card">
        <h3>Atividades do evento</h3>
        <p>Credenciamento, salas e o andamento dos três dias.</p>
        <button class="btn ghost small" type="button" @click="go('evento')">Abrir Modo Evento</button>
      </article>
      <article class="card">
        <h3>Ocorrências relacionadas</h3>
        <p v-if="calls.length === 0">Nenhuma ocorrência aberta. Tudo certo por aqui.</p>
        <p v-for="item in calls.slice(0, 3)" :key="item.id">{{ item.title }}</p>
      </article>
    </div>
  </Page>

  <Page
    v-else
    title="Início"
    :subtitle="profile === 'Consultor' ? 'Acompanhe a preparação, as equipes e o que precisa de atenção.' : 'Acompanhe a preparação do Hackathon e continue de onde parou.'"
  >
    <section class="card journey-card">
      <div class="row-between">
        <div>
          <p class="kicker">Preparação do Hackathon</p>
          <h2>{{ done }} de 7 etapas concluídas</h2>
        </div>
        <button class="btn" type="button" @click="go(current.to)">Continuar organização</button>
      </div>
      <ol class="journey-steps">
        <li v-for="(step, index) in steps" :key="step.label" :class="step.status">
          <span>{{ index + 1 }}</span>
          <b>{{ step.label }}</b>
          <small>{{ statusLabel(step.status) }}</small>
        </li>
      </ol>
    </section>

    <article class="card event-mini">
      <div>
        <p class="kicker">Hackathon</p>
        <h3>{{ state.event.name || 'Hackathon' }}</h3>
      </div>
      <p>Data: {{ state.event.date || 'A definir' }}</p>
      <p>{{ state.event.days || 3 }} dias</p>
      <p>{{ state.event.start || '08:00' }} às {{ state.event.end || '12:00' }}</p>
      <p>Local: {{ state.event.location || 'A cadastrar' }}</p>
    </article>

    <div class="grid cols-3">
      <article class="card stat"><div class="stat-label">Participantes</div><div class="stat-value">{{ count(state.students.length) }}</div></article>
      <article class="card stat"><div class="stat-label">Equipes</div><div class="stat-value">{{ count(state.teams.length) }}</div></article>
      <article class="card stat"><div class="stat-label">Empresas</div><div class="stat-value">{{ count(state.companies.length) }}</div></article>
      <article class="card stat"><div class="stat-label">Desafios</div><div class="stat-value">{{ count(state.challenges.length) }}</div></article>
      <article class="card stat"><div class="stat-label">Pendências</div><div class="stat-value">{{ count(openTasks) }}</div></article>
      <article class="card stat"><div class="stat-label">Ocorrências</div><div class="stat-value">{{ count(openOcc) }}</div></article>
    </div>

    <section class="mt">
      <h3 class="ops-title">Próximas ações</h3>
      <p v-if="actions.length === 0" class="stat-hint">A organização já passou pelas etapas principais.</p>
      <div v-else class="grid cols-3">
        <article v-for="step in actions" :key="step.label" class="card">
          <h3>{{ step.label }}</h3>
          <p class="stat-hint">{{ statusLabel(step.status) }}</p>
          <button class="btn ghost small" type="button" @click="go(step.to)">Abrir</button>
        </article>
      </div>
    </section>
  </Page>
</template>
