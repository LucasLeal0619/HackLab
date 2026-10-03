<script setup>
import { computed, ref } from 'vue'
import { isSuperAdmin } from '../access'
import {
  CREDENTIAL_CATEGORIES, CREDENTIAL_STATUS, EVENT_DAYS, checkCredential, credentialOf, credentialPeople,
  findCredential, personOf, presenceOf, suggestedDays, uid,
} from '../model'
import { go, useHack } from '../store'
import Badge from '../components/Badge.vue'
import Drawer from '../components/Drawer.vue'
import Empty from '../components/Empty.vue'
import FilterPanel from '../components/FilterPanel.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'
import Tabs from '../components/Tabs.vue'

const DAY_TABS = EVENT_DAYS.map((day) => ({ id: String(day), label: `Dia ${day}` }))
const MANUAL_REASONS = ['QR ilegível', 'Credencial não disponível', 'Problema técnico', 'Outro']
const STATUS_TONE = { Ativa: 'ok', Bloqueada: 'warn', Cancelada: 'danger' }

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const { state, update, flash } = useHack()
// Só o SuperAdmin gerencia credenciais; Validador e Consultor operam validação e presença.
const manage = computed(() => isSuperAdmin(state.session))
const validator = computed(() => state.session?.profile === 'Validador')
const day = computed(() => (EVENT_DAYS.includes(Number(props.params.dia)) ? Number(props.params.dia) : 1))
const tab = computed(() => (props.params.aba === 'credenciais' && !validator.value ? 'credenciais' : 'presenca'))
const sectionTabs = computed(() => [{ id: 'presenca', label: 'Presença' }, ...(validator.value ? [] : [{ id: 'credenciais', label: 'Credenciais' }])])

const query = ref('')
const category = ref('')
const status = ref('')
const authorized = ref('')
const scan = ref(null)
const scanCode = ref('')
const manual = ref(null)
const detailId = ref(null)
const form = ref(null)

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function link(next) {
  const merged = { dia: day.value, aba: tab.value, ...next }
  go(`presenca?dia=${merged.dia}&aba=${merged.aba}`)
}

function daysLabel(days) {
  const list = [...(days || [])].sort()
  if (list.length === EVENT_DAYS.length) return 'Dias 1, 2 e 3'
  if (!list.length) return 'Nenhum dia'
  return list.length === 1 ? `Dia ${list[0]}` : `Dias ${list.join(' e ')}`
}

const rows = computed(() => (state.credentials || []).map((credential) => {
  const person = personOf(state, credential.personId)
  return { credential, person, name: person?.name || 'Pessoa removida', record: presenceOf(state, credential.personId, day.value) }
}))

function matches(row) {
  const term = query.value.trim().toLowerCase()
  if (term && !`${row.name} ${row.credential.code}`.toLowerCase().includes(term)) return false
  return !category.value || row.credential.category === category.value
}

const credentialRows = computed(() => rows.value
  .filter(matches)
  .filter((row) => !status.value || row.credential.status === status.value)
  .filter((row) => !authorized.value || row.credential.days.includes(Number(authorized.value))))
// Presença do dia: credenciais autorizadas para o dia selecionado.
const dayRows = computed(() => rows.value.filter((row) => row.credential.days.includes(day.value)))
const presenceRows = computed(() => dayRows.value.filter(matches))
const summary = computed(() => {
  const expected = dayRows.value.filter((row) => row.credential.status === 'Ativa' && (!category.value || row.credential.category === category.value))
  const present = dayRows.value.filter((row) => row.record && (!category.value || row.credential.category === category.value))
  return {
    present: present.length,
    missing: expected.filter((row) => !row.record).length,
    manual: present.filter((row) => row.record.method === 'Manual').length,
    qr: present.filter((row) => row.record.method === 'QR Code').length,
  }
})
const detail = computed(() => rows.value.find((row) => row.credential.id === detailId.value) || null)

// Validação demonstrativa: QR → credencial → status → dia autorizado → duplicidade → presença.
function openScan() {
  scan.value = { kind: 'idle' }
  scanCode.value = ''
}

