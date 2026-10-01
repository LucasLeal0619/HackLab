<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { availabilityOf, isAvailable, teamName, TURMAS, uid } from '../model'
import { go, useHack } from '../store'
import Badge from '../components/Badge.vue'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'

const blank = { name: '', turma: '', email: '', matricula: '', note: '', availability: 'Disponível' }
const { state, update, flash } = useHack()
const query = ref('')
const turma = ref('Todas')
const statusFilter = ref('Todas')
const equipe = ref('Todas')
const askConfirm = ref(false)
const askReopen = ref(false)
const modal = ref(false)
const viewing = ref(null)
const menu = ref('')
const removing = ref(null)
const form = ref({ ...blank })

const placedIds = computed(() => {
  const ids = new Set()
  state.teams.forEach((team) => {
    if (team.members.length) team.members.forEach((id) => ids.add(id))
  })
  return ids
})

function teamOf(id) {
  return state.teams.find((team) => team.members.includes(id))
}

function closeMenu() { menu.value = '' }
watch(menu, (value) => {
  if (!value) return
  document.addEventListener('mousedown', closeMenu)
}, { flush: 'sync' })
onUnmounted(() => document.removeEventListener('mousedown', closeMenu))
onMounted(() => {})

const rows = computed(() => state.students.filter((student) => {
  const matches = student.name.toLowerCase().includes(query.value.toLowerCase())
  const turmaOk = turma.value === 'Todas' || student.turma === turma.value
  const statusOk = statusFilter.value === 'Todas' || availabilityOf(student) === statusFilter.value
  const team = teamOf(student.id)
  const equipeOk = equipe.value === 'Todas' || (equipe.value === 'Sem equipe' && !team) || (team && teamName(team.id) === equipe.value)
  return matches && turmaOk && statusOk && equipeOk
}))

const registered = computed(() => state.students.length)

function openCreate() {
  form.value = { ...blank }
  modal.value = true
}

function save(event) {
  event?.preventDefault?.()
  if (!form.value.name.trim() || !form.value.turma) {
    flash('Informe o nome e a turma.', 'err')
    return
  }
  update((draft) => {
    if (form.value.id) {
      const index = draft.students.findIndex((item) => item.id === form.value.id)
      if (index >= 0) draft.students[index] = { ...draft.students[index], ...form.value, name: form.value.name.trim(), availability: form.value.availability || 'Disponível' }
    } else {
      draft.students.push({ ...form.value, id: uid('alu'), name: form.value.name.trim(), availability: form.value.availability || 'Disponível' })
    }
  })
  const previous = form.value.id ? state.students.find((student) => student.id === form.value.id) : null
  const leaving = previous && isAvailable(previous) && (form.value.availability || 'Disponível') !== 'Disponível' && teamOf(form.value.id)
  const editing = Boolean(form.value.id)
  modal.value = false
  form.value = { ...blank }
  flash(leaving
    ? 'A composição das equipes foi alterada porque um participante ficou indisponível.'
    : (editing ? 'Participante atualizado.' : 'Participante cadastrado.'))
}

function removeStudent() {
  if (!removing.value) return
  update((draft) => {
    draft.students = draft.students.filter((item) => item.id !== removing.value.id)
    draft.teams.forEach((team) => {
      if (!team.members.includes(removing.value.id)) return
      team.members = team.members.filter((id) => id !== removing.value.id)
      team.status = team.members.length ? 'em-montagem' : 'nao-formada'
    })
    draft.checkins = draft.checkins.filter((item) => item.personId !== removing.value.id)
  })
  removing.value = null
  viewing.value = null
  menu.value = ''
  flash('Participante excluído.')
}

function setAvailability(student, availability) {
  const leaving = isAvailable(student) && availability !== 'Disponível' && teamOf(student.id)
  update((draft) => {
    const current = draft.students.find((item) => item.id === student.id)
    if (current) current.availability = availability
  })
  menu.value = ''
  flash(leaving
    ? 'A composição das equipes foi alterada porque um participante ficou indisponível.'
    : 'Situação do participante atualizada.')
}

function confirmList() {
  if (!state.students.some(isAvailable)) {
    flash('Cadastre ao menos um participante disponível antes de confirmar a lista.', 'err')
    return
  }
  update((draft) => { draft.participantsConfirmed = true })
  askConfirm.value = false
  flash('Lista de participantes confirmada.')
}

