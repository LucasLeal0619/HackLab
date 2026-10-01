<script setup>
import { computed, ref } from 'vue'
import { SETORES, uid } from '../model'
import { useHack, go } from '../store'
import Badge from '../components/Badge.vue'
import Drawer from '../components/Drawer.vue'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'
import Tabs from '../components/Tabs.vue'
import { toneFor } from '../components/tone.js'

const DOC_CATS = ['Atas', 'Contratos', 'Empresas', 'Desafios', 'Finanças', 'Marketing', 'Relatórios', 'Outros']
const DOC_FILTERS = ['Todos', ...DOC_CATS]
const MEETING_TABS = [
  { id: 'reunioes', label: 'Reuniões' },
  { id: 'atas', label: 'Atas' },
  { id: 'decisoes', label: 'Decisões' },
  { id: 'pendencias', label: 'Pendências' },
  { id: 'documentos', label: 'Documentos' },
]
const MEETING_TYPES = ['Geral', 'Setor', 'Consultores', 'Empresa', 'Administrativa', 'Extraordinária']
const PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente']
const DUE_FILTERS = ['Dentro do prazo', 'Próximo do prazo', 'Vence hoje', 'Atrasado', 'Concluído', 'Sem prazo']
const TAB_LABELS = { atas: 'Atas', decisoes: 'Decisões', pendencias: 'Pendências', documentos: 'Documentos' }

function docCat(doc) {
  if (!doc?.category || doc.category === 'Documentos gerais') return 'Outros'
  return doc.category
}

