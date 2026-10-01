<script setup>
import { ref } from 'vue'
import { uid } from '../model'
import { useHack, go } from '../store'
import Badge from '../components/Badge.vue'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'
import { toneFor } from '../components/tone.js'

const LABELS = ['Aberta', 'Em atendimento', 'Resolvida', 'Urgente']
const CATEGORIES = ['Tecnologia', 'Produção', 'Participante', 'Sala', 'Equipamento', 'Estrutura', 'Outro']
const PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente']

const { state, update, flash } = useHack()
const modal = ref(false)
const form = ref({ title: '', category: 'Sala', description: '', place: 'Sala 01', priority: 'Média', status: 'Aberta' })
const solve = ref(null)
const solution = ref('')

function statCount(label) {
  const list = label === 'Urgente'
    ? state.occurrences.filter((item) => item.priority === 'Urgente' && item.status !== 'Resolvida')
    : state.occurrences.filter((item) => item.status === label)
  return list.length || '—'
}

function save() {
  if (!form.value.title.trim()) return flash('Informe o título.', 'err')
  update((draft) => {
    draft.occurrences.unshift({ id: uid('oc'), ...form.value, responsible: state.session?.name, solution: '', day: 2, at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
  })
  modal.value = false
  flash('Ocorrência adicionada à lista.')
}

function markSolved() {
  const id = solve.value.id
  const text = solution.value
  update((draft) => {
    const current = draft.occurrences.find((item) => item.id === id)
    current.status = 'Resolvida'
    current.solution = text
  })
  solve.value = null
  flash('Ocorrência marcada como resolvida.')
}
</script>

<template>
  <Page crumbs="HackLab / Evento / Modo Evento / Ocorrências" title="Ocorrências do Evento" subtitle="Registre e acompanhe situações que precisam de atenção durante o Hackathon.">
    <template #actions>
      <button class="btn ghost" type="button" @click="go('evento?dia=2')">Voltar</button>
      <button class="btn" type="button" @click="modal = true">Nova ocorrência</button>
    </template>
    <p class="stat-hint">Equipamentos e tecnologia → setor Tecnologia · Sala, estrutura e materiais → setor Produção.</p>
    <div class="grid cols-4">
      <article v-for="label in LABELS" :key="label" class="card">
        <h3>{{ label }}</h3>
        <div class="stat-value">{{ statCount(label) }}</div>
      </article>
    </div>
    <div class="table-wrap mt">
      <table>
        <thead><tr><th>Ocorrência</th><th>Categoria</th><th>Local</th><th>Prioridade</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-if="state.occurrences.length === 0"><td colspan="6"><Empty title="Nenhuma ocorrência registrada." text="As ocorrências abertas durante o evento aparecerão aqui." /></td></tr>
          <tr v-for="item in state.occurrences" :key="item.id">
            <td>{{ item.title }}<br /><small>{{ item.description }}</small></td>
            <td>{{ item.category }}</td>
            <td>{{ item.place }}</td>
            <td><Badge :tone="toneFor(item.priority)">{{ item.priority }}</Badge></td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
            <td>
              <button v-if="item.status !== 'Resolvida'" class="btn ghost small" type="button" @click="solve = item">Resolver</button>
              <template v-else>{{ item.solution }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Modal v-if="modal" title="Nova ocorrência" @close="modal = false">
      <Field label="Título" required><input v-model="form.title" class="input" /></Field>
      <Field label="Categoria">
        <select v-model="form.category" class="input">
          <option v-for="item in CATEGORIES" :key="item">{{ item }}</option>
        </select>
      </Field>
      <Field label="Local"><input v-model="form.place" class="input" /></Field>
      <Field label="Descrição"><textarea v-model="form.description" class="input" /></Field>
      <Field label="Prioridade">
        <div class="chips">
          <button v-for="item in PRIORITIES" :key="item" type="button" class="chip" :class="{ on: form.priority === item }" @click="form.priority = item">{{ item }}</button>
        </div>
      </Field>
      <template #footer>
        <button class="btn ghost" type="button" @click="modal = false">Cancelar</button>
        <button class="btn" type="button" @click="save">Registrar ocorrência</button>
      </template>
    </Modal>
    <Modal v-if="solve" title="Registrar solução" @close="solve = null">
      <Field label="Solução adotada"><textarea v-model="solution" class="input" /></Field>
      <template #footer>
        <button class="btn ghost" type="button" @click="solve = null">Cancelar</button>
        <button class="btn" type="button" @click="markSolved">Marcar como resolvida</button>
      </template>
    </Modal>
  </Page>
</template>
