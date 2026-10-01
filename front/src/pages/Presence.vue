<script setup>
import { computed, ref } from 'vue'
import { isAvailable, uid } from '../model'
import { useHack, go } from '../store'
import Badge from '../components/Badge.vue'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'
import Tabs from '../components/Tabs.vue'
import { toneFor } from '../components/tone.js'

const DAY_TABS = [{ id: '1', label: 'Dia 1' }, { id: '2', label: 'Dia 2' }, { id: '3', label: 'Dia 3' }]
const REASONS = ['QR Code indisponível', 'Problema de conexão', 'Ingresso não localizado', 'Outro']

const { state, update, flash } = useHack()
const day = ref(1)
const modal = ref(false)
const form = ref({ personId: '', time: '08:10', reason: 'QR Code indisponível', note: '' })
const rows = computed(() => state.checkins.filter((item) => item.day === day.value))
const present = computed(() => rows.value.filter((item) => item.status === 'Presente').length)
const available = computed(() => state.students.filter(isAvailable))

function save() {
  const student = state.students.find((item) => item.id === form.value.personId)
  if (!student) {
    flash('Selecione um participante.', 'err')
    return
  }
  const currentDay = day.value
  update((draft) => {
    draft.checkins.push({
      id: uid('ck'), personId: student.id, personName: student.name, category: 'Participante', turma: student.turma,
      day: currentDay, method: 'Manual', time: form.value.time, responsible: state.session?.name, status: 'Presente', note: `${form.value.reason}. ${form.value.note}`,
    })
  })
  modal.value = false
  flash('Presença registrada manualmente.')
}
</script>

<template>
  <Page crumbs="HackLab / Evento / Modo Evento / Presença" title="Controle de Presença" subtitle="Acompanhe a presença dos participantes nos três dias do evento. Presença no evento é diferente da presença em reuniões.">
    <template #actions>
      <button class="btn ghost" type="button" @click="go('evento?dia=1')">Voltar</button>
      <button class="btn ghost" type="button" @click="go('validar')">Validar ingresso</button>
      <button class="btn" type="button" @click="modal = true">Registrar presença manualmente</button>
    </template>
    <Tabs :tabs="DAY_TABS" :model-value="String(day)" @update:model-value="(value) => day = Number(value)" />
    <div class="grid cols-4">
      <article class="card"><h3>Inscritos</h3><div class="stat-value">{{ state.students.length || '—' }}</div></article>
      <article class="card"><h3>Presentes</h3><div class="stat-value">{{ present || '—' }}</div></article>
      <article class="card"><h3>QR Code</h3><div class="stat-value">{{ rows.filter((item) => item.method === 'QR Code').length || '—' }}</div></article>
      <article class="card"><h3>Manuais</h3><div class="stat-value">{{ rows.filter((item) => item.method === 'Manual').length || '—' }}</div></article>
    </div>
    <div class="table-wrap mt">
      <table>
        <thead><tr><th>Participante</th><th>Categoria</th><th>Dia</th><th>Entrada</th><th>Método</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-if="rows.length === 0"><td colspan="6"><Empty title="Nenhuma presença registrada." text="Os check-ins por QR Code e os registros manuais aparecerão aqui." /></td></tr>
          <tr v-for="item in rows" :key="item.id">
            <td>{{ item.personName }}</td>
            <td>{{ item.category }}</td>
            <td>Dia {{ item.day }}</td>
            <td>{{ item.time }}</td>
            <td>{{ item.method }}</td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
          </tr>
        </tbody>
      </table>
    </div>
    <Modal v-if="modal" title="Registrar presença manualmente" subtitle="Dentro do horário oficial 08:00 às 12:00." @close="modal = false">
      <Field label="Participante">
        <select v-model="form.personId" class="input">
          <option value="">Nome do participante</option>
          <option v-for="student in available" :key="student.id" :value="student.id">{{ student.name }} · {{ student.turma }}</option>
        </select>
      </Field>
      <Field label="Horário de entrada"><input v-model="form.time" class="input" type="time" /></Field>
      <Field label="Motivo do registro manual">
        <select v-model="form.reason" class="input">
          <option v-for="item in REASONS" :key="item">{{ item }}</option>
        </select>
      </Field>
      <Field label="Observação"><input v-model="form.note" class="input" /></Field>
      <template #footer>
        <button class="btn ghost" type="button" @click="modal = false">Cancelar</button>
        <button class="btn" type="button" @click="save">Registrar presença</button>
      </template>
    </Modal>
  </Page>
</template>