function dueInfo(task) {
  if (task.status === 'Concluído' || task.status === 'Concluída') return { label: 'Concluído', tone: 'done' }
  if (!task.due) return { label: 'Sem prazo', tone: '' }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${task.due}T00:00:00`)
  if (Number.isNaN(due.getTime())) return { label: 'Sem prazo', tone: '' }
  const diff = Math.round((due - today) / 86400000)
  if (diff < 0) return { label: 'Atrasado', tone: 'late' }
  if (diff === 0) return { label: 'Vence hoje', tone: 'today' }
  if (diff <= 2) return { label: 'Próximo do prazo', tone: 'soon' }
  return { label: 'Dentro do prazo', tone: 'ok' }
}

function outsideHours(value) {
  if (!value) return false
  return value < '08:00' || value > '12:00'
}

function ataProgress(item) {
  const done = item.ata.manifestations?.length || 0
  const total = item.participantIds?.length || 0
  return total ? `${done} de ${total} manifestaram` : (done || '—')
}

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  embedded: { type: Boolean, default: false },
})

const { state, update, flash } = useHack()

const tab = computed(() => (['reunioes', 'atas', 'decisoes', 'pendencias', 'documentos'].includes(props.params.aba) ? props.params.aba : 'reunioes'))
const modal = ref(null)
const form = ref({})
const query = ref('')
const status = ref('')
const sector = ref('')
const priority = ref('')
const docCatFilter = ref('Todos')
const prazo = ref('')
const detail = ref(null)
const removing = ref(null)
const ataForm = ref({
  number: '',
  discussed: '',
  decisions: '',
  forwards: '',
  observations: '',
  status: 'Rascunho',
})

const crumb = computed(() => (tab.value === 'reunioes'
  ? 'HackLab / Gestão / Reuniões e Pendências'
  : `HackLab / Gestão / Reuniões e Pendências / ${TAB_LABELS[tab.value]}`))

const meetings = computed(() => state.meetings.filter((item) => item.title.toLowerCase().includes(query.value.toLowerCase()) && (!status.value || item.status === status.value)))
const atas = computed(() => state.meetings.filter((item) => item.ata && item.title.toLowerCase().includes(query.value.toLowerCase()) && (!status.value || item.ata.status === status.value)))
const decisions = computed(() => state.decisions.filter((item) => item.title.toLowerCase().includes(query.value.toLowerCase()) && (!status.value || item.status === status.value)))
const tasks = computed(() => state.tasks.filter((item) => {
  const due = dueInfo(item).label
  return item.title.toLowerCase().includes(query.value.toLowerCase())
    && (!status.value || item.status === status.value)
    && (!sector.value || item.sector === sector.value)
    && (!priority.value || item.priority === priority.value)
    && (!prazo.value || prazo.value === due)
}))
const docs = computed(() => state.documents.filter((item) => item.name.toLowerCase().includes(query.value.toLowerCase()) && (docCatFilter.value === 'Todos' || docCat(item) === docCatFilter.value)))
const upcoming = computed(() => state.meetings.filter((item) => item.status === 'Agendada').length)
const atasPendentes = computed(() => state.meetings.filter((item) => item.ata?.status === 'Aguardando manifestações' || (!item.ata && item.status !== 'Realizada')).length)
const pendingTasks = computed(() => state.tasks.filter((item) => item.status === 'Pendente').length)
const doingTasks = computed(() => state.tasks.filter((item) => item.status === 'Em andamento').length)
const lateTasks = computed(() => state.tasks.filter((item) => dueInfo(item).label === 'Atrasado').length)
const doneTasks = computed(() => state.tasks.filter((item) => item.status === 'Concluído').length)
const recentDocs = computed(() => state.documents.filter((item) => item.date && item.date !== 'Data demonstrativa').length)
const pendingDocs = computed(() => state.documents.filter((item) => !item.fileName).length)
const activeUsers = computed(() => state.users.filter((user) => user.status === 'Ativo'))

const detailMeeting = computed(() => {
  if (detail.value?.type !== 'reuniao') return null
  return state.meetings.find((item) => item.id === detail.value.id) || null
})
const detailDecision = computed(() => {
  if (detail.value?.type !== 'decisao') return null
  return state.decisions.find((item) => item.id === detail.value.id) || null
})
const detailTask = computed(() => {
  if (detail.value?.type !== 'pendencia') return null
  return state.tasks.find((item) => item.id === detail.value.id) || null
})
const detailDoc = computed(() => {
  if (detail.value?.type !== 'doc') return null
  return state.documents.find((item) => item.id === detail.value.id) || null
})
const meetingPeople = computed(() => {
  const meeting = detailMeeting.value
  if (!meeting) return []
  return state.users.filter((user) => meeting.participantIds?.includes(user.id))
})
const linkedDecisions = computed(() => {
  const meeting = detailMeeting.value
  if (!meeting) return []
  return state.decisions.filter((item) => item.meetingId === meeting.id)
})
const linkedDocs = computed(() => {
  const meeting = detailMeeting.value
  if (!meeting) return []
  return state.documents.filter((item) => docCat(item) === 'Atas' && (item.description || '').includes(meeting.title))
})
const manifestationDone = computed(() => detailMeeting.value?.ata?.manifestations?.length || 0)
const decisionSubtitle = computed(() => {
  const decision = detailDecision.value
  if (!decision) return ''
  return state.meetings.find((item) => item.id === decision.meetingId)?.title || 'Sem reunião vinculada'
})
const taskDue = computed(() => (detailTask.value ? dueInfo(detailTask.value) : { label: '', tone: '' }))
const modalTitle = computed(() => {
  if (modal.value === 'reuniao') return form.value.id ? 'Editar reunião' : 'Nova reunião'
  if (modal.value === 'decisao') return form.value.id ? 'Editar decisão' : 'Nova decisão'
  if (modal.value === 'pendencia') return form.value.id ? 'Editar pendência' : 'Nova pendência'
  return form.value.id ? 'Editar documento' : 'Adicionar documento'
})

function choose(id) {
  query.value = ''
  status.value = ''
  sector.value = ''
  priority.value = ''
  prazo.value = ''
  const destination = id === 'pendencias' ? 'pendencias' : id === 'documentos' ? 'documentos' : 'reunioes'
  const extra = id === 'atas' ? '&lista=atas' : id === 'decisoes' ? '&lista=decisoes' : ''
  go(`gestao?aba=${destination}${extra}`)
}

function openPendencia(seed) {
  detail.value = null
  form.value = {
    title: '',
    description: '',
    sector: '',
    due: '',
    responsible: '',
    status: 'Pendente',
    priority: 'Média',
    origin: '',
    decisionId: '',
    ...(seed || {}),
  }
  modal.value = 'pendencia'
}

function openMeeting() {
  form.value = {
    title: '',
    type: 'Geral',
    responsible: state.users[0]?.name || '',
    date: '',
    start: '08:00',
    end: '12:00',
    place: 'A cadastrar',
    agenda: '',
    notes: '',
    participantIds: [],
  }
  modal.value = 'reuniao'
}

function editMeeting(item) {
  form.value = { ...item, participantIds: item.participantIds || [], agenda: item.agenda || '', notes: item.notes || '' }
  modal.value = 'reuniao'
}

function openDecision() {
  form.value = {
    title: '',
    description: '',
    meetingId: state.meetings[0]?.id || '',
    responsible: '',
    status: 'Registrada',
    sector: 'Tecnologia',
    date: '',
    notes: '',
  }
  modal.value = 'decisao'
}

function editDecision(item) {
  form.value = { description: '', notes: '', sector: 'Tecnologia', status: 'Registrada', meetingId: '', ...item }
  modal.value = 'decisao'
}

function openDocument() {
  form.value = {
    name: '',
    category: 'Outros',
    responsible: '',
    sector: '',
    description: '',
    version: '1.0',
    note: '',
    fileName: '',
  }
  modal.value = 'doc'
}

function editDocument(item) {
  form.value = { category: docCat(item), sector: '', description: '', version: item.version || '1.0', note: '', ...item }
  modal.value = 'doc'
}

function showMeeting(id, focus) {
  const meeting = state.meetings.find((item) => item.id === id)
  ataForm.value = meeting?.ata
    ? { ...meeting.ata }
    : {
      number: String(state.meetings.length).padStart(2, '0'),
      discussed: '',
      decisions: '',
      forwards: '',
      observations: '',
      status: 'Rascunho',
    }
  detail.value = focus ? { type: 'reuniao', id, focus } : { type: 'reuniao', id }
}

function toggleParticipant(userId) {
  const ids = form.value.participantIds || []
  const on = ids.includes(userId)
  form.value = {
    ...form.value,
    participantIds: on ? ids.filter((id) => id !== userId) : [...ids, userId],
  }
}

function onFile(event) {
  form.value = { ...form.value, fileName: event.target.files?.[0]?.name || '' }
}

function meetingName(id) {
  return state.meetings.find((item) => item.id === id)?.title || '—'
}

function save() {
  const kind = modal.value
  const current = form.value
  if ((kind === 'reuniao' && !current.title?.trim()) || (kind === 'decisao' && !current.title?.trim()) || (kind === 'pendencia' && !current.title?.trim()) || (kind === 'doc' && !current.name?.trim())) {
    flash('Informe o título para salvar.', 'err')
    return
  }
  const fromDecision = kind === 'pendencia' && current.decisionId
  update((draft) => {
    if (kind === 'reuniao') {
      const record = { ...current, title: current.title.trim(), participantIds: current.participantIds || [] }
      const index = current.id ? draft.meetings.findIndex((item) => item.id === current.id) : -1
      if (index >= 0) draft.meetings[index] = { ...draft.meetings[index], ...record }
      else draft.meetings.unshift({ id: uid('reu'), ...record, presence: {}, status: 'Agendada', ata: null })
    }
    if (kind === 'decisao') {
      const record = { ...current, title: current.title.trim(), forwards: current.forwards || [] }
      const index = current.id ? draft.decisions.findIndex((item) => item.id === current.id) : -1
      if (index >= 0) draft.decisions[index] = { ...draft.decisions[index], ...record }
      else draft.decisions.unshift({ id: uid('dec'), ...record })
    }
    if (kind === 'pendencia') {
      const record = {
        title: current.title.trim(),
        description: current.description,
        sector: current.sector,
        due: current.due,
        responsible: current.responsible,
        status: current.status || 'Pendente',
        priority: current.priority,
        origin: current.origin || '',
        decisionId: current.decisionId || '',
        notes: current.notes || '',
      }
      const index = current.id ? draft.tasks.findIndex((item) => item.id === current.id) : -1
      if (index >= 0) draft.tasks[index] = { ...draft.tasks[index], ...record }
      else draft.tasks.unshift({ id: uid('pen'), createdAt: new Date().toLocaleString('pt-BR'), ...record })
    }
    if (kind === 'doc') {
      const record = { ...current, name: current.name.trim() }
      const index = current.id ? draft.documents.findIndex((item) => item.id === current.id) : -1
      if (index >= 0) draft.documents[index] = { ...draft.documents[index], ...record }
      else draft.documents.unshift({
        id: uid('doc'),
        ...record,
        date: new Date().toLocaleDateString('pt-BR'),
        history: [{ version: current.version || '1.0', date: new Date().toLocaleDateString('pt-BR'), responsible: current.responsible || '—', note: current.note || 'Versão inicial' }],
      })
    }
  })
  flash(current.id ? 'Alterações salvas.' : 'Registro salvo. A lista foi atualizada.')
  modal.value = null
  if (fromDecision) choose('pendencias')
}

function confirmRemove() {
  const current = removing.value
  if (!current) return
  update((draft) => {
    if (current.kind === 'reuniao') {
      draft.meetings = draft.meetings.filter((item) => item.id !== current.id)
      draft.decisions.forEach((item) => { if (item.meetingId === current.id) item.meetingId = '' })
    }
    if (current.kind === 'ata') {
      const meeting = draft.meetings.find((item) => item.id === current.id)
      if (meeting) {
        meeting.ata = null
        if (meeting.status === 'Aguardando manifestações') meeting.status = 'Agendada'
      }
    }
    if (current.kind === 'decisao') draft.decisions = draft.decisions.filter((item) => item.id !== current.id)
    if (current.kind === 'pendencia') draft.tasks = draft.tasks.filter((item) => item.id !== current.id)
    if (current.kind === 'doc') draft.documents = draft.documents.filter((item) => item.id !== current.id)
  })
  const labels = { reuniao: 'Reunião excluída.', ata: 'Ata excluída.', decisao: 'Decisão excluída.', pendencia: 'Pendência excluída.', doc: 'Documento excluído.' }
  removing.value = null
  flash(labels[current.kind])
}

function publishAta() {
  const meeting = detailMeeting.value
  if (!meeting) return
  const snapshot = { ...ataForm.value }
  update((draft) => {
    const current = draft.meetings.find((item) => item.id === meeting.id)
    current.ata = {
      ...snapshot,
      status: 'Aguardando manifestações',
      manifestations: current.ata?.manifestations || [],
      versions: [{ version: '1.0', date: new Date().toLocaleDateString('pt-BR'), responsible: state.session?.name, change: 'Versão disponibilizada' }],
    }
    current.status = 'Aguardando manifestações'
  })
  flash('Ata disponibilizada para manifestação.')
}

function completeTask() {
  const task = detailTask.value
  if (!task) return
  update((draft) => {
    const found = draft.tasks.find((item) => item.id === task.id)
    if (found) found.status = 'Concluído'
  })
  flash('Pendência marcada como concluída.')
}

function createTaskFromDecision() {
  const decision = detailDecision.value
  if (!decision) return
  openPendencia({
    title: decision.title,
    description: decision.description || '',
    sector: decision.sector || '',
    responsible: decision.responsible || '',
    origin: `Decisão · ${decision.title}`,
    decisionId: decision.id,
  })
}

function askRemove(kind, id, name) {
  removing.value = { kind, id, name }
}
</script>

<template>
  <Page
    :crumbs="embedded ? '' : crumb"
    :title="embedded ? '' : 'Reuniões e Pendências'"
    :subtitle="embedded ? '' : 'Organize reuniões, atas, decisões, tarefas e documentos da gestão do Hackathon.'"
  >
    <template v-if="tab === 'reunioes'" #actions>
      <button class="btn" type="button" @click="openMeeting">+ Nova reunião</button>
    </template>
    <template v-else-if="tab === 'decisoes'" #actions>
      <button class="btn" type="button" @click="openDecision">+ Nova decisão</button>
    </template>
    <template v-else-if="tab === 'pendencias'" #actions>
      <button class="btn" type="button" @click="openPendencia()">+ Nova pendência</button>
    </template>
    <template v-else-if="tab === 'documentos'" #actions>
      <button class="btn" type="button" @click="openDocument">+ Adicionar documento</button>
    </template>

    <p v-if="embedded && tab === 'reunioes'" class="inline-links">
      <button class="linkish" type="button" @click="go('gestao?aba=reunioes&lista=atas')">Ver todas as atas</button>
      <button class="linkish" type="button" @click="go('gestao?aba=reunioes&lista=decisoes')">Ver decisões</button>
    </p>
    <p v-else-if="embedded && (tab === 'atas' || tab === 'decisoes')">
      <button class="linkish" type="button" @click="go('gestao?aba=reunioes')">Voltar às reuniões</button>
    </p>
    <Tabs v-else-if="!embedded" :tabs="MEETING_TABS" :model-value="tab" @update:model-value="choose" />

    <div v-if="tab === 'reunioes'" class="grid cols-3">
      <article class="card"><h3>Reuniões</h3><div class="stat-value">{{ state.meetings.length || '—' }}</div></article>
      <article class="card"><h3>Próximas</h3><div class="stat-value">{{ upcoming || '—' }}</div></article>
      <article class="card"><h3>Atas pendentes</h3><div class="stat-value">{{ atasPendentes || '—' }}</div></article>
    </div>
    <div v-if="tab === 'pendencias'" class="grid cols-4">
      <article class="card"><h3>Pendentes</h3><div class="stat-value">{{ pendingTasks || '—' }}</div></article>
      <article class="card"><h3>Em andamento</h3><div class="stat-value">{{ doingTasks || '—' }}</div></article>
      <article class="card"><h3>Atrasadas</h3><div class="stat-value">{{ lateTasks || '—' }}</div></article>
      <article class="card"><h3>Concluídas</h3><div class="stat-value">{{ doneTasks || '—' }}</div></article>
    </div>
    <div v-if="tab === 'documentos'" class="grid cols-3">
      <article class="card"><h3>Documentos</h3><div class="stat-value">{{ state.documents.length || '—' }}</div></article>
      <article class="card"><h3>Atualizados recentemente</h3><div class="stat-value">{{ recentDocs || '—' }}</div></article>
      <article class="card"><h3>Pendentes</h3><div class="stat-value">{{ pendingDocs || '—' }}</div></article>
    </div>

    <div v-if="tab !== 'documentos'" class="filters mt">
      <input v-model="query" class="input" placeholder="Buscar" aria-label="Buscar" />
      <select v-if="tab === 'reunioes'" v-model="status" class="input" aria-label="Status">
        <option value="">Status</option>
        <option>Agendada</option>
        <option>Aguardando manifestações</option>
        <option>Realizada</option>
      </select>
      <select v-if="tab === 'atas'" v-model="status" class="input" aria-label="Status">
        <option value="">Status</option>
        <option>Rascunho</option>
        <option>Em revisão</option>
        <option>Aguardando manifestações</option>
        <option>Finalizada</option>
      </select>
      <select v-if="tab === 'decisoes'" v-model="status" class="input" aria-label="Status">
        <option value="">Status</option>
        <option>Registrada</option>
        <option>Em andamento</option>
        <option>Concluída</option>
      </select>
      <template v-if="tab === 'pendencias'">
        <select v-model="sector" class="input" aria-label="Setor">
          <option value="">Setor</option>
          <option v-for="item in SETORES" :key="item">{{ item }}</option>
        </select>
        <select v-model="status" class="input" aria-label="Status">
          <option value="">Status</option>
          <option>Pendente</option>
          <option>Em andamento</option>
          <option>Concluído</option>
        </select>
        <select v-model="priority" class="input" aria-label="Prioridade">
          <option value="">Prioridade</option>
          <option v-for="item in PRIORITIES" :key="item">{{ item }}</option>
        </select>
        <select v-model="prazo" class="input" aria-label="Prazo">
          <option value="">Prazo</option>
          <option v-for="item in DUE_FILTERS" :key="item">{{ item }}</option>
        </select>
      </template>
    </div>
    <div v-else class="filters mt">
      <input v-model="query" class="input" placeholder="Buscar" aria-label="Buscar documento" />
      <div class="chips">
        <button
          v-for="item in DOC_FILTERS"
          :key="item"
          type="button"
          class="chip"
          :class="{ on: docCatFilter === item }"
          @click="docCatFilter = item"
        >{{ item }}</button>
      </div>
    </div>

    <div v-if="tab === 'reunioes'" class="table-wrap">
      <table>
        <thead><tr><th>Reunião</th><th>Data</th><th>Tipo</th><th>Ata</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="meetings.length === 0"><td colspan="6"><Empty title="Nenhuma reunião cadastrada ainda." text="Agende a primeira reunião da organização." /></td></tr>
          <tr v-for="item in meetings" :key="item.id">
            <td>{{ item.title }}</td>
            <td>{{ item.date || 'A definir' }}{{ item.start ? ` · ${item.start}` : '' }}</td>
            <td>{{ item.type }}</td>
            <td>{{ item.ata ? `ATA Nº ${item.ata.number}` : '—' }}</td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="showMeeting(item.id)">Visualizar</button>
                <button class="btn ghost small" type="button" @click="editMeeting(item)">Editar</button>
                <button class="btn ghost small" type="button" @click="askRemove('reuniao', item.id, item.title)">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="tab === 'atas'" class="table-wrap">
      <table>
        <thead><tr><th>Ata</th><th>Reunião</th><th>Status</th><th>Manifestações</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="atas.length === 0"><td colspan="5"><Empty title="Nenhuma ata disponível." /></td></tr>
          <tr v-for="item in atas" :key="item.id">
            <td>ATA Nº {{ item.ata.number }}</td>
            <td>{{ item.title }}</td>
            <td><Badge :tone="toneFor(item.ata.status)">{{ item.ata.status }}</Badge></td>
            <td>{{ ataProgress(item) }}</td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="showMeeting(item.id, 'ata')">Visualizar</button>
                <button class="btn ghost small" type="button" @click="editMeeting(item)">Editar</button>
                <button class="btn ghost small" type="button" @click="askRemove('ata', item.id, `ATA Nº ${item.ata.number}`)">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="tab === 'decisoes'" class="table-wrap">
      <table>
        <thead><tr><th>Decisão</th><th>Reunião</th><th>Responsável</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="decisions.length === 0"><td colspan="5"><Empty title="Nenhuma decisão registrada." /></td></tr>
          <tr v-for="item in decisions" :key="item.id">
            <td>{{ item.title }}</td>
            <td>{{ meetingName(item.meetingId) }}</td>
            <td>{{ item.responsible || '—' }}</td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { type: 'decisao', id: item.id }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="editDecision(item)">Editar</button>
                <button class="btn ghost small" type="button" @click="askRemove('decisao', item.id, item.title)">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="tab === 'pendencias'" class="table-wrap">
      <table>
        <thead><tr><th>Pendência</th><th>Setor</th><th>Responsável</th><th>Prazo</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="tasks.length === 0"><td colspan="6"><Empty title="Nenhuma pendência encontrada." text="Pendências de reuniões e setores aparecem aqui." /></td></tr>
          <tr v-for="item in tasks" :key="item.id">
            <td>{{ item.title }} <Badge v-if="item.priority" :tone="toneFor(item.priority)">{{ item.priority }}</Badge></td>
            <td>{{ item.sector || '—' }}</td>
            <td>{{ item.responsible || 'Não definido' }}</td>
            <td>
              <span :class="`due ${dueInfo(item).tone}`">{{ dueInfo(item).label }}</span>
              <template v-if="item.due"><br><small>{{ item.due }}</small></template>
            </td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { type: 'pendencia', id: item.id }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="openPendencia(item)">Editar</button>
                <button class="btn ghost small" type="button" @click="askRemove('pendencia', item.id, item.title)">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="tab === 'documentos'" class="table-wrap">
      <table>
        <thead><tr><th>Documento</th><th>Categoria</th><th>Setor</th><th>Versão</th><th>Data</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="docs.length === 0"><td colspan="6"><Empty title="Nenhum documento armazenado." /></td></tr>
          <tr v-for="item in docs" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ docCat(item) }}</td>
            <td>{{ item.sector || '—' }}</td>
            <td>{{ item.version || '—' }}</td>
            <td>{{ item.date || '—' }}</td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { type: 'doc', id: item.id }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="editDocument(item)">Editar</button>
                <button class="btn ghost small" type="button" @click="askRemove('doc', item.id, item.name)">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  <Drawer
    v-if="detailMeeting"
    :title="detailMeeting.title"
    :subtitle="`${detailMeeting.type} · ${detailMeeting.date || 'Data a definir'}`"
    @close="detail = null"
  >
    <p><Badge :tone="toneFor(detailMeeting.status)">{{ detailMeeting.status }}</Badge> · {{ detailMeeting.place }}</p>
    <section>
      <h3>Informações</h3>
      <p style="white-space: pre-wrap">{{ detailMeeting.agenda || 'Sem pauta.' }}</p>
      <p v-if="detailMeeting.notes">{{ detailMeeting.notes }}</p>
    </section>
    <section>
      <h3>Participantes</h3>
      <p v-if="meetingPeople.length === 0">Nenhum participante vinculado.</p>
      <p v-for="user in meetingPeople" :key="user.id">{{ user.name }} · {{ user.profile }} · {{ detailMeeting.presence?.[user.id] || 'Não informado' }}</p>
      <p class="stat-hint">{{ meetingPeople.length || '—' }} participante(s). A presença desta reunião não se mistura com o evento.</p>
    </section>
    <section :id="detail?.focus === 'ata' ? 'ata' : undefined">
      <h3>Ata</h3>
      <p v-if="detailMeeting.ata"><Badge :tone="toneFor(detailMeeting.ata.status)">{{ detailMeeting.ata.status || 'Rascunho' }}</Badge></p>
      <p v-else class="stat-hint">Ata ainda não finalizada.</p>
      <Field label="Número"><input class="input" :value="ataForm.number || ''" @input="ataForm.number = $event.target.value" /></Field>
      <Field label="Assuntos discutidos"><textarea class="input" :value="ataForm.discussed || ''" @input="ataForm.discussed = $event.target.value" /></Field>
      <Field label="Decisões"><textarea class="input" :value="ataForm.decisions || ''" @input="ataForm.decisions = $event.target.value" /></Field>
      <Field label="Encaminhamentos"><textarea class="input" :value="ataForm.forwards || ''" @input="ataForm.forwards = $event.target.value" /></Field>
      <Field label="Observações"><textarea class="input" :value="ataForm.observations || ''" @input="ataForm.observations = $event.target.value" /></Field>
      <p v-if="detailMeeting.ata" class="stat-hint">{{ meetingPeople.length ? `${manifestationDone} de ${meetingPeople.length} manifestaram` : `${manifestationDone} manifestação(ões)` }}</p>
      <p v-if="detailMeeting.ata"><button class="linkish" type="button" @click="go(`manifestacao?id=${detailMeeting.id}`)">Registrar manifestação</button></p>
    </section>
    <section>
      <h3>Decisões e encaminhamentos</h3>
      <p v-if="linkedDecisions.length === 0">Nenhuma decisão ligada a esta reunião.</p>
      <p v-for="item in linkedDecisions" :key="item.id">{{ item.title }} · {{ item.status }}</p>
    </section>
    <section>
      <h3>Documentos</h3>
      <p v-if="linkedDocs.length === 0">Nenhum documento ligado a esta reunião.</p>
      <p v-for="item in linkedDocs" :key="item.id">{{ item.name }} · {{ item.version }}</p>
    </section>
    <template #footer>
      <button class="btn ghost" type="button" @click="detail = null">Fechar</button>
      <button class="btn" type="button" @click="publishAta">Finalizar ata</button>
    </template>
  </Drawer>

  <Drawer v-else-if="detailDecision" :title="detailDecision.title" :subtitle="decisionSubtitle" @close="detail = null">
    <dl class="kv">
      <dt>Status</dt><dd><Badge :tone="toneFor(detailDecision.status)">{{ detailDecision.status }}</Badge></dd>
      <dt>Responsável</dt><dd>{{ detailDecision.responsible || '—' }}</dd>
      <dt>Setor</dt><dd>{{ detailDecision.sector || '—' }}</dd>
      <dt>Descrição</dt><dd>{{ detailDecision.description || '—' }}</dd>
    </dl>
    <template #footer>
      <button class="btn ghost" type="button" @click="detail = null">Fechar</button>
      <button class="btn" type="button" @click="createTaskFromDecision">Criar pendência</button>
    </template>
  </Drawer>

  <Drawer v-else-if="detailTask" :title="detailTask.title" @close="detail = null">
    <dl class="kv">
      <dt>Descrição</dt><dd>{{ detailTask.description || '—' }}</dd>
      <dt>Responsável</dt><dd>{{ detailTask.responsible || 'Não definido' }}</dd>
      <dt>Prazo</dt><dd><span :class="`due ${taskDue.tone}`">{{ taskDue.label }}</span>{{ detailTask.due ? ` · ${detailTask.due}` : '' }}</dd>
      <dt>Prioridade</dt><dd><Badge :tone="toneFor(detailTask.priority)">{{ detailTask.priority || '—' }}</Badge></dd>
      <dt>Origem</dt><dd>{{ detailTask.origin || 'Cadastro direto' }}</dd>
      <dt>Status</dt><dd><Badge :tone="toneFor(detailTask.status)">{{ detailTask.status }}</Badge></dd>
      <dt>Observação</dt><dd>{{ detailTask.notes || '—' }}</dd>
    </dl>
    <template #footer>
      <button v-if="detailTask.status !== 'Concluído'" class="btn" type="button" @click="completeTask">Marcar como concluída</button>
      <button v-else class="btn ghost" type="button" @click="detail = null">Fechar</button>
    </template>
  </Drawer>

  <Drawer v-else-if="detailDoc" :title="detailDoc.name" :subtitle="docCat(detailDoc)" @close="detail = null">
    <dl class="kv">
      <dt>Setor</dt><dd>{{ detailDoc.sector || '—' }}</dd>
      <dt>Versão atual</dt><dd>{{ detailDoc.version || '—' }}</dd>
      <dt>Data</dt><dd>{{ detailDoc.date || '—' }}</dd>
      <dt>Responsável</dt><dd>{{ detailDoc.responsible || '—' }}</dd>
      <dt>Descrição</dt><dd>{{ detailDoc.description || '—' }}</dd>
      <dt>Arquivo</dt><dd>{{ detailDoc.fileName || 'Upload demonstrativo' }}</dd>
    </dl>
    <h3>Histórico</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Versão</th><th>Data</th><th>Responsável</th><th>Observação</th></tr></thead>
        <tbody>
          <tr v-if="!(detailDoc.history || []).length"><td colspan="4">Sem histórico.</td></tr>
          <tr v-for="(item, index) in detailDoc.history || []" :key="index">
            <td>{{ item.version }}</td>
            <td>{{ item.date }}</td>
            <td>{{ item.responsible || '—' }}</td>
            <td>{{ item.note || item.change || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </Drawer>

  <Modal v-if="modal" :wide="modal === 'reuniao'" :title="modalTitle" @close="modal = null">
    <div v-if="modal === 'reuniao'" class="form-grid">
      <Field label="Título" required class="span-2"><input v-model="form.title" class="input" /></Field>
      <Field label="Tipo">
        <select v-model="form.type" class="input">
          <option v-for="item in MEETING_TYPES" :key="item">{{ item }}</option>
        </select>
      </Field>
      <Field label="Responsável"><input v-model="form.responsible" class="input" /></Field>
      <Field label="Data"><input v-model="form.date" class="input" type="date" /></Field>
      <Field label="Horário"><input v-model="form.start" class="input" type="time" /></Field>
      <Field label="Local" class="span-2"><input v-model="form.place" class="input" /></Field>
      <p v-if="outsideHours(form.start)" class="stat-hint span-2">Horário fora de 08:00 às 12:00 — aviso demonstrativo. O evento permanece nesse intervalo.</p>
      <Field label="Pauta" class="span-2"><textarea v-model="form.agenda" class="input" /></Field>
      <Field label="Descrição / observação" class="span-2"><textarea v-model="form.notes" class="input" /></Field>
      <div class="field span-2">
        <span>Participantes</span>
        <div class="chips">
          <button
            v-for="user in activeUsers"
            :key="user.id"
            type="button"
            class="chip"
            :class="{ on: form.participantIds?.includes(user.id) }"
            @click="toggleParticipant(user.id)"
          >{{ user.name }} · {{ user.profile }}</button>
        </div>
      </div>
    </div>
    <div v-if="modal === 'decisao'" class="form-grid">
      <Field label="Decisão" required class="span-2"><input v-model="form.title" class="input" /></Field>
      <Field label="Descrição" class="span-2"><textarea v-model="form.description" class="input" /></Field>
      <Field label="Reunião">
        <select v-model="form.meetingId" class="input">
          <option value="">Nenhuma</option>
          <option v-for="item in state.meetings" :key="item.id" :value="item.id">{{ item.title }}</option>
        </select>
      </Field>
      <Field label="Responsável"><input v-model="form.responsible" class="input" /></Field>
      <Field label="Setor">
        <select v-model="form.sector" class="input">
          <option v-for="item in SETORES" :key="item">{{ item }}</option>
        </select>
      </Field>
      <Field label="Status">
        <select v-model="form.status" class="input">
          <option>Registrada</option>
          <option>Em andamento</option>
          <option>Concluída</option>
        </select>
      </Field>
    </div>
    <div v-if="modal === 'pendencia'" class="form-grid">
      <Field label="Título" required class="span-2"><input v-model="form.title" class="input" /></Field>
      <Field label="Descrição" class="span-2"><textarea v-model="form.description" class="input" /></Field>
      <Field label="Setor">
        <select v-model="form.sector" class="input">
          <option value="">Selecione o setor</option>
          <option v-for="item in SETORES" :key="item">{{ item }}</option>
        </select>
      </Field>
      <Field label="Responsável">
        <select v-model="form.responsible" class="input">
          <option value="">Selecione</option>
          <option v-for="user in state.users" :key="user.id">{{ user.name }}</option>
        </select>
      </Field>
      <Field label="Prazo"><input v-model="form.due" class="input" type="date" /></Field>
      <Field label="Status">
        <select v-model="form.status" class="input">
          <option>Pendente</option>
          <option>Em andamento</option>
          <option>Concluído</option>
        </select>
      </Field>
      <div class="field span-2">
        <span>Prioridade</span>
        <div class="chips">
          <button
            v-for="item in PRIORITIES"
            :key="item"
            type="button"
            class="chip"
            :class="{ on: form.priority === item }"
            @click="form.priority = item"
          >{{ item }}</button>
        </div>
      </div>
      <p v-if="form.origin" class="stat-hint span-2">Origem: {{ form.origin }}</p>
    </div>
    <div v-if="modal === 'doc'" class="form-grid">
      <Field label="Nome" required><input v-model="form.name" class="input" /></Field>
      <Field label="Categoria" required>
        <select v-model="form.category" class="input">
          <option v-for="item in DOC_CATS" :key="item">{{ item }}</option>
        </select>
      </Field>
      <Field label="Setor">
        <select v-model="form.sector" class="input">
          <option value="">Opcional</option>
          <option v-for="item in SETORES" :key="item">{{ item }}</option>
        </select>
      </Field>
      <Field label="Versão"><input v-model="form.version" class="input" /></Field>
      <Field label="Descrição" class="span-2"><textarea v-model="form.description" class="input" /></Field>
      <Field label="Observação" class="span-2"><input class="input" :value="form.note || ''" @input="form.note = $event.target.value" /></Field>
      <Field label="Arquivo demonstrativo" class="span-2" hint="Upload visual — nenhum arquivo é enviado.">
        <input class="input" type="file" @change="onFile" />
      </Field>
    </div>
    <template #footer>
      <button class="btn ghost" type="button" @click="modal = null">Cancelar</button>
      <button class="btn" type="button" @click="save">{{ form.id ? 'Salvar alterações' : 'Salvar' }}</button>
    </template>
  </Modal>

  <Modal
    v-if="removing"
    :title="removing.kind === 'ata' ? 'Excluir ata?' : 'Excluir registro?'"
    :subtitle="removing.kind === 'ata' ? 'A ata sai desta reunião. A reunião continua cadastrada.' : 'O registro será removido deste navegador.'"
    @close="removing = null"
  >
    <p>{{ removing.name }}</p>
    <template #footer>
      <button class="btn ghost" type="button" @click="removing = null">Cancelar</button>
      <button class="btn danger" type="button" @click="confirmRemove">Excluir</button>
    </template>
  </Modal>
  </Page>
</template>
