<script setup>
import { computed, ref, watch } from 'vue'
import { activeMembers, companyOf, teamChallenge, teamName, TURMAS } from '../model'
import { go, useHack } from '../store'
import Badge from '../components/Badge.vue'
import Empty from '../components/Empty.vue'
import Page from '../components/Page.vue'
import { toneFor } from '../components/tone.js'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const REPORTS = [
  ['visao', 'Visão geral', 'Participantes, equipes, presença, avaliações e votação.'],
  ['participantes', 'Participantes', 'Cadastrados por turma e situação de disponibilidade.'],
  ['presenca', 'Presença', 'Registro nos três dias.'],
  ['equipes', 'Equipes', 'Composição, empresa e desafio.'],
  ['empresas', 'Empresas e desafios', 'Empresa, desafio, equipe e status.'],
  ['avaliacoes', 'Avaliações', 'Andamento do resultado técnico.'],
  ['votacao', 'Votação', 'Votos registrados, quando existirem.'],
  ['ocorrencias', 'Ocorrências', 'Abertas, resolvidas, prioridade e local.'],
  ['financeiro', 'Financeiro', 'Orçamento, receitas, despesas e saldo.'],
  ['reunioes', 'Reuniões', 'Reuniões, atas, manifestações, decisões e pendências.'],
]

function money(value) {
  if (value === '' || value == null || Number.isNaN(Number(value))) return null
  return Number(value)
}

