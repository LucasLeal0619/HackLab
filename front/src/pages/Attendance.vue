<script setup>
import { computed, ref } from 'vue'
import { TICKET_STATUS, presenceOf, teamName, ticketCode, ticketStatus, uid } from '../model'
import { go, useHack } from '../store'
import Badge from '../components/Badge.vue'
import Drawer from '../components/Drawer.vue'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'
import Tabs from '../components/Tabs.vue'

const DAY_TABS = [{ id: '1', label: 'Dia 1' }, { id: '2', label: 'Dia 2' }, { id: '3', label: 'Dia 3' }]
const MANUAL_REASONS = ['QR Code indisponível', 'Problema de conexão', 'Ingresso não localizado', 'Outro']

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const { state, update, flash } = useHack()
const day = computed(() => ([1, 2, 3].includes(Number(props.params.dia)) ? Number(props.params.dia) : 1))
const query = ref('')
const scan = ref(null)
const scanCode = ref('')
const manual = ref(null)
const ticketId = ref(null)

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function teamOf(studentId) {
  return state.teams.find((team) => (team.members || []).includes(studentId))
}

function teamLabel(studentId) {
  const team = teamOf(studentId)
  return team ? teamName(team.id) : 'Sem equipe'
}

const rows = computed(() => {
  const term = query.value.trim().toLowerCase()
  return state.students
    .map((student) => ({ student, code: ticketCode(student), ticket: ticketStatus(student), record: presenceOf(state, student.id, day.value) }))
    .filter((row) => !term || `${row.student.name} ${row.student.turma} ${row.code}`.toLowerCase().includes(term))
})
const dayRecords = computed(() => state.students.map((student) => presenceOf(state, student.id, day.value)).filter(Boolean))
const summary = computed(() => ({
  present: dayRecords.value.length,
  missing: state.students.length - dayRecords.value.length,
  manual: dayRecords.value.filter((item) => item.method === 'Manual').length,
  qr: dayRecords.value.filter((item) => item.method === 'QR Code').length,
}))
const ticketStudent = computed(() => state.students.find((item) => item.id === ticketId.value))

function setDay(value) {
  go(`presenca?dia=${value}`)
}

function register(student, method, extra = {}) {
  const currentDay = day.value
  update((draft) => {
    draft.checkins.push({
      id: uid('ck'),
      personId: student.id,
      personName: student.name,
      category: 'Participante',
      turma: student.turma,
      day: currentDay,
      method,
      time: now(),
      responsible: state.session?.name,
      status: 'Presente',
      note: '',
      ...extra,
    })
  })
}

// Leitura demonstrativa: QR Code → ingresso → participante → status → presença do dia.
function check(student) {
  if (!student) return { kind: 'missing' }
  const status = ticketStatus(student)
  if (status !== 'Ativo') return { kind: 'blocked', student, status }
  if (presenceOf(state, student.id, day.value)) return { kind: 'already', student }
  return { kind: 'valid', student }
}

function openScan() {
  scan.value = { kind: 'idle' }
  scanCode.value = ''
}

function simulateRead() {
  const code = scanCode.value.trim().toUpperCase()
  if (code) {
    scan.value = check(state.students.find((student) => ticketCode(student) === code))
    return
  }
  const next = state.students.find((student) => ticketStatus(student) === 'Ativo' && !presenceOf(state, student.id, day.value))
  scan.value = next ? check(next) : { kind: 'none' }
}

function confirmScan() {
  const student = scan.value?.student
  if (!student) return
  if (presenceOf(state, student.id, day.value)) {
    scan.value = { kind: 'already', student }
    return
  }
  register(student, 'QR Code', { note: 'Leitura demonstrativa' })
  flash(`Presença registrada no Dia ${day.value}.`)
  scan.value = null
}

function openManual(student = null) {
  manual.value = { personId: student?.id || '', day: day.value, time: now(), reason: MANUAL_REASONS[0], note: '' }
}

function saveManual() {
  const form = manual.value
  const student = state.students.find((item) => item.id === form.personId)
  if (!student) {
    flash('Selecione um participante.', 'err')
    return
  }
  if (ticketStatus(student) !== 'Ativo') {
    flash(`Ingresso ${ticketStatus(student).toLowerCase()}: presença não registrada.`, 'err')
    return
  }
  if (presenceOf(state, student.id, form.day)) {
    flash(`Presença já registrada para este participante no Dia ${form.day}.`, 'err')
    return
  }
  const targetDay = Number(form.day)
  update((draft) => {
    draft.checkins.push({
      id: uid('ck'),
      personId: student.id,
      personName: student.name,
      category: 'Participante',
      turma: student.turma,
      day: targetDay,
      method: 'Manual',
      time: form.time,
      responsible: state.session?.name,
      status: 'Presente',
      note: [form.reason, form.note].filter(Boolean).join('. '),
    })
  })
  manual.value = null
  flash(`Presença registrada manualmente no Dia ${targetDay}.`)
  if (targetDay !== day.value) setDay(targetDay)
}

