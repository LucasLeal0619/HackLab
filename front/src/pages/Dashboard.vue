<script setup>
import { computed } from 'vue'
import { isAvailable, journeySteps, plural } from '../model'
import { go, useHack } from '../store'
import Badge from '../components/Badge.vue'
import DashboardDomain from '../components/DashboardDomain.vue'
import Page from '../components/Page.vue'
import SectorSummary from '../components/SectorSummary.vue'
import { toneFor } from '../components/tone'

const { state } = useHack()
const profile = computed(() => state.session?.profile)
const steps = computed(() => journeySteps(state))
const done = computed(() => steps.value.filter((step) => step.status === 'concluida').length)
const current = computed(() => steps.value.find((step) => step.status === 'andamento') || steps.value[steps.value.length - 1])
const openTasks = computed(() => state.tasks.filter((task) => task.status !== 'Concluído').length)
const openOccList = computed(() => state.occurrences.filter((item) => item.status !== 'Resolvida'))
const openOcc = computed(() => openOccList.value.length)
const available = computed(() => state.students.filter(isAvailable).length)
const present = computed(() => state.checkins.filter((item) => item.status === 'Presente').length)
const finishedEvals = computed(() => state.evaluations.filter((item) => item.status === 'concluida').length)
const votes = computed(() => state.voting?.ballots?.length || 0)
const withoutTeam = computed(() => {
  const placed = new Set(state.teams.flatMap((team) => team.members || []))
  return state.students.filter((student) => isAvailable(student) && !placed.has(student.id)).length
})
const eventMeta = computed(() => [
  state.event.date || 'Data a definir',
  `${state.event.days || 3} dias`,
  `${state.event.start || '08:00'}–${state.event.end || '12:00'}`,
  state.event.location || 'Local a cadastrar',
])
const domains = computed(() => [
  {
    title: 'Preparação',
    to: 'config',
    action: 'Ver preparação',
    items: [
      { label: 'Participantes', value: state.students.length, to: 'participantes' },
      { label: 'Disponíveis', value: available.value, to: 'participantes' },
      { label: 'Equipes', value: state.teams.length, to: 'equipes' },
      { label: 'Empresas', value: state.companies.length, to: 'empresas' },
      { label: 'Desafios', value: state.challenges.length, to: 'desafios' },
    ],
  },
  {
    title: 'Gestão',
    to: 'setores',
    action: 'Ver gestão',
    items: [
      { label: 'Pendências', value: openTasks.value, to: 'pendencias' },
      { label: 'Reuniões', value: state.meetings.length, to: 'reunioes' },
      { label: 'Documentos', value: state.documents.length, to: 'documentos' },
    ],
  },
  {
    title: 'Evento',
    to: 'evento',
    action: 'Abrir Modo Evento',
    items: [
      { label: 'Presenças', value: present.value, to: 'presenca' },
      { label: 'Ocorrências', value: openOcc.value, to: 'ocorrencias' },
    ],
  },
  {
    title: 'Encerramento',
    to: 'jurados',
    action: 'Ver encerramento',
    items: [
      { label: 'Avaliações', value: finishedEvals.value, to: 'avaliacoes' },
      { label: 'Votos', value: votes.value, to: 'votacao-gestao' },
    ],
  },
])
// Atenção: problema/urgente primeiro, depois pendências, depois informação.
const RANK = { bad: 0, warn: 1, info: 2 }
const attention = computed(() => {
  const items = []
  const broken = state.equipment.filter((item) => item.status === 'Com problema').length
  const urgent = openOccList.value.filter((item) => item.priority === 'Urgente').length
  const otherOcc = openOcc.value - urgent
  if (urgent) items.push({ tone: 'bad', text: plural(urgent, 'ocorrência urgente', 'ocorrências urgentes'), to: 'ocorrencias' })
  if (broken) items.push({ tone: 'bad', text: plural(broken, 'equipamento com problema', 'equipamentos com problema'), to: 'setores?setor=Tecnologia' })
  if (otherOcc) items.push({ tone: 'warn', text: plural(otherOcc, 'ocorrência aberta', 'ocorrências abertas'), to: 'ocorrencias' })
  if (openTasks.value) items.push({ tone: 'warn', text: `${plural(openTasks.value, 'pendência precisa', 'pendências precisam')} de atenção`, to: 'pendencias' })
  if (withoutTeam.value) items.push({ tone: 'warn', text: `${plural(withoutTeam.value, 'participante', 'participantes')} sem equipe`, to: 'equipes' })
  if (state.teams.length && state.evaluations.length === 0) items.push({ tone: 'info', text: 'Avaliações ainda não iniciadas', to: 'avaliacoes' })
  return items.sort((x, y) => RANK[x.tone] - RANK[y.tone])
})
const sectors = computed(() => (state.session?.sectors?.length ? state.session.sectors : [state.session?.sector || 'Tecnologia']))
const editorTasks = computed(() => state.tasks.filter((task) => sectors.value.includes(task.sector) && task.status !== 'Concluído'))
const calls = computed(() => state.occurrences.filter((item) => item.category === 'Suporte' && item.status !== 'Resolvida'))

