<script setup>
import { computed, ref } from 'vue'
import { activeMembers, AVAILABILITY, balanceLabel, isAvailable, memberCounts, pausedMembers, reservedIds, teamName, TURMAS } from '../model'
import { go, useHack } from '../store'
import Badge from '../components/Badge.vue'
import Empty from '../components/Empty.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'
import Tabs from '../components/Tabs.vue'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

function countText(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`
}

function availabilityOfSafe(student) {
  return AVAILABILITY.includes(student.availability) ? student.availability : 'Disponível'
}

const { state, update, flash } = useHack()
const query = ref('')
const turma = ref('Todas')
const blocked = ref(null)
const team = computed(() => state.teams.find((item) => String(item.id) === String(props.params.id)) || state.teams[0])
const taken = computed(() => reservedIds(state.teams, team.value?.id))
const active = computed(() => (team.value ? activeMembers(team.value, state.students) : []))
const paused = computed(() => (team.value ? pausedMembers(team.value, state.students) : []))
const counts = computed(() => (team.value ? memberCounts(team.value, state.students, { onlyAvailable: true }) : {}))
const pool = computed(() => state.students.filter((student) => {
  if (!team.value) return false
  const matches = student.name.toLowerCase().includes(query.value.toLowerCase())
  const turmaOk = turma.value === 'Todas' || student.turma === turma.value
  return matches && turmaOk && isAvailable(student) && !team.value.members.includes(student.id) && !taken.value.has(student.id)
}))
const tabs = computed(() => [{ id: 'Todas', label: 'Todos' }, ...TURMAS.map((item) => ({ id: item.id, label: item.id }))])

function add(student) {
  if (!isAvailable(student)) {
    flash('Somente participantes disponíveis entram na formação.', 'err')
    return
  }
  if (taken.value.has(student.id)) {
    const owner = state.teams.find((item) => item.id !== team.value.id && item.members.includes(student.id))
    blocked.value = { student, owner }
    return
  }
  if (team.value.members.includes(student.id)) return
  update((draft) => {
    const current = draft.teams.find((item) => item.id === team.value.id)
    current.members.push(student.id)
    if (current.status === 'nao-formada') current.status = 'em-montagem'
  })
}

function remove(studentId) {
  update((draft) => {
    const current = draft.teams.find((item) => item.id === team.value.id)
    current.members = current.members.filter((item) => item !== studentId)
  })
}

function transfer() {
  if (!blocked.value?.owner) return
  const student = blocked.value.student
  update((draft) => {
    const from = draft.teams.find((item) => item.id === blocked.value.owner.id)
    const to = draft.teams.find((item) => item.id === team.value.id)
    if (from) from.members = from.members.filter((item) => item !== student.id)
    if (to && !to.members.includes(student.id)) to.members.push(student.id)
  })
  blocked.value = null
  flash(`${student.name} foi transferido para a ${teamName(team.value.id)}.`)
}
</script>

<template>
  <Page v-if="!team" title="Equipe">
    <template #actions><button class="btn ghost" type="button" @click="go('preparacao?aba=equipes')">Voltar</button></template>
    <Empty title="Nenhuma equipe formada" text="Gere uma sugestão ou comece uma equipe manualmente.">
      <template #action><button class="btn" type="button" @click="go('preparacao?aba=equipes')">Ir para Equipes</button></template>
    </Empty>
  </Page>
  <Page v-else :crumbs="`Equipes / ${teamName(team.id)}`" :title="teamName(team.id)" subtitle="Ajuste a equipe manualmente. A sugestão automática não impede essas alterações.">
    <template #actions><button class="btn ghost" type="button" @click="go('preparacao?aba=equipes')">Voltar</button></template>
    <div class="card">
      <div class="row-between">
        <h3>{{ countText(active.length, 'participante disponível', 'participantes disponíveis') }}</h3>
        <Badge :tone="balanceLabel(team, state.students, state.teams) === 'Equilibrada' ? 'ok' : 'warn'">{{ balanceLabel(team, state.students, state.teams) }}</Badge>
      </div>
      <p class="stat-hint">Breno {{ counts.Breno }} · Rafael {{ counts.Rafael }} · Clara {{ counts.Clara }}</p>
      <p class="stat-hint">Tamanho desejado: {{ state.teamSize || 6 }}. Esse número é uma referência.</p>
      <p v-if="paused.length">Atenção. A composição desta equipe mudou.</p>
    </div>
    <div class="split mt">
      <section class="card">
        <h3>Participantes disponíveis</h3>
        <Tabs :tabs="tabs" :model-value="turma" @update:model-value="turma = $event" />
        <input v-model="query" class="input" placeholder="Buscar participante" aria-label="Buscar participante" />
        <p v-if="pool.length === 0" class="stat-hint">Nenhum participante disponível nesta visão.</p>
        <div v-for="student in pool" :key="student.id" class="person">
          <span>{{ student.name }}<br /><small>{{ student.turma }}</small></span>
          <button class="btn ghost small" type="button" @click="add(student)">Adicionar</button>
        </div>
      </section>
      <aside class="card">
        <h3>Nesta equipe</h3>
        <p v-if="active.length === 0">Nenhum participante disponível nesta equipe.</p>
        <div v-for="student in active" :key="student.id" class="person">
          <span>{{ student.name }}<br /><small>{{ student.turma }}</small></span>
          <button class="btn ghost small" type="button" @click="remove(student.id)">Remover</button>
        </div>
        <template v-if="paused.length">
          <h3>Fora da formação</h3>
          <div v-for="student in paused" :key="student.id" class="person">
            <span>{{ student.name }}<br /><small>{{ availabilityOfSafe(student) }}</small></span>
            <button class="btn ghost small" type="button" @click="remove(student.id)">Remover</button>
          </div>
        </template>
      </aside>
    </div>
    <Modal v-if="blocked" title="Participante já está em outra equipe" subtitle="Remova ou transfira antes de colocá-lo nesta equipe." @close="blocked = null">
      <p><b>{{ blocked.student.name }}</b> já pertence à {{ blocked.owner ? teamName(blocked.owner.id) : 'outra equipe' }}.</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="blocked = null">Escolher outro</button>
        <button v-if="blocked.owner" class="btn" type="button" @click="transfer">Transferir para esta equipe</button>
      </template>
    </Modal>
  </Page>
</template>