function brl(value) {
  if (value == null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function knownAmount(item, kind) {
  if (kind === 'receita') return money(item.value)
  if (item.actual !== '' && item.actual != null) return money(item.actual)
  if (item.planned !== '' && item.planned != null) return money(item.planned)
  return null
}

function presentOn(source, personId, day) {
  return source.checkins.some((item) => item.personId === personId && Number(item.day) === day && item.status === 'Presente')
}

function teamEvalStatus(source, teamId) {
  const items = source.evaluations.filter((item) => item.teamId === teamId)
  if (items.some((item) => item.status === 'revisao')) return 'Em revisão'
  const done = items.filter((item) => item.status === 'concluida')
  const judges = source.judges.filter((item) => item.status !== 'Inativo')
  if (!items.length) return 'Não iniciada'
  if (judges.length && done.length >= judges.length) return 'Concluída'
  if (!judges.length && done.length) return 'Concluída'
  return 'Em andamento'
}

function averageOf(source, teamId) {
  const scores = source.evaluations
    .filter((item) => item.teamId === teamId && item.status === 'concluida')
    .flatMap((item) => Object.values(item.scores || {}).map(Number).filter((value) => !Number.isNaN(value)))
  if (!scores.length) return null
  return scores.reduce((sum, value) => sum + value, 0) / scores.length
}

function teamStatusLabel(value) {
  return { 'nao-formada': 'Não formada', 'em-montagem': 'Em formação', confirmada: 'Confirmada' }[value] || value
}

function optionValue(item) {
  return Array.isArray(item) ? item[0] : item
}

function optionLabel(item) {
  return Array.isArray(item) ? item[1] : item
}

function barStyle(items, value) {
  const max = Math.max(...items.map((item) => item.value), 1)
  return { width: `${(value / max) * 100}%` }
}

const { state, flash } = useHack()
const selected = computed(() => (REPORTS.some((item) => item[0] === props.params.tipo) ? props.params.tipo : ''))
const filters = ref({ type: '', status: '', category: '' })

watch(selected, (value) => {
  if (filters.value.type !== value) filters.value = { type: value, status: '', category: '' }
}, { immediate: true })

const meta = computed(() => REPORTS.find((item) => item[0] === selected.value))
const statuses = computed(() => {
  if (selected.value === 'equipes') return [['nao-formada', 'Não formada'], ['em-montagem', 'Em formação'], ['confirmada', 'Confirmada']]
  if (selected.value === 'avaliacoes') return ['Não iniciada', 'Em andamento', 'Concluída', 'Em revisão']
  if (selected.value === 'ocorrencias') return [...new Set(state.occurrences.map((item) => item.status).filter(Boolean))]
  if (selected.value === 'reunioes') return [...new Set(state.meetings.map((item) => item.status).filter(Boolean))]
  return null
})
const categories = computed(() => {
  if (selected.value === 'ocorrencias') return [...new Set(state.occurrences.map((item) => item.category).filter(Boolean))]
  if (selected.value === 'financeiro') return ['Receita', 'Despesa']
  return null
})

const overviewItems = computed(() => {
  const present = state.students.filter((item) => [1, 2, 3].some((day) => presentOn(state, item.id, day))).length
  const openCount = state.occurrences.filter((item) => item.status !== 'Resolvida').length
  return [
    ['Participantes cadastrados', state.students.length || '—'],
    ['Participantes disponíveis', state.students.filter((item) => (item.availability || 'Disponível') === 'Disponível').length || '—'],
    ['Equipes', state.teams.length || '—'],
    ['Empresas', state.companies.length || '—'],
    ['Desafios', state.challenges.length || '—'],
    ['Presença', present || '—'],
    ['Ocorrências abertas', openCount || '—'],
    ['Avaliações concluídas', state.evaluations.filter((item) => item.status === 'concluida').length || '—'],
    ['Votação', state.voting.ballots.length ? `${state.voting.ballots.length} votos · ${state.voting.status}` : state.voting.status],
  ]
})

const peopleBars = computed(() => TURMAS.map((turma) => ({ label: turma.id, value: state.students.filter((item) => item.turma === turma.id).length })))
const peopleRows = computed(() => state.students.map((item) => {
  const team = state.teams.find((entry) => entry.members.includes(item.id))
  return [item.name, item.turma, team ? teamName(team.id) : 'Sem equipe']
}))
const presenceRows = computed(() => state.students.map((item) => {
  const marks = [1, 2, 3].map((day) => (presentOn(state, item.id, day) ? 'Presente' : '—'))
  const count = marks.filter((mark) => mark === 'Presente').length
  return [item.name, ...marks, count ? `${count} de 3` : '—']
}))
const teamRows = computed(() => state.teams.filter((team) => !filters.value.status || team.status === filters.value.status).map((team) => {
  const challenge = teamChallenge(state, team.id)
  const company = challenge ? companyOf(state, challenge.companyId) : null
  return [teamName(team.id), activeMembers(team, state.students).length || '—', company?.name || '—', challenge?.title || '—', teamStatusLabel(team.status)]
}))
const companyRows = computed(() => state.challenges.map((item) => [
  companyOf(state, item.companyId)?.name || '—',
  item.title,
  item.teamId ? teamName(item.teamId) : '—',
  item.status || '—',
]))
const evalRows = computed(() => state.teams.map((team) => {
  const count = state.evaluations.filter((item) => item.teamId === team.id && item.status === 'concluida').length
  const avg = averageOf(state, team.id)
  const label = teamEvalStatus(state, team.id)
  return { team, count, avg, label }
}).filter((item) => !filters.value.status || item.label === filters.value.status))
const voteTotal = computed(() => state.voting.ballots.length)
const voteRows = computed(() => state.teams.map((team) => {
  const votes = state.voting.ballots.filter((item) => item.teamId === team.id).length
  return [teamName(team.id), votes, voteTotal.value ? `${Math.round((votes / voteTotal.value) * 100)}%` : '0%']
}))
const openCount = computed(() => state.occurrences.filter((item) => item.status !== 'Resolvida').length)
const resolvedCount = computed(() => state.occurrences.filter((item) => item.status === 'Resolvida').length)
const occurrenceGroups = computed(() => [...new Set(state.occurrences.map((item) => item.category).filter(Boolean))])
const occurrenceBars = computed(() => occurrenceGroups.value.map((item) => ({ label: item, value: state.occurrences.filter((entry) => entry.category === item).length })))
const occurrenceRows = computed(() => state.occurrences.filter((item) => (!filters.value.status || item.status === filters.value.status) && (!filters.value.category || item.category === filters.value.category)))
const incomeValues = computed(() => state.incomes.map((item) => knownAmount(item, 'receita')).filter((value) => value != null))
const expenseValues = computed(() => state.expenses.map((item) => knownAmount(item, 'despesa')).filter((value) => value != null))
const incomeTotal = computed(() => (incomeValues.value.length ? incomeValues.value.reduce((sum, value) => sum + value, 0) : null))
const expenseTotal = computed(() => (expenseValues.value.length ? expenseValues.value.reduce((sum, value) => sum + value, 0) : null))
const balance = computed(() => (incomeTotal.value != null || expenseTotal.value != null ? (incomeTotal.value || 0) - (expenseTotal.value || 0) : null))
const movements = computed(() => [
  ...state.incomes.map((item) => ({ tipo: 'Receita', description: item.description, value: knownAmount(item, 'receita'), status: item.status })),
  ...state.expenses.map((item) => ({ tipo: 'Despesa', description: item.description, value: knownAmount(item, 'despesa'), status: item.status })),
].filter((item) => !filters.value.category || item.tipo === filters.value.category))
const filteredMeetings = computed(() => state.meetings.filter((item) => !filters.value.status || item.status === filters.value.status))
const manifestations = computed(() => state.meetings.reduce((sum, item) => sum + (item.ata?.manifestations?.length || 0), 0))
const atas = computed(() => state.meetings.filter((item) => item.ata).length)

function choose(id) {
  go(id ? `relatorios?tipo=${id}` : 'relatorios')
}

function exportDemo() {
  flash('Exportação demonstrativa. Nenhum arquivo foi gerado.')
}

function printPage() {
  window.print()
}
</script>

<template>
  <Page title="Relatórios" subtitle="Consulte o que aconteceu na organização e no evento.">
    <p class="stat-hint">Escolha o que deseja analisar.</p>
    <div class="report-picks">
      <button
        v-for="[id, title, text] in REPORTS"
        :key="id"
        type="button"
        :class="['card', 'report-pick', { on: selected === id }]"
        :aria-pressed="selected === id ? 'true' : 'false'"
        @click="choose(id)"
      >
        <b>{{ title }}</b>
        <span>{{ text }}</span>
      </button>
    </div>
    <section v-if="selected" class="report-body">
      <div class="row-between">
        <h2 class="ops-title">{{ meta[1] }}</h2>
        <div class="page-actions">
          <button class="btn ghost" @click="exportDemo">Exportar PDF</button>
          <button class="btn ghost" @click="exportDemo">Exportar planilha</button>
          <button class="btn ghost" @click="printPage">Imprimir</button>
        </div>
      </div>
      <div class="filters">
        <label class="field">Período
          <select class="input" aria-label="Período"><option value="todo">Todo o evento</option></select>
        </label>
        <label v-if="statuses" class="field">Status
          <select v-model="filters.status" class="input" aria-label="Status">
            <option value="">Todos</option>
            <option v-for="item in statuses" :key="optionValue(item)" :value="optionValue(item)">{{ optionLabel(item) }}</option>
          </select>
        </label>
        <label v-if="categories" class="field">Categoria
          <select v-model="filters.category" class="input" aria-label="Categoria">
            <option value="">Todas</option>
            <option v-for="item in categories" :key="item">{{ item }}</option>
          </select>
        </label>
      </div>

      <div v-if="selected === 'visao'" class="grid cols-3">
        <article v-for="[label, value] in overviewItems" :key="label" class="card">
          <h3>{{ label }}</h3>
          <div class="stat-value" :style="{ fontSize: 28 }">{{ value }}</div>
        </article>
      </div>

      <template v-else-if="selected === 'participantes'">
        <div class="bars" aria-label="Distribuição">
          <div v-for="item in peopleBars" :key="item.label" class="bar-row">
            <span>{{ item.label }}</span>
            <div class="bar-track"><div :style="barStyle(peopleBars, item.value)" /></div>
            <b>{{ item.value }}</b>
          </div>
        </div>
        <p class="stat-hint">Cadastrados neste protótipo: {{ state.students.length || '—' }}.</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Participante</th><th>Turma</th><th>Equipe</th></tr></thead>
            <tbody>
              <tr v-if="peopleRows.length === 0"><td colspan="3">Nenhum participante cadastrado.</td></tr>
              <tr v-for="(row, index) in peopleRows" v-else :key="index">
                <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="selected === 'presenca'">
        <Empty v-if="state.students.length === 0" title="Nenhum registro de presença." text="Não há participantes cadastrados para consultar." />
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Participante</th><th>Dia 1</th><th>Dia 2</th><th>Dia 3</th><th>Frequência</th></tr></thead>
            <tbody>
              <tr v-if="presenceRows.length === 0"><td colspan="5">Nenhum registro de presença.</td></tr>
              <tr v-for="(row, index) in presenceRows" v-else :key="index">
                <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div v-else-if="selected === 'equipes'" class="table-wrap">
        <table>
          <thead><tr><th>Equipe</th><th>Participantes</th><th>Empresa</th><th>Desafio</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-if="teamRows.length === 0"><td colspan="5">Nenhuma equipe encontrada para este filtro.</td></tr>
            <tr v-for="(row, index) in teamRows" v-else :key="index">
              <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <template v-else-if="selected === 'empresas'">
        <Empty v-if="state.companies.length === 0 && state.challenges.length === 0" title="Não há dados suficientes para esta visualização." />
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Empresa</th><th>Desafio</th><th>Equipe</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-if="companyRows.length === 0"><td colspan="4">Nenhum desafio distribuído.</td></tr>
              <tr v-for="(row, index) in companyRows" v-else :key="index">
                <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="selected === 'avaliacoes'">
        <Empty v-if="state.evaluations.length === 0 && !filters.status" title="Nenhuma avaliação registrada." />
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Equipe</th><th>Avaliações</th><th>Resultado</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-if="evalRows.length === 0"><td colspan="4">Nenhuma avaliação para este filtro.</td></tr>
              <tr v-for="(item, index) in evalRows" v-else :key="index">
                <td>{{ teamName(item.team.id) }}</td>
                <td>{{ item.count || '—' }}</td>
                <td>{{ item.avg == null ? '—' : item.avg.toFixed(1) }}</td>
                <td>{{ item.label }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="selected === 'votacao'">
        <p>Status <Badge :tone="toneFor(state.voting.status)">{{ state.voting.status }}</Badge></p>
        <p>Total de votos: {{ voteTotal || '—' }}</p>
        <Empty v-if="voteTotal === 0" title="Não há dados suficientes para esta visualização." text="A votação ainda não registrou votos." />
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Equipe</th><th>Votos</th><th>Percentual</th></tr></thead>
            <tbody>
              <tr v-if="voteRows.length === 0"><td colspan="3">Nenhum voto registrado.</td></tr>
              <tr v-for="(row, index) in voteRows" v-else :key="index">
                <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="selected === 'ocorrencias'">
        <div class="grid cols-3">
          <article class="card"><h3>Abertas</h3><div class="stat-value">{{ openCount || '—' }}</div></article>
          <article class="card"><h3>Resolvidas</h3><div class="stat-value">{{ resolvedCount || '—' }}</div></article>
          <article class="card"><h3>Total</h3><div class="stat-value">{{ state.occurrences.length || '—' }}</div></article>
        </div>
        <p v-if="occurrenceGroups.length === 0" class="stat-hint">Não há dados suficientes para gerar esta visualização.</p>
        <div v-else class="bars" aria-label="Distribuição">
          <div v-for="item in occurrenceBars" :key="item.label" class="bar-row">
            <span>{{ item.label }}</span>
            <div class="bar-track"><div :style="barStyle(occurrenceBars, item.value)" /></div>
            <b>{{ item.value }}</b>
          </div>
        </div>
        <Empty v-if="occurrenceRows.length === 0" title="Nenhuma ocorrência registrada." />
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Ocorrência</th><th>Categoria</th><th>Local</th><th>Prioridade</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="(item, index) in occurrenceRows" :key="index">
                <td>{{ item.title }}</td>
                <td>{{ item.category || '—' }}</td>
                <td>{{ item.place || '—' }}</td>
                <td>{{ item.priority || '—' }}</td>
                <td>{{ item.status || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="selected === 'financeiro'">
        <div class="grid cols-4">
          <article class="card"><h3>Orçamento</h3><div class="stat-value">—</div></article>
          <article class="card"><h3>Receitas</h3><div class="stat-value">{{ brl(incomeTotal) }}</div></article>
          <article class="card"><h3>Despesas</h3><div class="stat-value">{{ brl(expenseTotal) }}</div></article>
          <article class="card"><h3>Saldo</h3><div class="stat-value">{{ brl(balance) }}</div></article>
        </div>
        <p v-if="movements.length === 0" class="stat-hint">Não há dados suficientes para gerar esta visualização.</p>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="(item, index) in movements" :key="index">
                <td>{{ item.description || '—' }}</td>
                <td>{{ item.tipo }}</td>
                <td>{{ item.value == null ? '—' : brl(item.value) }}</td>
                <td>{{ item.status || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="selected === 'reunioes'">
        <div class="grid cols-4">
          <article class="card"><h3>Reuniões</h3><div class="stat-value">{{ state.meetings.length || '—' }}</div></article>
          <article class="card"><h3>Atas</h3><div class="stat-value">{{ atas || '—' }}</div></article>
          <article class="card"><h3>Manifestações</h3><div class="stat-value">{{ manifestations || '—' }}</div></article>
          <article class="card"><h3>Decisões</h3><div class="stat-value">{{ state.decisions.length || '—' }}</div></article>
        </div>
        <p class="stat-hint">Pendências: {{ state.tasks.length || '—' }}.</p>
        <Empty v-if="filteredMeetings.length === 0" title="Não há dados suficientes para esta visualização." />
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Reunião</th><th>Status</th><th>Ata</th><th>Manifestações</th></tr></thead>
            <tbody>
              <tr v-for="(item, index) in filteredMeetings" :key="index">
                <td>{{ item.title }}</td>
                <td>{{ item.status || '—' }}</td>
                <td>{{ item.ata ? (item.ata.status || 'Registrada') : '—' }}</td>
                <td>{{ item.ata?.manifestations?.length || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </Page>
</template>