function simulateRead() {
  const code = scanCode.value.trim()
  if (code) {
    scan.value = checkCredential(state, findCredential(state, code), day.value)
    return
  }
  const next = rows.value.find((row) => checkCredential(state, row.credential, day.value).kind === 'valid')
  scan.value = next ? checkCredential(state, next.credential, day.value) : { kind: 'none' }
}

function register(credential, method, extra = {}) {
  const person = personOf(state, credential.personId)
  const targetDay = extra.day || day.value
  update((draft) => {
    draft.checkins.push({
      id: uid('ck'),
      personId: credential.personId,
      credentialId: credential.id,
      personName: person?.name || '',
      category: credential.category,
      day: targetDay,
      method,
      time: extra.time || now(),
      responsible: state.session?.name,
      status: 'Presente',
      note: extra.note || '',
    })
  })
}

function confirmScan() {
  const credential = scan.value?.credential
  const result = checkCredential(state, credential, day.value)
  if (result.kind !== 'valid') {
    scan.value = result
    return
  }
  register(credential, 'QR Code', { note: 'Leitura demonstrativa' })
  flash(`Presença registrada no Dia ${day.value}.`)
  scan.value = null
}

function searchInstead() {
  scan.value = null
  query.value = scanCode.value.trim()
  link({ aba: 'presenca' })
}

function openManual(credential = null) {
  manual.value = { credentialId: credential?.id || '', day: day.value, time: now(), reason: MANUAL_REASONS[0], note: '', error: '' }
}

function saveManual() {
  const current = manual.value
  const credential = (state.credentials || []).find((item) => item.id === current.credentialId)
  if (!credential) {
    current.error = 'Selecione a pessoa ou credencial.'
    return
  }
  const result = checkCredential(state, credential, current.day)
  const messages = {
    blocked: 'Esta credencial está bloqueada.',
    cancelled: 'Esta credencial foi cancelada.',
    day: `Esta credencial não possui acesso ao Dia ${current.day}.`,
    already: `Presença já registrada no Dia ${current.day}.`,
  }
  if (result.kind !== 'valid') {
    current.error = messages[result.kind]
    return
  }
  register(credential, 'Manual', { day: Number(current.day), time: current.time, note: [current.reason, current.note].filter(Boolean).join('. ') })
  flash(`Presença registrada manualmente no Dia ${current.day}.`)
  manual.value = null
  if (Number(current.day) !== day.value) link({ dia: current.day })
}

// Nova credencial: associa uma pessoa já existente ou cadastra pessoa externa sem conta.
const availablePeople = computed(() => credentialPeople(state).filter((person) => !credentialOf(state, person.id)))

function openNew() {
  form.value = { mode: 'existente', personId: '', name: '', email: '', category: 'Convidado', days: suggestedDays('Convidado'), status: 'Ativa', note: '', error: '' }
}

function openEdit(credential) {
  form.value = { id: credential.id, mode: 'edicao', personId: credential.personId, category: credential.category, days: [...credential.days], status: credential.status, note: credential.note || '', error: '' }
  detailId.value = null
}

function pickPerson(id) {
  const person = availablePeople.value.find((item) => item.id === id)
  form.value.personId = id
  if (person) {
    form.value.category = person.category
    form.value.days = suggestedDays(person.category)
  }
}

function setCategory(value) {
  form.value.category = value
  if (!form.value.id) form.value.days = suggestedDays(value)
}

function toggleDay(value) {
  const days = form.value.days
  form.value.days = days.includes(value) ? days.filter((item) => item !== value) : [...days, value].sort()
}

function saveCredential() {
  const current = form.value
  if (current.mode === 'existente' && !current.personId) return (current.error = 'Selecione a pessoa.')
  if (current.mode === 'externa' && !current.name.trim()) return (current.error = 'Informe o nome da pessoa.')
  if (!current.days.length) return (current.error = 'Autorize pelo menos um dia.')
  const fields = { category: current.category, days: [...current.days].sort(), status: current.status, note: current.note }
  update((draft) => {
    if (current.id) {
      Object.assign(draft.credentials.find((item) => item.id === current.id), fields)
      return
    }
    let personId = current.personId
    if (current.mode === 'externa') {
      personId = uid('gst')
      draft.guests.push({ id: personId, name: current.name.trim(), email: current.email.trim(), category: current.category })
    }
    const top = draft.credentials.reduce((max, item) => Math.max(max, Number(String(item.code).replace(/\D/g, '')) || 0), 0)
    draft.credentials.push({ id: uid('cred'), code: `HL-${String(top + 1).padStart(6, '0')}`, personId, ...fields, createdAt: new Date().toLocaleDateString('pt-BR') })
  })
  flash(current.id ? 'Credencial atualizada.' : 'Credencial criada.')
  form.value = null
}