function reopenList() {
  update((draft) => { draft.participantsConfirmed = false })
  askReopen.value = false
  flash('Lista de participantes reaberta.')
}

function noteFor(student) {
  const availability = availabilityOf(student)
  if (availability === 'Disponível') return placedIds.value.has(student.id) ? 'Pode participar e já está em uma equipe.' : 'Pode participar normalmente.'
  if (availability === 'Indisponível') return 'Está cadastrado, mas não participará naquele momento.'
  return 'Não participará mais do Hackathon.'
}
</script>

<template>
  <Page crumbs="HackLab / Organização / Participantes" title="Participantes" subtitle="Gerencie os participantes do Hackathon.">
    <template #actions>
      <button v-if="state.participantsConfirmed" class="btn ghost" type="button" @click="askReopen = true">Reabrir participantes</button>
      <button v-else class="btn ghost" type="button" @click="askConfirm = true">Confirmar participantes</button>
      <button class="btn" type="button" @click="openCreate">+ Cadastrar participante</button>
    </template>
    <div class="grid cols-4">
      <article class="card stat"><div class="stat-label">Total cadastrados</div><div class="stat-value">{{ registered }}</div></article>
      <article v-for="item in TURMAS" :key="item.id" class="card stat">
        <div class="stat-label">{{ item.id }}</div>
        <div class="stat-value">{{ state.students.filter((student) => student.turma === item.id).length }}</div>
      </article>
    </div>
    <div class="filters mt">
      <input v-model="query" class="input" placeholder="Buscar participante" aria-label="Buscar participante" />
      <select v-model="turma" class="input" aria-label="Turma">
        <option value="Todas">Turma</option>
        <option v-for="item in TURMAS" :key="item.id" :value="item.id">{{ item.id }}</option>
      </select>
      <select v-model="statusFilter" class="input" aria-label="Status">
        <option value="Todas">Status</option>
        <option>Disponível</option>
        <option>Indisponível</option>
        <option>Desistente</option>
      </select>
      <select v-model="equipe" class="input" aria-label="Equipe">
        <option value="Todas">Equipe</option>
        <option>Sem equipe</option>
        <option v-for="team in state.teams" :key="team.id">{{ teamName(team.id) }}</option>
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Participante</th><th>Turma</th><th>Equipe</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="state.students.length === 0"><td colspan="5"><Empty title="Nenhum participante cadastrado ainda." text="Cadastre os participantes para começar a formação das equipes."><template #action><button class="btn" type="button" @click="openCreate">+ Cadastrar participante</button></template></Empty></td></tr>
          <tr v-else-if="rows.length === 0"><td colspan="5"><Empty title="Nenhum participante encontrado" text="Ajuste a busca ou limpe os filtros."><template #action><button class="btn ghost" type="button" @click="query = ''; turma = 'Todas'; equipe = 'Todas'; statusFilter = 'Todas'">Limpar filtros</button></template></Empty></td></tr>
          <tr v-for="student in rows" v-else :key="student.id">
            <td>{{ student.name }}</td>
            <td>{{ student.turma }}</td>
            <td>{{ teamOf(student.id) ? teamName(teamOf(student.id).id) : '—' }}</td>
            <td>
              <Badge :tone="availabilityOf(student) === 'Disponível' ? 'ok' : availabilityOf(student) === 'Desistente' ? 'danger' : 'warn'">{{ availabilityOf(student) }}</Badge><br />
              <small>{{ noteFor(student) }}</small>
            </td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="viewing = student">Visualizar</button>
                <button class="btn ghost small" type="button" @click="form = { ...blank, ...student, availability: availabilityOf(student) }; modal = true">Editar</button>
                <button class="btn ghost small" type="button" @click="menu = ''; removing = student">Excluir</button>
                <span class="row-menu">
                  <button class="btn ghost small" type="button" title="Mais opções" aria-label="Mais opções" @mousedown.stop @click="menu = menu === student.id ? '' : student.id">⋯</button>
                  <div v-if="menu === student.id" class="menu-pop" @mousedown.stop>
                    <button v-if="teamOf(student.id)" type="button" @click="go(`montar?id=${teamOf(student.id).id}`)">Abrir equipe</button>
                    <button v-else type="button" @click="go('preparacao?aba=equipes')">Ver equipes</button>
                    <button v-if="availabilityOf(student) !== 'Disponível'" type="button" @click="setAvailability(student, 'Disponível')">Marcar como disponível</button>
                    <button v-if="availabilityOf(student) !== 'Indisponível'" type="button" @click="setAvailability(student, 'Indisponível')">Marcar como indisponível</button>
                    <button v-if="availabilityOf(student) !== 'Desistente'" type="button" @click="setAvailability(student, 'Desistente')">Marcar como desistente</button>
                  </div>
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="registered" class="stat-hint">{{ registered === 1 ? '1 participante cadastrado' : `${registered} participantes cadastrados` }}{{ state.participantsConfirmed ? ' · Lista confirmada' : '' }}</p>

    <Modal v-if="modal" :title="form.id ? 'Editar participante' : 'Cadastrar participante'" subtitle="Nome e turma são suficientes para a formação das equipes." @close="modal = false">
      <Field label="Nome completo" required><input v-model="form.name" class="input" /></Field>
      <Field label="Turma" required>
        <select v-model="form.turma" class="input">
          <option value="">Selecione a turma</option>
          <option v-for="item in TURMAS" :key="item.id" :value="item.id">{{ item.professor }}</option>
        </select>
      </Field>
      <div class="form-grid">
        <Field label="Matrícula" hint="Opcional"><input v-model="form.matricula" class="input" /></Field>
        <Field label="E-mail" hint="Opcional"><input v-model="form.email" class="input" /></Field>
        <Field label="Observação" class-name="span-2"><input v-model="form.note" class="input" /></Field>
      </div>
      <Field label="Situação">
        <select v-model="form.availability" class="input">
          <option>Disponível</option>
          <option>Indisponível</option>
          <option>Desistente</option>
        </select>
      </Field>
      <template #footer>
        <button class="btn ghost" type="button" @click="modal = false">Cancelar</button>
        <button class="btn" type="button" @click="save">{{ form.id ? 'Salvar alterações' : 'Cadastrar participante' }}</button>
      </template>
    </Modal>

    <Modal v-if="viewing" :title="viewing.name" :subtitle="availabilityOf(viewing)" @close="viewing = null">
      <p><b>Turma</b> {{ viewing.turma }}</p>
      <p><b>Situação</b> {{ availabilityOf(viewing) }}</p>
      <p><b>Equipe</b> {{ teamOf(viewing.id) ? teamName(teamOf(viewing.id).id) : 'Ainda sem equipe.' }}</p>
      <p><b>Matrícula</b> {{ viewing.matricula || '—' }}</p>
      <p><b>E-mail</b> {{ viewing.email || '—' }}</p>
      <p><b>Observação</b> {{ viewing.note || '—' }}</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="viewing = null">Fechar</button>
        <button class="btn" type="button" @click="form = { ...blank, ...viewing, availability: availabilityOf(viewing) }; viewing = null; modal = true">Editar</button>
      </template>
    </Modal>

    <Modal v-if="removing" title="Excluir participante?" :subtitle="teamOf(removing.id) ? `${removing.name} sai da ${teamName(teamOf(removing.id).id)} e o cadastro é removido deste navegador.` : 'O cadastro será removido deste navegador.'" @close="removing = null">
      <p>{{ removing.name }} · {{ removing.turma }}</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="removing = null">Cancelar</button>
        <button class="btn danger" type="button" @click="removeStudent">Excluir</button>
      </template>
    </Modal>

    <Modal v-if="askConfirm" title="Confirmar participantes?" subtitle="Confirme que a lista atual representa as pessoas que participarão da formação das equipes." @close="askConfirm = false">
      <p>{{ state.students.filter(isAvailable).length }} disponíveis para a formação. Quem estiver indisponível ou desistente continua no cadastro, mas não entra nas equipes.</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="askConfirm = false">Cancelar</button>
        <button class="btn" type="button" @click="confirmList">Confirmar participantes</button>
      </template>
    </Modal>

    <Modal v-if="askReopen" title="Reabrir participantes?" :subtitle="state.teams.length ? 'Alterações nos participantes podem afetar as equipes já formadas.' : 'A lista volta a ficar em aberto.'" @close="askReopen = false">
      <p>A alteração não reorganiza as equipes sozinha.</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="askReopen = false">Cancelar</button>
        <button class="btn" type="button" @click="reopenList">Reabrir participantes</button>
      </template>
    </Modal>
  </Page>
</template>
