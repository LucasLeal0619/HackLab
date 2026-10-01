<script setup>
import { computed } from 'vue'
import { isAvailable, journeySteps } from '../model'
import { go, useHack } from '../store'
import Badge from '../components/Badge.vue'
import Page from '../components/Page.vue'
import { toneFor } from '../components/tone'

const { state } = useHack()
const profile = computed(() => state.session?.profile)
const steps = computed(() => journeySteps(state))
const done = computed(() => steps.value.filter((step) => step.status === 'concluida').length)
const current = computed(() => steps.value.find((step) => step.status === 'andamento') || steps.value[steps.value.length - 1])
const openTasks = computed(() => state.tasks.filter((task) => task.status !== 'Concluído').length)
const openOcc = computed(() => state.occurrences.filter((item) => item.status !== 'Resolvida').length)
const available = computed(() => state.students.filter(isAvailable).length)
const present = computed(() => state.checkins.filter((item) => item.status === 'Presente').length)
const finishedEvals = computed(() => state.evaluations.filter((item) => item.status === 'concluida').length)
const votes = computed(() => state.voting?.ballots?.length || 0)
const withoutTeam = computed(() => {
  const placed = new Set(state.teams.flatMap((team) => team.members || []))
  return state.students.filter((student) => isAvailable(student) && !placed.has(student.id)).length
})
const notices = computed(() => {
  const items = []
  if (withoutTeam.value) items.push({ text: `${withoutTeam.value} participante${withoutTeam.value === 1 ? '' : 's'} ainda sem equipe`, to: 'equipes' })
  if (openTasks.value) items.push({ text: `${openTasks.value} pendência${openTasks.value === 1 ? '' : 's'} aberta${openTasks.value === 1 ? '' : 's'}`, to: 'pendencias' })
  if (state.teams.length && state.evaluations.length === 0) items.push({ text: 'Avaliações ainda não iniciadas', to: 'avaliacoes' })
  return items
})
const sectors = computed(() => (state.session?.sectors?.length ? state.session.sectors : [state.session?.sector || 'Tecnologia']))
const editorTasks = computed(() => state.tasks.filter((task) => sectors.value.includes(task.sector) && task.status !== 'Concluído'))
const calls = computed(() => state.occurrences.filter((item) => item.category === 'Suporte' && item.status !== 'Resolvida'))

function statusLabel(status) {
  if (status === 'concluida') return 'Concluída'
  if (status === 'andamento') return 'Em andamento'
  return 'Pendente'
}
</script>

<template>
  <Page
    v-if="profile === 'Editor'"
    title="Dashboard"
    subtitle="Suas pendências, seu setor e o que acontece no evento."
  >
    <template #actions>
      <button class="btn" type="button" @click="go(`setores?setor=${encodeURIComponent(sectors[0])}`)">Abrir meu setor</button>
      <button class="btn ghost" type="button" @click="go('evento')">Modo Evento</button>
    </template>
    <div class="grid cols-2 mt">
      <article class="card">
        <h3>Minhas pendências</h3>
        <p v-if="editorTasks.length === 0">Nenhuma pendência encontrada.</p>
        <p v-for="task in editorTasks.slice(0, 3)" :key="task.id">{{ task.title }} · <Badge :tone="toneFor(task.status)">{{ task.status }}</Badge></p>
        <button class="btn ghost small" type="button" @click="go('pendencias')">Ver pendências</button>
      </article>
      <article class="card">
        <h3>Meu setor</h3>
        <p v-for="name in sectors" :key="name">{{ name }}</p>
        <button class="btn small" type="button" @click="go(`setores?setor=${encodeURIComponent(sectors[0])}`)">Abrir setor</button>
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
    title="Dashboard"
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

    <section class="mt">
      <h3 class="ops-title">Preparação</h3>
      <div class="grid cols-4">
        <button class="card stat dash-link" type="button" @click="go('participantes')"><div class="stat-label">Participantes</div><div class="stat-value">{{ state.students.length }}</div></button>
        <button class="card stat dash-link" type="button" @click="go('participantes')"><div class="stat-label">Disponíveis</div><div class="stat-value">{{ available }}</div></button>
        <button class="card stat dash-link" type="button" @click="go('equipes')"><div class="stat-label">Equipes</div><div class="stat-value">{{ state.teams.length }}</div></button>
        <button class="card stat dash-link" type="button" @click="go('empresas')"><div class="stat-label">Empresas</div><div class="stat-value">{{ state.companies.length }}</div></button>
        <button class="card stat dash-link" type="button" @click="go('desafios')"><div class="stat-label">Desafios</div><div class="stat-value">{{ state.challenges.length }}</div></button>
      </div>
    </section>
    <section class="mt">
      <h3 class="ops-title">Gestão</h3>
      <div class="grid cols-3">
        <button class="card stat dash-link" type="button" @click="go('pendencias')"><div class="stat-label">Pendências</div><div class="stat-value">{{ openTasks }}</div></button>
        <button class="card stat dash-link" type="button" @click="go('reunioes')"><div class="stat-label">Reuniões</div><div class="stat-value">{{ state.meetings.length }}</div></button>
        <button class="card stat dash-link" type="button" @click="go('documentos')"><div class="stat-label">Documentos</div><div class="stat-value">{{ state.documents.length }}</div></button>
      </div>
    </section>
    <section class="mt">
      <h3 class="ops-title">Evento</h3>
      <div class="grid cols-2">
        <button class="card stat dash-link" type="button" @click="go('presenca')"><div class="stat-label">Presenças</div><div class="stat-value">{{ present }}</div></button>
        <button class="card stat dash-link" type="button" @click="go('ocorrencias')"><div class="stat-label">Ocorrências</div><div class="stat-value">{{ openOcc }}</div></button>
      </div>
    </section>
    <section class="mt">
      <h3 class="ops-title">Encerramento</h3>
      <div class="grid cols-2">
        <button class="card stat dash-link" type="button" @click="go('avaliacoes')"><div class="stat-label">Avaliações</div><div class="stat-value">{{ finishedEvals }}</div></button>
        <button class="card stat dash-link" type="button" @click="go('votacao-gestao')"><div class="stat-label">Votos</div><div class="stat-value">{{ votes }}</div></button>
      </div>
    </section>

    <section class="mt">
      <h3 class="ops-title">Próximas ações</h3>
      <p v-if="notices.length === 0" class="stat-hint">Nenhuma ação pendente neste momento.</p>
      <div v-else class="grid cols-3">
        <article v-for="item in notices" :key="item.text" class="card">
          <h3>{{ item.text }}</h3>
          <button class="btn ghost small" type="button" @click="go(item.to)">Abrir</button>
        </article>
      </div>
    </section>
  </Page>
</template>