function setStatus(credential, value) {
  update((draft) => { draft.credentials.find((item) => item.id === credential.id).status = value })
  flash(`Credencial ${value.toLowerCase()}.`)
}
</script>

<template>
  <Page title="Credenciais e Presença" subtitle="Gerencie as credenciais e registre a presença das pessoas durante o Hackathon.">
    <template #actions>
      <button class="btn ghost" type="button" @click="openManual()">Registrar manualmente</button>
      <button class="btn" type="button" @click="openScan">Validar QR Code</button>
    </template>

    <Tabs v-if="sectionTabs.length > 1" class="attendance-sections" :tabs="sectionTabs" :model-value="tab" @update:model-value="(value) => link({ aba: value })" />

    <div class="attendance-bar">
      <Tabs v-if="tab === 'presenca'" :tabs="DAY_TABS" :model-value="String(day)" @update:model-value="(value) => link({ dia: value })" />
      <FilterPanel class="attendance-filters" :active="[category, tab === 'credenciais' ? status : '', tab === 'credenciais' ? authorized : ''].filter(Boolean).length" @clear="category = ''; status = ''; authorized = ''">
      <template #search><input v-model="query" class="input attendance-search" placeholder="Buscar por nome ou código da credencial" aria-label="Buscar por nome ou código da credencial" /></template>
      <select v-model="category" class="input attendance-filter" aria-label="Categoria">
        <option value="">Todas as categorias</option>
        <option v-for="item in CREDENTIAL_CATEGORIES" :key="item">{{ item }}</option>
      </select>
      <template v-if="tab === 'credenciais'">
        <select v-model="status" class="input attendance-filter" aria-label="Status">
          <option value="">Todos os status</option>
          <option v-for="item in CREDENTIAL_STATUS" :key="item">{{ item }}</option>
        </select>
        <select v-model="authorized" class="input attendance-filter" aria-label="Dia autorizado">
          <option value="">Qualquer dia</option>
          <option v-for="item in EVENT_DAYS" :key="item" :value="String(item)">Autorizado no Dia {{ item }}</option>
        </select>
      </template>
      </FilterPanel>
      <button v-if="manage && tab === 'credenciais'" class="btn" type="button" @click="openNew">+ Nova credencial</button>
    </div>

    <template v-if="!(state.credentials || []).length">
      <Empty v-if="manage" title="Nenhuma credencial cadastrada." text="Crie ou associe uma credencial para começar o controle de acesso." />
      <Empty v-else title="Nenhuma credencial disponível para validação." />
      <button v-if="manage" class="btn" type="button" @click="openNew">+ Nova credencial</button>
    </template>

    <template v-else-if="tab === 'presenca'">
      <p class="attendance-summary" aria-live="polite">
        <b>Dia {{ day }}</b>
        <span>Presentes <b>{{ summary.present }}</b></span>
        <span>Não registrados <b>{{ summary.missing }}</b></span>
        <span>QR Code <b>{{ summary.qr }}</b></span>
        <span>Manuais <b>{{ summary.manual }}</b></span>
      </p>
      <div class="table-wrap attendance-table-wrap">
        <table class="attendance-table">
          <thead><tr><th>Pessoa</th><th>Categoria</th><th>Credencial</th><th>Presença</th><th>Método</th><th>Horário</th><th>Ações</th></tr></thead>
          <tbody>
            <tr v-if="presenceRows.length === 0"><td colspan="7"><Empty :title="`Nenhuma credencial autorizada para o Dia ${day}${query || category ? ' com estes filtros' : ''}.`" /></td></tr>
            <tr v-for="row in presenceRows" :key="row.credential.id">
              <td>{{ row.name }}</td>
              <td>{{ row.credential.category }}</td>
              <td><span class="ticket-code">{{ row.credential.code }}</span> <Badge v-if="row.credential.status !== 'Ativa'" :tone="STATUS_TONE[row.credential.status]">{{ row.credential.status }}</Badge></td>
              <td><Badge :tone="row.record ? 'ok' : ''">{{ row.record ? 'Presente' : 'Não registrado' }}</Badge></td>
              <td>{{ row.record?.method || '—' }}</td>
              <td>{{ row.record?.time || '—' }}</td>
              <td>
                <div class="row-actions">
                  <button class="btn ghost small" type="button" @click="detailId = row.credential.id">Ver credencial</button>
                  <button v-if="!row.record && row.credential.status === 'Ativa'" class="btn ghost small" type="button" @click="openManual(row.credential)">Registrar</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul class="attendance-cards">
        <li v-if="presenceRows.length === 0" class="card">Nenhuma credencial autorizada para o Dia {{ day }}.</li>
        <li v-for="row in presenceRows" :key="row.credential.id" class="card attendance-card">
          <div class="attendance-card-head">
            <b>{{ row.name }}</b>
            <Badge :tone="row.record ? 'ok' : ''">{{ row.record ? '✓ Presente' : 'Não registrado' }}</Badge>
          </div>
          <p>{{ row.credential.category }} · <span class="ticket-code">{{ row.credential.code }}</span><template v-if="row.credential.status !== 'Ativa'"> · {{ row.credential.status }}</template></p>
          <p v-if="row.record">{{ row.record.time }} · {{ row.record.method }}</p>
          <div class="attendance-card-actions">
            <button class="btn ghost" type="button" @click="detailId = row.credential.id">Ver credencial</button>
            <button v-if="!row.record && row.credential.status === 'Ativa'" class="btn ghost" type="button" @click="openManual(row.credential)">Registrar</button>
          </div>
        </li>
      </ul>
    </template>

    <template v-else>
      <div class="table-wrap attendance-table-wrap">
        <table class="attendance-table">
          <thead><tr><th>Pessoa</th><th>Categoria</th><th>Credencial</th><th>Dias</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            <tr v-if="credentialRows.length === 0"><td colspan="6"><Empty title="Nenhuma credencial para estes filtros." /></td></tr>
            <tr v-for="row in credentialRows" :key="row.credential.id">
              <td>{{ row.name }}<br /><small class="stat-hint">{{ row.person?.kind || '—' }}</small></td>
              <td>{{ row.credential.category }}</td>
              <td><span class="ticket-code">{{ row.credential.code }}</span></td>
              <td>{{ daysLabel(row.credential.days) }}</td>
              <td><Badge :tone="STATUS_TONE[row.credential.status]">{{ row.credential.status }}</Badge></td>
              <td>
                <div class="row-actions">
                  <button class="btn ghost small" type="button" @click="detailId = row.credential.id">Ver</button>
                  <button v-if="manage" class="btn ghost small" type="button" @click="openEdit(row.credential)">Editar</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul class="attendance-cards">
        <li v-for="row in credentialRows" :key="row.credential.id" class="card attendance-card">
          <div class="attendance-card-head">
            <b>{{ row.name }}</b>
            <Badge :tone="STATUS_TONE[row.credential.status]">{{ row.credential.status }}</Badge>
          </div>
          <p>{{ row.credential.category }} · <span class="ticket-code">{{ row.credential.code }}</span></p>
          <p>{{ daysLabel(row.credential.days) }}</p>
          <div class="attendance-card-actions">
            <button class="btn ghost" type="button" @click="detailId = row.credential.id">Ver credencial</button>
            <button v-if="manage" class="btn ghost" type="button" @click="openEdit(row.credential)">Editar</button>
          </div>
        </li>
      </ul>
    </template>

    <Modal v-if="scan" title="Validar credencial" :subtitle="`Presença do Dia ${day}. Leitura demonstrativa, sem câmera real.`" @close="scan = null">
      <div class="scan-area">
        <div class="qr" aria-hidden="true" />
        <p>Área demonstrativa de leitura do QR Code da credencial.</p>
        <Field label="Código da credencial (opcional)" hint="Sem código, a leitura simula a próxima credencial válida para o dia.">
          <input v-model="scanCode" class="input" placeholder="HL-000001" @keydown.enter="simulateRead" />
        </Field>
        <button class="btn" type="button" @click="simulateRead">Simular leitura</button>
      </div>
      <div v-if="scan.kind === 'valid'" class="banner ok scan-result">
        <div>
          <b>Credencial válida</b>
          <dl class="scan-facts">
            <dt>Pessoa</dt><dd>{{ personOf(state, scan.credential.personId)?.name }}</dd>
            <dt>Categoria</dt><dd>{{ scan.credential.category }}</dd>
            <dt>Credencial</dt><dd>{{ scan.credential.code }}</dd>
            <dt>Dia {{ day }}</dt><dd>Acesso autorizado</dd>
          </dl>
        </div>
      </div>
      <div v-else-if="scan.kind === 'already'" class="banner warn scan-result">
        <div>
          <b>Presença já registrada</b>
          <p>{{ personOf(state, scan.credential.personId)?.name }} · Dia {{ scan.record.day }} · {{ scan.record.time || '—' }} · {{ scan.record.method }}</p>
        </div>
      </div>
      <div v-else-if="scan.kind === 'day'" class="banner warn scan-result">
        <div><b>Acesso não autorizado para este dia</b><p>Esta credencial não possui acesso ao Dia {{ day }}.</p></div>
      </div>
      <div v-else-if="scan.kind === 'blocked'" class="banner warn scan-result">
        <div><b>Credencial bloqueada</b><p>Esta credencial está bloqueada.</p></div>
      </div>
      <div v-else-if="scan.kind === 'cancelled'" class="banner err scan-result">
        <div><b>Credencial cancelada</b><p>Esta credencial foi cancelada.</p></div>
      </div>
      <div v-else-if="scan.kind === 'missing'" class="banner warn scan-result">
        <div>
          <b>Credencial não encontrada</b>
          <p>Nenhuma credencial com o código {{ scanCode.trim().toUpperCase() }}.</p>
          <div class="row-actions"><button class="btn ghost small" type="button" @click="openScan">Tentar novamente</button><button class="btn ghost small" type="button" @click="searchInstead">Buscar pessoa</button></div>
        </div>
      </div>
      <div v-else-if="scan.kind === 'none'" class="banner scan-result">
        <div><b>Nenhuma credencial pendente</b><p>Todas as credenciais ativas autorizadas para o Dia {{ day }} já têm presença.</p></div>
      </div>
      <template #footer>
        <button class="btn ghost" type="button" @click="scan = null">Fechar</button>
        <button v-if="scan.kind === 'valid'" class="btn" type="button" @click="confirmScan">Confirmar presença</button>
      </template>
    </Modal>

    <Modal v-if="manual" title="Registrar presença manualmente" subtitle="Use quando a leitura do QR Code não for possível." @close="manual = null">
      <p v-if="manual.error" class="banner warn">{{ manual.error }}</p>
      <Field label="Pessoa / credencial" required>
        <select v-model="manual.credentialId" class="input" @change="manual.error = ''">
          <option value="">Selecione</option>
          <option v-for="row in rows" :key="row.credential.id" :value="row.credential.id">{{ row.name }} · {{ row.credential.code }} · {{ row.credential.category }}</option>
        </select>
      </Field>
      <div class="form-grid">
        <Field label="Dia">
          <select v-model.number="manual.day" class="input" @change="manual.error = ''">
            <option v-for="item in EVENT_DAYS" :key="item" :value="item">Dia {{ item }}</option>
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

    <Modal v-if="form" :title="form.id ? 'Editar credencial' : 'Nova credencial'" subtitle="Código e QR Code são gerados automaticamente." @close="form = null">
      <p v-if="form.error" class="banner warn">{{ form.error }}</p>
      <div v-if="!form.id" class="chips" role="group" aria-label="Pessoa">
        <button type="button" class="chip" :class="{ on: form.mode === 'existente' }" @click="form.mode = 'existente'; form.error = ''">Pessoa já cadastrada</button>
        <button type="button" class="chip" :class="{ on: form.mode === 'externa' }" @click="form.mode = 'externa'; form.error = ''; setCategory('Convidado')">Cadastrar pessoa externa</button>
      </div>
      <Field v-if="form.id" label="Pessoa"><input class="input" :value="personOf(state, form.personId)?.name" disabled /></Field>
      <Field v-else-if="form.mode === 'existente'" label="Pessoa" required hint="Somente pessoas que ainda não têm credencial.">
        <select class="input" :value="form.personId" @change="pickPerson($event.target.value)">
          <option value="">Selecione</option>
          <option v-for="person in availablePeople" :key="person.id" :value="person.id">{{ person.name }} · {{ person.detail || person.kind }}</option>
        </select>
      </Field>
      <template v-else>
        <Field label="Nome" required><input v-model="form.name" class="input" /></Field>
        <Field label="E-mail (opcional)" hint="A pessoa externa não recebe conta no sistema."><input v-model="form.email" class="input" type="email" /></Field>
      </template>
      <Field label="Categoria">
        <select class="input" :value="form.category" @change="setCategory($event.target.value)">
          <option v-for="item in CREDENTIAL_CATEGORIES" :key="item">{{ item }}</option>
        </select>
      </Field>
      <div class="field">
        <span>Dias autorizados</span>
        <div class="chips">
          <label v-for="item in EVENT_DAYS" :key="item" class="check"><input type="checkbox" :checked="form.days.includes(item)" @change="toggleDay(item)" /> Dia {{ item }}</label>
        </div>
      </div>
      <Field label="Status">
        <select v-model="form.status" class="input">
          <option v-for="item in CREDENTIAL_STATUS" :key="item">{{ item }}</option>
        </select>
      </Field>
      <Field label="Observação (opcional)"><input v-model="form.note" class="input" /></Field>
      <template #footer>
        <button class="btn ghost" type="button" @click="form = null">Cancelar</button>
        <button class="btn" type="button" @click="saveCredential">{{ form.id ? 'Salvar alterações' : 'Criar credencial' }}</button>
      </template>
    </Modal>

    <Drawer v-if="detail" title="Credencial" :subtitle="`${detail.name} · ${detail.credential.category}`" @close="detailId = null">
      <div class="credential-card">
        <div class="credential-head"><b>HackLab</b><span>Credencial do evento</span></div>
        <div class="credential-body">
          <p class="credential-name">{{ detail.name }}</p>
          <p>{{ detail.credential.category }}</p>
          <div class="qr" aria-hidden="true" />
          <p class="ticket-code">{{ detail.credential.code }}</p>
          <p>{{ daysLabel(detail.credential.days) }} · <Badge :tone="STATUS_TONE[detail.credential.status]">{{ detail.credential.status }}</Badge></p>
          <p class="stat-hint">QR Code demonstrativo. Um único QR vale em todos os dias autorizados.</p>
        </div>
      </div>
      <div v-if="manage" class="field">
        <span>Status da credencial</span>
        <div class="chips">
          <button v-for="item in CREDENTIAL_STATUS" :key="item" type="button" class="chip" :class="{ on: detail.credential.status === item }" @click="setStatus(detail.credential, item)">{{ item }}</button>
        </div>
      </div>
      <h3 class="ops-title">Histórico de presença</h3>
      <dl class="ticket-days">
        <template v-for="item in EVENT_DAYS" :key="item">
          <dt>Dia {{ item }}</dt>
          <dd>
            <template v-if="presenceOf(state, detail.credential.personId, item)">
              <Badge tone="ok">Presente</Badge>
              <span class="stat-hint">{{ presenceOf(state, detail.credential.personId, item).method }} · {{ presenceOf(state, detail.credential.personId, item).time || '—' }}</span>
            </template>
            <Badge v-else-if="!detail.credential.days.includes(item)">Não autorizado</Badge>
            <Badge v-else>Não registrado</Badge>
          </dd>
        </template>
      </dl>
      <p v-if="detail.credential.note" class="stat-hint">Observação: {{ detail.credential.note }}</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="detailId = null">Fechar</button>
        <button v-if="manage" class="btn" type="button" @click="openEdit(detail.credential)">Editar</button>
      </template>
    </Drawer>
  </Page>
</template>