const STEP_LABELS = ['Configurar evento', 'Participantes', 'Equipes', 'Empresas e desafios', 'Preparação operacional', 'Realizar evento', 'Encerramento']

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
    <SectorSummary class="mt" />
  </Page>

  <Page
    v-else
    title="Dashboard"
    subtitle="Acompanhe a organização e a situação atual do Hackathon."
  >
    <div class="dashboard-cockpit">
      <section class="card dash-block dashboard-progress" aria-labelledby="dash-progress">
        <div class="dash-progress-main">
          <div>
            <p class="dash-event-meta">
              <b>{{ state.event.name || 'Hackathon' }}</b>
              <span v-for="item in eventMeta" :key="item">{{ item }}</span>
            </p>
            <h2 id="dash-progress" class="dash-progress-count"><strong>{{ done }}/{{ steps.length }}</strong> etapas concluídas</h2>
          </div>
          <button class="btn" type="button" @click="go(current.to)">Continuar organização</button>
        </div>
        <ol class="dash-steps">
          <li v-for="(step, index) in steps" :key="step.label" :class="step.status" :title="`${step.label} · ${statusLabel(step.status)}`">
            <span class="dash-step-mark" aria-hidden="true">{{ step.status === 'concluida' ? '✓' : index + 1 }}</span>
            {{ STEP_LABELS[index] || step.label }}
            <span class="sr-only"> — {{ statusLabel(step.status) }}</span>
          </li>
        </ol>
      </section>

      <div class="dashboard-domain-grid">
        <DashboardDomain v-for="item in domains" :key="item.title" v-bind="item" />
      </div>

      <div class="dashboard-bottom">
        <SectorSummary />
        <section class="card dash-block dashboard-action-list" aria-labelledby="dash-attention">
          <div class="dash-block-head">
            <h2 id="dash-attention" class="dash-block-title">Atenção</h2>
          </div>
          <p v-if="attention.length === 0" class="dash-empty"><span class="dash-signal ok">Tudo em ordem</span> Nenhuma ação pendente.</p>
          <ul v-else class="dash-actions">
            <li v-for="item in attention.slice(0, 3)" :key="item.text">
              <a :href="`#/${item.to}`" @click.prevent="go(item.to)"><i class="dash-dot" :class="item.tone" aria-hidden="true" /><span>{{ item.text }}</span><span aria-hidden="true">→</span></a>
            </li>
          </ul>
          <a v-if="attention.length > 3" class="dash-more" href="#/pendencias" @click.prevent="go('pendencias')">+ {{ attention.length - 3 }} {{ attention.length - 3 === 1 ? 'outra' : 'outras' }} · Ver todas →</a>
        </section>
      </div>
    </div>
  </Page>
</template>