function setTicketStatus(value) {
  const id = ticketId.value
  update((draft) => {
    const current = draft.students.find((item) => item.id === id)
    if (current) current.ticketStatus = value
  })
  flash(`Ingresso ${value.toLowerCase()}.`)
}
</script>

<template>
  <Page title="Ingressos e Presença" subtitle="Gerencie os ingressos e registre a presença dos participantes durante os dias do Hackathon.">
    <template #actions>
      <button class="btn ghost" type="button" @click="openManual()">Registrar presença manualmente</button>
      <button class="btn" type="button" @click="openScan">Validar QR Code</button>
    </template>

    <div class="attendance-bar">
      <Tabs :tabs="DAY_TABS" :model-value="String(day)" @update:model-value="setDay" />
      <input v-model="query" class="input attendance-search" placeholder="Buscar participante ou ingresso" aria-label="Buscar participante ou ingresso" />
    </div>
    <p class="attendance-summary" aria-live="polite">
      <b>Dia {{ day }}</b>
      <span>Presentes <b>{{ summary.present }}</b></span>
      <span>Não registrados <b>{{ summary.missing }}</b></span>
      <span>QR Code <b>{{ summary.qr }}</b></span>
      <span>Registros manuais <b>{{ summary.manual }}</b></span>
    </p>

    <div class="table-wrap">
      <table class="attendance-table">
        <thead><tr><th>Participante</th><th>Turma</th><th>Equipe</th><th>Ingresso</th><th>Presença</th><th>Método</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="7"><Empty :title="state.students.length ? 'Nenhum participante encontrado.' : 'Nenhum participante cadastrado.'" :text="state.students.length ? 'Revise a busca.' : 'Os ingressos são gerados a partir do cadastro em Preparação → Participantes.'" /></td>
          </tr>
          <tr v-for="row in rows" :key="row.student.id">
            <td>{{ row.student.name }}</td>
            <td>{{ row.student.turma || '—' }}</td>
            <td>{{ teamLabel(row.student.id) }}</td>
            <td><span class="ticket-code">{{ row.code }}</span> <Badge v-if="row.ticket !== 'Ativo'" :tone="row.ticket === 'Cancelado' ? 'danger' : 'warn'">{{ row.ticket }}</Badge></td>
            <td><Badge :tone="row.record ? 'ok' : ''">{{ row.record ? `Presente · ${row.record.time || '—'}` : 'Não registrado' }}</Badge></td>
            <td>{{ row.record?.method || '—' }}</td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="ticketId = row.student.id">Ver ingresso</button>
                <button v-if="!row.record && row.ticket === 'Ativo'" class="btn ghost small" type="button" @click="openManual(row.student)">Registrar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal v-if="scan" title="Validar ingresso" :subtitle="`Registro de presença do Dia ${day}. Leitura demonstrativa, sem câmera real.`" @close="scan = null">
      <div class="scan-area">
        <div class="qr" aria-hidden="true" />
        <p>Área demonstrativa de leitura do QR Code.</p>
        <Field label="Código do ingresso (opcional)" hint="Sem código, a leitura simula o próximo ingresso ativo sem presença no dia.">
          <input v-model="scanCode" class="input" placeholder="HL-00001" @keydown.enter="simulateRead" />
        </Field>
        <button class="btn" type="button" @click="simulateRead">Simular leitura</button>
      </div>
      <div v-if="scan.kind === 'valid'" class="banner ok scan-result">
        <div>
          <b>Ingresso válido</b>
          <dl class="scan-facts">
            <dt>Participante</dt><dd>{{ scan.student.name }}</dd>
            <dt>Ingresso</dt><dd>{{ ticketCode(scan.student) }}</dd>
            <dt>Turma</dt><dd>{{ scan.student.turma || '—' }}</dd>
            <dt>Equipe</dt><dd>{{ teamLabel(scan.student.id) }}</dd>
            <dt>Dia</dt><dd>Dia {{ day }}</dd>
          </dl>
        </div>
      </div>
      <div v-else-if="scan.kind === 'already'" class="banner warn scan-result">
        <div><b>Presença já registrada</b><p>Presença já registrada para {{ scan.student.name }} ({{ ticketCode(scan.student) }}) no Dia {{ day }}.</p></div>
      </div>
      <div v-else-if="scan.kind === 'blocked'" class="banner warn scan-result">
        <div><b>Ingresso indisponível</b><p>O ingresso {{ ticketCode(scan.student) }} de {{ scan.student.name }} está {{ scan.status.toLowerCase() }}. A presença não pode ser registrada.</p></div>
      </div>
      <div v-else-if="scan.kind === 'missing'" class="banner warn scan-result">
        <div><b>Ingresso não encontrado</b><p>Nenhum participante possui o ingresso {{ scanCode.trim().toUpperCase() }}.</p></div>
      </div>
      <div v-else-if="scan.kind === 'none'" class="banner scan-result">
        <div><b>Nenhum ingresso pendente</b><p>Todos os ingressos ativos já têm presença registrada no Dia {{ day }}.</p></div>
      </div>
      <template #footer>
        <button class="btn ghost" type="button" @click="scan = null">Fechar</button>
        <button v-if="scan.kind === 'valid'" class="btn" type="button" @click="confirmScan">Registrar presença</button>
      </template>
    </Modal>

    <Modal v-if="manual" title="Registrar presença manualmente" subtitle="Use quando a leitura do QR Code não for possível." @close="manual = null">
      <Field label="Participante" required>
        <select v-model="manual.personId" class="input">
          <option value="">Selecione o participante</option>
          <option v-for="student in state.students" :key="student.id" :value="student.id" :disabled="ticketStatus(student) !== 'Ativo'">{{ student.name }} · {{ ticketCode(student) }}{{ ticketStatus(student) !== 'Ativo' ? ` · ingresso ${ticketStatus(student).toLowerCase()}` : '' }}</option>
        </select>
      </Field>
      <div class="form-grid">
        <Field label="Dia">
          <select v-model.number="manual.day" class="input">
            <option v-for="item in [1, 2, 3]" :key="item" :value="item">Dia {{ item }}</option>
          </select>
        </Field>
        <Field label="Horário"><input v-model="manual.time" class="input" type="time" /></Field>
      </div>
      <Field label="Motivo">
        <select v-model="manual.reason" class="input">
          <option v-for="item in MANUAL_REASONS" :key="item">{{ item }}</option>
        </select>
      </Field>
      <Field label="Observação (opcional)"><input v-model="manual.note" class="input" /></Field>
      <template #footer>
        <button class="btn ghost" type="button" @click="manual = null">Cancelar</button>
        <button class="btn" type="button" @click="saveManual">Registrar presença</button>
      </template>
    </Modal>

    <Drawer v-if="ticketStudent" title="Ingresso" :subtitle="`${ticketStudent.name} · válido nos três dias`" @close="ticketId = null">
      <div class="ticket">
        <div class="ticket-top"><b>HackLab</b><p>Ingresso de Participação</p></div>
        <div class="ticket-body">
          <p><b>{{ ticketStudent.name }}</b></p>
          <p>Turma {{ ticketStudent.turma || '—' }} · {{ teamLabel(ticketStudent.id) }}</p>
          <div class="qr" aria-hidden="true" />
          <p class="ticket-code">{{ ticketCode(ticketStudent) }}</p>
          <p class="stat-hint">QR Code demonstrativo. Um único ingresso vale para o Dia 1, o Dia 2 e o Dia 3.</p>
        </div>
      </div>
      <div class="field">
        <span>Status do ingresso</span>
        <div class="chips">
          <button v-for="item in TICKET_STATUS" :key="item" type="button" class="chip" :class="{ on: ticketStatus(ticketStudent) === item }" @click="setTicketStatus(item)">{{ item }}</button>
        </div>
      </div>
      <h3 class="ops-title">Presença</h3>
      <dl class="ticket-days">
        <template v-for="item in [1, 2, 3]" :key="item">
          <dt>Dia {{ item }}</dt>
          <dd>
            <Badge :tone="presenceOf(state, ticketStudent.id, item) ? 'ok' : ''">{{ presenceOf(state, ticketStudent.id, item) ? 'Presente' : 'Não registrado' }}</Badge>
            <span v-if="presenceOf(state, ticketStudent.id, item)" class="stat-hint">{{ presenceOf(state, ticketStudent.id, item).method }} · {{ presenceOf(state, ticketStudent.id, item).time || '—' }}</span>
          </dd>
        </template>
      </dl>
      <template #footer>
        <button class="btn ghost" type="button" @click="ticketId = null">Fechar</button>
      </template>
    </Drawer>
  </Page>
</template>
