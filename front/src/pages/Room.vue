<script setup>
import { computed, ref } from 'vue'
import { companyOf, isAvailable, teamChallenge, teamName, uid } from '../model'
import { useHack, go } from '../store'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'

const PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente']
const CATEGORIES = ['Tecnologia', 'Produção', 'Participante', 'Sala', 'Equipamento', 'Estrutura', 'Outro']

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const { state, update, flash } = useHack()
const modal = ref(null)
const form = ref({ title: '', category: 'Sala', description: '', priority: 'Média', equipment: '' })
const id = computed(() => Number(props.params.id || 1))
const team = computed(() => state.teams.find((item) => item.id === id.value) || state.teams[0])
const challenge = computed(() => (team.value ? teamChallenge(state, team.value.id) : null))
const company = computed(() => (challenge.value ? companyOf(state, challenge.value.companyId) : null))
const members = computed(() => (team.value ? team.value.members.map((memberId) => state.students.find((student) => student.id === memberId)).filter((student) => student && isAvailable(student)) : []))
const paused = computed(() => (team.value ? team.value.members.map((memberId) => state.students.find((student) => student.id === memberId)).filter((student) => student && !isAvailable(student)) : []))
const roomName = computed(() => (team.value ? `Sala ${String(team.value.id).padStart(2, '0')}` : ''))
const occ = computed(() => state.occurrences.filter((item) => item.place === roomName.value))
const pausedText = computed(() => `Fora da operação: ${paused.value.map((student) => `${student.name} (${student.availability || 'Indisponível'})`).join(', ')}. O cadastro permanece no histórico.`)

function presentDay2(studentId) {
  return state.checkins.some((item) => item.personId === studentId && item.day === 2 && item.status === 'Presente')
}

function save() {
  const kind = modal.value
  if (kind === 'occ' && !form.value.title.trim()) {
    flash('Informe o título da ocorrência.', 'err')
    return
  }
  const place = roomName.value
  update((draft) => {
    if (kind === 'occ') {
      draft.occurrences.unshift({ id: uid('oc'), title: form.value.title, category: form.value.category, description: form.value.description, place, priority: form.value.priority, responsible: state.session?.name, status: 'Aberta', solution: '', day: 2, at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
    } else {
      draft.equipment.push({ id: uid('eq'), name: form.value.equipment || 'Equipamento da sala', category: 'Outro', qty: 1, place, responsible: state.session?.name, status: 'Com problema', notes: form.value.description })
      draft.occurrences.unshift({ id: uid('oc'), title: `Problema em ${form.value.equipment || 'equipamento'}`, category: 'Equipamento', description: form.value.description, place, priority: form.value.priority, responsible: '', status: 'Aberta', solution: '', day: 2, at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
    }
  })
  modal.value = null
  flash(kind === 'occ' ? 'Ocorrência registrada.' : 'Problema de equipamento registrado para a Tecnologia.')
}
</script>

<template>
  <Page v-if="!team" title="Sala">
    <template #actions>
      <button class="btn ghost" type="button" @click="go('evento?dia=2')">Voltar</button>
    </template>
    <Empty title="Nenhuma equipe formada" text="A sala acompanha uma equipe já formada." />
  </Page>
  <Page v-else :crumbs="`HackLab / Evento / Modo Evento / ${roomName}`" :title="roomName" :subtitle="`${teamName(team.id)} · Dia 2 — Desenvolvimento das Soluções`">
    <template #actions>
      <button class="btn ghost" type="button" @click="go('evento?dia=2')">Voltar</button>
      <button class="btn ghost" type="button" @click="modal = 'prob'">Registrar problema</button>
      <button class="btn" type="button" @click="modal = 'occ'">Registrar ocorrência</button>
    </template>
    <div class="grid cols-3">
      <article class="card"><h3>Equipe</h3><p>{{ teamName(team.id) }}</p></article>
      <article class="card"><h3>Empresa</h3><p>{{ company?.name || '—' }}</p></article>
      <article class="card"><h3>Desafio</h3><p>{{ challenge?.title || '—' }}</p></article>
    </div>
    <h3 class="section-title">Participantes da sala</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Participante</th><th>Turma</th><th>Presença</th></tr></thead>
        <tbody>
          <tr v-if="members.length === 0"><td colspan="3">Equipe ainda sem participantes confirmados.</td></tr>
          <tr v-for="student in members" :key="student.id">
            <td>{{ student.name }}</td>
            <td>{{ student.turma }}</td>
            <td>{{ presentDay2(student.id) ? 'Presente' : 'Não registrado' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="paused.length" class="stat-hint">{{ pausedText }}</p>
    <h3 class="section-title">Ocorrências da sala</h3>
    <p v-if="occ.length === 0">Nenhuma ocorrência registrada.</p>
    <p v-for="item in occ" :key="item.id">{{ item.title }} · {{ item.priority }} · {{ item.status }}</p>
    <Modal v-if="modal" :title="modal === 'occ' ? 'Nova ocorrência' : 'Registrar problema de equipamento'" @close="modal = null">
      <Field v-if="modal === 'occ'" label="Título" required><input v-model="form.title" class="input" /></Field>
      <Field v-else label="Equipamento"><input v-model="form.equipment" class="input" /></Field>
      <Field label="Descrição"><textarea v-model="form.description" class="input" /></Field>
      <Field label="Prioridade">
        <div class="chips">
          <button v-for="item in PRIORITIES" :key="item" type="button" class="chip" :class="{ on: form.priority === item }" @click="form.priority = item">{{ item }}</button>
        </div>
      </Field>
      <Field v-if="modal === 'occ'" label="Categoria">
        <select v-model="form.category" class="input">
          <option v-for="item in CATEGORIES" :key="item">{{ item }}</option>
        </select>
      </Field>
      <p v-else class="stat-hint">O problema fica relacionado ao setor Tecnologia, sem automação de pendência.</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="modal = null">Cancelar</button>
        <button class="btn" type="button" @click="save">{{ modal === 'occ' ? 'Registrar ocorrência' : 'Registrar problema' }}</button>
      </template>
    </Modal>
  </Page>
</template>
