<script setup>
import { computed, ref } from 'vue'
import { activeMembers, balanceLabel, isAvailable, memberCounts, pausedMembers, suggestTeams, teamName, TURMAS } from '../model'
import { go, useHack } from '../store'
import Badge from '../components/Badge.vue'
import Empty from '../components/Empty.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'

function countText(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`
}

const { state, update, flash } = useHack()
const open = ref(false)
const replace = ref(false)
const available = computed(() => state.students.filter(isAvailable))
const placed = computed(() => new Set(state.teams.flatMap((team) => activeMembers(team, state.students).map((student) => student.id))))
const free = computed(() => available.value.filter((student) => !placed.value.has(student.id)).length)
const allocated = computed(() => available.value.filter((student) => placed.value.has(student.id)).length)
const changed = computed(() => state.teams.some((team) => pausedMembers(team, state.students).length))
const size = computed(() => state.teamSize || 6)

function applySuggestion() {
  const next = suggestTeams(state.students, size.value, { vary: true })
  if (!next.length) {
    flash('Nenhum participante disponível para formar equipes.', 'err')
    return
  }
  update((draft) => { draft.teams = next })
  open.value = false
  replace.value = false
  flash('Nova sugestão criada. A divisão das turmas mudou e todo mundo disponível entrou.')
}

function askGenerate() {
  if (state.teams.some((team) => (team.members || []).length)) replace.value = true
  else applySuggestion()
}

function mountManual() {
  if (state.teams.length) {
    open.value = false
    go(`montar?id=${state.teams[0].id}`)
    return
  }
  const numbers = state.teams.map((team) => Number(team.id)).filter((value) => Number.isFinite(value))
  const id = (numbers.length ? Math.max(...numbers) : 0) + 1
  update((draft) => {
    draft.teams.push({ id, status: 'em-montagem', members: [], solution: '' })
  })
  open.value = false
  go(`montar?id=${id}`)
}
</script>

<template>
  <Page title="Equipes" subtitle="As equipes são sugeridas com base nos participantes disponíveis, buscando uma distribuição equilibrada entre as turmas.">
    <template #actions>
      <button class="btn" type="button" @click="open = true">Formar equipes</button>
    </template>
    <div class="grid cols-4">
      <article class="card stat"><div class="stat-label">Disponíveis</div><div class="stat-value">{{ available.length }}</div></article>
      <article class="card stat"><div class="stat-label">Equipes formadas</div><div class="stat-value">{{ state.teams.length }}</div></article>
      <article class="card stat"><div class="stat-label">Alocados</div><div class="stat-value">{{ allocated }}</div></article>
      <article class="card stat"><div class="stat-label">Sem equipe</div><div class="stat-value">{{ free }}</div></article>
    </div>
    <p class="stat-hint mt">O HackLab distribui os participantes disponíveis buscando equilibrar o tamanho das equipes e as turmas. A sugestão é um ponto de partida.</p>
    <div v-if="changed" class="banner warn mt">
      <div>
        <b>A composição das equipes foi alterada porque um participante ficou indisponível.</b>
        <p>Nenhuma equipe foi reorganizada automaticamente.</p>
        <div class="page-actions">
          <button class="btn ghost small" type="button" @click="state.teams[0] && go(`montar?id=${state.teams[0].id}`)">Ajustar manualmente</button>
          <button class="btn small" type="button" @click="replace = true">Gerar nova sugestão</button>
        </div>
      </div>
    </div>
    <div v-if="state.teams.length === 0" class="mt">
      <Empty title="Nenhuma equipe formada" text="Cadastre os participantes disponíveis e gere uma sugestão de formação das equipes.">
        <template #action><button class="btn" type="button" @click="open = true">Formar equipes</button></template>
      </Empty>
    </div>
    <div v-else class="team-grid mt">
      <article v-for="team in state.teams" :key="team.id" class="card">
        <div class="row-between">
          <strong>{{ teamName(team.id) }}</strong>
          <Badge :tone="balanceLabel(team, state.students, state.teams) === 'Equilibrada' ? 'ok' : 'warn'">{{ balanceLabel(team, state.students, state.teams) }}</Badge>
        </div>
        <p>{{ countText(activeMembers(team, state.students).length, 'participante', 'participantes') }}</p>
        <ul class="team-mix">
          <li v-for="turma in TURMAS" :key="turma.id"><span>{{ turma.id }}</span><b>{{ memberCounts(team, state.students, { onlyAvailable: true })[turma.id] }}</b></li>
        </ul>
        <p v-if="pausedMembers(team, state.students).length" class="stat-hint">Atenção. A composição desta equipe mudou.</p>
        <div class="page-actions">
          <button class="btn ghost small" type="button" @click="go(`montar?id=${team.id}`)">Ver equipe</button>
          <button v-if="pausedMembers(team, state.students).length" class="btn ghost small" type="button" @click="go(`montar?id=${team.id}`)">Adicionar participante</button>
        </div>
      </article>
    </div>
    <Modal v-if="open" title="Formar equipes" subtitle="A sugestão usa somente quem está disponível. O tamanho desejado é um objetivo, não uma regra." @close="open = false">
      <p>Participantes disponíveis: {{ available.length }}</p>
      <p v-for="turma in TURMAS" :key="turma.id">{{ turma.id }}: {{ available.filter((student) => student.turma === turma.id).length }}</p>
      <label class="field">
        <span>Tamanho desejado por equipe</span>
        <input class="input" type="number" min="1" :value="size" @input="update((draft) => { draft.teamSize = Math.max(1, Number($event.target.value) || 1) })" />
      </label>
      <p class="stat-hint">Cada sugestão muda a divisão das turmas. As equipes ficam com tamanhos próximos e ninguém disponível fica de fora.</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="mountManual">Montar manualmente</button>
        <button class="btn" type="button" @click="askGenerate">Gerar sugestão</button>
      </template>
    </Modal>
    <Modal v-if="replace" title="Gerar nova sugestão?" subtitle="A formação atual será substituída. Essa ação só acontece porque você pediu." @close="replace = false">
      <p>A divisão entre as turmas muda nesta sugestão. Os tamanhos das equipes continuam próximos.</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="replace = false">Cancelar</button>
        <button class="btn" type="button" @click="applySuggestion">Gerar sugestão</button>
      </template>
    </Modal>
  </Page>
</template>
