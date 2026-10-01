<script setup>
import { computed, ref, watch } from 'vue'
import { companyOf, isAvailable, pausedMembers, teamChallenge, teamName, uid } from '../model'
import { useHack, go } from '../store'
import Badge from '../components/Badge.vue'
import Drawer from '../components/Drawer.vue'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import NextStep from '../components/NextStep.vue'
import Page from '../components/Page.vue'
import Tabs from '../components/Tabs.vue'
import { toneFor } from '../components/tone.js'

const DAY_TABS = [{ id: '1', label: 'Dia 1' }, { id: '2', label: 'Dia 2' }, { id: '3', label: 'Dia 3' }]
const DAY1_FLOW = ['Credenciamento', 'Abertura', 'Empresas e desafios', 'Formação das equipes', 'Distribuição dos desafios']
const DAY3_FLOW = ['Preparação', 'Apresentações', 'Avaliações', 'Votação do público', 'Resultados', 'Premiação', 'Encerramento']
const PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente']
const MANUAL_REASONS = ['QR Code indisponível', 'Problema de conexão', 'Ingresso não localizado', 'Outro']
const OCC_CATEGORIES = ['Tecnologia', 'Produção', 'Sala', 'Estrutura', 'Materiais', 'Participante', 'Outro']

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const { state, update, flash } = useHack()

function dash(value) {
  return value ? value : '—'
}

function roomLabel(id) {
  return `Sala ${String(id).padStart(2, '0')}`
}

function teamOf(studentId) {
  return state.teams.find((team) => team.members.includes(studentId))
}

function presentOn(personId, dayNumber) {
  return state.checkins.find((item) => item.personId === personId && item.day === dayNumber && item.status === 'Presente')
}

function freshManualForm() {
  return { personId: '', time: '08:10', reason: 'QR Code indisponível', note: '' }
}

function freshDayForm() {
  return { title: '', category: 'Sala', description: '', place: 'Sala 01', priority: 'Média', status: 'Aberta', responsible: '', equipmentId: '', problem: '', note: '', solution: '' }
}

const day = computed(() => ([1, 2, 3].includes(Number(props.params.dia)) ? Number(props.params.dia) : 1))
const query = ref('')
const term = computed(() => query.value.trim().toLowerCase())
const hits = computed(() => {
  if (!term.value) return []
  return [
    ...state.students.filter((item) => item.name.toLowerCase().includes(term.value)).slice(0, 4).map((item) => {
      const team = teamOf(item.id)
      const presence = presentOn(item.id, day.value)
      return { id: item.id, title: item.name, text: `Turma ${item.turma} · ${team ? teamName(team.id) : 'Sem equipe'} · ${presence ? 'Presente' : 'Não registrado'}` }
    }),
    ...state.teams.filter((item) => teamName(item.id).toLowerCase().includes(term.value) || roomLabel(item.id).toLowerCase().includes(term.value)).slice(0, 4).map((item) => ({
      id: `team-${item.id}`,
      title: teamName(item.id),
      text: `${roomLabel(item.id)} · ${item.status === 'confirmada' ? 'Em atividade' : 'Aguardando início'}`,
    })),
  ]
})

const modal = ref(null)
const scan = ref(null)
const manualForm = ref(freshManualForm())
const presenceQuery = ref('')
const roomId = ref(null)
const detailId = ref(null)
const dayForm = ref(freshDayForm())
const removing = ref(null)

watch(day, () => {
  modal.value = null
  scan.value = null
  manualForm.value = freshManualForm()
  presenceQuery.value = ''
  roomId.value = null
  detailId.value = null
  dayForm.value = freshDayForm()
  removing.value = null
})

const day1Rows = computed(() => state.checkins.filter((item) => item.day === 1 && item.status === 'Presente'))
const presentIds = computed(() => new Set(day1Rows.value.map((item) => item.personId)))
const manualCount = computed(() => day1Rows.value.filter((item) => item.method === 'Manual').length)
const expected = computed(() => state.students.filter(isAvailable))
const missing = computed(() => expected.value.filter((item) => !presentIds.value.has(item.id)).length)
const confirmed = computed(() => state.teams.filter((item) => item.status === 'confirmada').length)
const forming = computed(() => state.teams.filter((item) => item.status === 'em-montagem').length)
const withoutTeam = computed(() => expected.value.filter((item) => !state.teams.some((team) => team.members.includes(item.id) && isAvailable(item))).length)
const openTasks = computed(() => state.tasks.filter((item) => item.status !== 'Concluído').length)
const unresolved = computed(() => state.occurrences.filter((item) => item.status !== 'Resolvida'))
const presencePeople = computed(() => expected.value.filter((item) => `${item.name} ${item.turma}`.toLowerCase().includes(presenceQuery.value.trim().toLowerCase())))
const assignedChallenges = computed(() => state.challenges.filter((item) => item.teamId))
const day1Summary = computed(() => [
  { label: 'Presentes', value: dash(day1Rows.value.length) },
  { label: 'Equipes', value: dash(confirmed.value) },
  { label: 'Ocorrências', value: dash(unresolved.value.length) },
  { label: 'Pendências', value: dash(openTasks.value) },
])
const teamFormation = computed(() => [
  { label: 'Equipes confirmadas', value: dash(confirmed.value) },
  { label: 'Em formação', value: dash(forming.value) },
  { label: 'Participantes sem equipe', value: state.students.length ? withoutTeam.value : '—' },
])

const broken = computed(() => state.equipment.filter((item) => item.status === 'Com problema').length)
const room = computed(() => state.teams.find((item) => item.id === roomId.value))
const occ = computed(() => state.occurrences.find((item) => item.id === detailId.value))
const day2Summary = computed(() => [
  { label: 'Equipes em atividade', value: dash(confirmed.value) },
  { label: 'Salas em uso', value: dash(confirmed.value) },
  { label: 'Ocorrências abertas', value: dash(unresolved.value.length) },
  { label: 'Equipamentos com problema', value: dash(broken.value) },
])
const roomCards = computed(() => state.teams.map((team) => {
  const challenge = teamChallenge(state, team.id)
  const company = challenge ? companyOf(state, challenge.companyId) : null
  const problems = state.occurrences.some((item) => item.place === roomLabel(team.id) && item.status !== 'Resolvida')
  const status = problems ? 'Com ocorrência' : team.status === 'confirmada' ? 'Em atividade' : 'Aguardando início'
  return { team, challenge, company, status, paused: pausedMembers(team, state.students).length }
}))
const roomMembers = computed(() => {
  if (!room.value) return []
  return room.value.members.map((id) => state.students.find((student) => student.id === id)).filter((student) => student && isAvailable(student))
})
const roomAside = computed(() => {
  if (!room.value) return []
  return room.value.members.map((id) => state.students.find((student) => student.id === id)).filter((student) => student && !isAvailable(student))
})
const roomPlace = computed(() => (room.value ? roomLabel(room.value.id) : ''))
const roomGear = computed(() => state.equipment.filter((item) => item.place === roomPlace.value))
const roomOcc = computed(() => state.occurrences.filter((item) => item.place === roomPlace.value))
const roomChallenge = computed(() => (room.value ? teamChallenge(state, room.value.id) : null))
const roomCompany = computed(() => (roomChallenge.value ? companyOf(state, roomChallenge.value.companyId) : null))
const roomAsideText = computed(() => `Fora da operação: ${roomAside.value.map((student) => `${student.name} (${student.availability || 'Indisponível'})`).join(', ')}. O cadastro permanece no histórico.`)

const ready = computed(() => state.teams.filter((item) => item.status === 'confirmada'))
const evaluated = computed(() => state.evaluations?.length || 0)
const day3Summary = computed(() => [
  { label: 'Equipes prontas', value: dash(ready.value.length) },
  { label: 'Apresentações concluídas', value: '—' },
  { label: 'Avaliações concluídas', value: dash(evaluated.value) },
  { label: 'Ocorrências', value: dash(unresolved.value.length) },
])

function simulate(kind) {
  if (kind === 'invalid' || state.students.length === 0) {
    scan.value = { kind: 'invalid' }
    return
  }
  const pending = expected.value.find((item) => !presentIds.value.has(item.id))
  if (kind === 'used' || !pending) {
    scan.value = { kind: 'used', student: state.students.find((item) => presentIds.value.has(item.id)) || state.students[0] }
    return
  }
  scan.value = { kind: 'valid', student: pending }
}

function confirmScan() {
  const student = scan.value?.student
  if (!student) return
  update((draft) => {
    draft.checkins.push({
      id: uid('ck'), personId: student.id, personName: student.name, category: 'Participante', turma: student.turma,
      day: 1, method: 'QR Code', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      responsible: state.session?.name, status: 'Presente', note: 'Leitura demonstrativa',
    })
  })
  modal.value = null
  scan.value = null
  flash('Presença registrada.')
}

function saveManual() {
  const student = state.students.find((item) => item.id === manualForm.value.personId)
  if (!student) {
    flash('Selecione um participante.', 'err')
    return
  }
  if (presentOn(student.id, 1)) {
    flash('Já registrado neste dia.', 'err')
    return
  }
  update((draft) => {
    draft.checkins.push({
      id: uid('ck'), personId: student.id, personName: student.name, category: 'Participante', turma: student.turma,
      day: 1, method: 'Manual', time: manualForm.value.time, responsible: state.session?.name, status: 'Presente', note: `${manualForm.value.reason}. ${manualForm.value.note}`.trim(),
    })
  })
  modal.value = null
  flash('Presença registrada.')
}

function markOut(student) {
  update((draft) => {
    const current = draft.students.find((item) => item.id === student.id)
    if (current) current.availability = 'Indisponível'
  })
  flash(`${student.name} foi marcado como indisponível. A equipe não foi reorganizada.`)
}

function openProblem(place = 'Sala 01', equipmentId = '') {
  dayForm.value = { ...dayForm.value, place, equipmentId, problem: '', note: '', priority: 'Média', responsible: state.session?.name || '' }
  modal.value = 'problem'
}

function saveProblem() {
  const equip = state.equipment.find((item) => item.id === dayForm.value.equipmentId)
  if (!dayForm.value.problem.trim() && !equip) {
    flash('Informe o problema.', 'err')
    return
  }
  const problem = dayForm.value.problem
  const note = dayForm.value.note
  const equipmentId = dayForm.value.equipmentId
  update((draft) => {
    const current = draft.equipment.find((item) => item.id === equipmentId)
    if (current) {
      current.status = 'Com problema'
      current.notes = problem || note
    }
    draft.occurrences.unshift({
      id: uid('oc'),
      title: problem || `Problema em ${current?.name || 'equipamento'}`,
      category: 'Tecnologia',
      description: note,
      place: dayForm.value.place,
      priority: dayForm.value.priority,
      responsible: dayForm.value.responsible,
      status: 'Aberta',
      solution: '',
      day: 2,
      at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    })
  })
  modal.value = null
  flash('Problema registrado.')
}

function saveOccurrence() {
  if (!dayForm.value.title.trim()) {
    flash('Informe o título.', 'err')
    return
  }
  const editing = dayForm.value.id
  const record = {
    title: dayForm.value.title.trim(),
    category: dayForm.value.category,
    description: dayForm.value.description,
    place: dayForm.value.place,
    priority: dayForm.value.priority,
    responsible: dayForm.value.responsible,
    status: dayForm.value.status || 'Aberta',
  }
  update((draft) => {
    const index = editing ? draft.occurrences.findIndex((item) => item.id === editing) : -1
    if (index >= 0) draft.occurrences[index] = { ...draft.occurrences[index], ...record }
    else draft.occurrences.unshift({ id: uid('oc'), ...record, solution: '', day: 2, at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
  })
  modal.value = null
  flash(editing ? 'Alterações salvas.' : 'Ocorrência criada.')
}

function saveSolution() {
  const solution = dayForm.value.solution
  const responsible = dayForm.value.responsible
  update((draft) => {
    const current = draft.occurrences.find((item) => item.id === detailId.value)
    if (!current) return
    current.status = 'Resolvida'
    current.solution = solution
    if (responsible) current.responsible = responsible
  })
  modal.value = null
  flash('Ocorrência resolvida.')
}

function openOccurrenceFromNow() {
  dayForm.value = { ...dayForm.value, title: '', description: '', category: 'Sala', place: 'Sala 01', priority: 'Média', status: 'Aberta', responsible: state.session?.name || '' }
  modal.value = 'occ'
}

function openNewOccurrence() {
  dayForm.value = { title: '', description: '', category: 'Sala', place: 'Sala 01', priority: 'Média', status: 'Aberta', responsible: state.session?.name || '', equipmentId: '', problem: '', note: '', solution: '' }
  modal.value = 'occ'
}

function editOccurrence(item) {
  dayForm.value = { description: '', responsible: '', ...item }
  modal.value = 'occ'
}

function openSolve() {
  dayForm.value = { ...dayForm.value, solution: '', responsible: occ.value.responsible || '' }
  modal.value = 'solve'
}

function removeOccurrence() {
  const id = removing.value.id
  update((draft) => {
    draft.occurrences = draft.occurrences.filter((item) => item.id !== id)
  })
  removing.value = null
  flash('Ocorrência excluída.')
}

function teamMeta(team) {
  const challenge = teamChallenge(state, team.id)
  const company = challenge ? companyOf(state, challenge.companyId) : null
  return { challenge, company }
}
</script>

<template>
  <Page title="Modo Evento" subtitle="Acompanhe o que está acontecendo e o que precisa ser feito em cada dia.">
    <Tabs :tabs="DAY_TABS" :model-value="String(day)" @update:model-value="(value) => go(`evento?dia=${value}`)" />
    <div class="filters">
      <input v-model="query" class="input event-search" placeholder="Buscar participante, equipe ou sala" aria-label="Buscar participante, equipe ou sala" />
    </div>
    <div v-if="term" class="search-hits">
      <p v-if="hits.length === 0" class="stat-hint">Nenhum resultado para esta busca.</p>
      <article v-for="item in hits" :key="item.id" class="card search-hit"><b>{{ item.title }}</b><p>{{ item.text }}</p></article>
    </div>

    <template v-if="day === 1">
      <div class="day-strip">
        <div>
          <h2>Dia 1 — Abertura e Formação</h2>
          <p>Credenciamento, abertura, formação das equipes e distribuição dos desafios.</p>
        </div>
        <Badge>08:00 às 12:00</Badge>
      </div>
      <section class="now-block">
        <p class="kicker">Agora</p>
        <h2>Credenciamento</h2>
        <p>Registre a presença dos participantes antes da abertura.</p>
        <div class="page-actions">
          <button class="btn" type="button" @click="scan = null; modal = 'scan'">Validar ingresso</button>
          <button class="btn ghost" type="button" @click="modal = 'manual'">Registrar manualmente</button>
        </div>
      </section>
      <ol class="day-track">
        <li class="now"><span>→</span> Credenciamento</li>
        <li><span>○</span> Abertura</li>
        <li><span>○</span> Empresas e desafios</li>
        <li><span>○</span> Formação das equipes</li>
        <li><span>○</span> Distribuição dos desafios</li>
      </ol>
      <h3 class="ops-title">Resumo</h3>
      <div class="grid cols-4">
        <article v-for="item in day1Summary" :key="item.label" class="card">
          <h3>{{ item.label }}</h3>
          <div class="stat-value">{{ item.value }}</div>
        </article>
      </div>

      <h3 class="ops-title">Credenciamento</h3>
      <div class="grid cols-3">
        <article class="card"><h3>Presentes</h3><div class="stat-value">{{ dash(day1Rows.length) }}</div></article>
        <article class="card"><h3>Não registrados</h3><div class="stat-value">{{ expected.length ? missing : '—' }}</div></article>
        <article class="card"><h3>Registros manuais</h3><div class="stat-value">{{ dash(manualCount) }}</div></article>
      </div>

      <details class="more-block">
        <summary>Ver detalhes da presença</summary>
        <h3 class="ops-title">Controle de presença</h3>
        <div class="filters">
          <input v-model="presenceQuery" class="input" placeholder="Buscar" aria-label="Buscar na presença" />
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Participante</th><th>Turma</th><th>Equipe</th><th>Presença</th><th>Método</th><th></th></tr></thead>
            <tbody>
              <tr v-if="presencePeople.length === 0"><td colspan="6"><Empty title="Nenhum participante disponível para este dia." text="Quem está indisponível continua no cadastro, mas não entra na operação da equipe." /></td></tr>
              <tr v-for="student in presencePeople" :key="student.id">
                <td>{{ student.name }}</td>
                <td>{{ student.turma }}</td>
                <td>{{ teamOf(student.id) ? teamName(teamOf(student.id).id) : '—' }}</td>
                <td><Badge :tone="presentOn(student.id, 1) ? 'ok' : ''">{{ presentOn(student.id, 1) ? 'Presente' : 'Não registrado' }}</Badge></td>
                <td>{{ presentOn(student.id, 1)?.method || '—' }}</td>
                <td><div class="row-actions"><button class="btn ghost small" type="button" @click="markOut(student)">Não participará</button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <details class="more-block">
        <summary>Mais informações</summary>
        <h3 class="ops-title">Cronograma</h3>
        <ol class="day-flow"><li v-for="item in DAY1_FLOW" :key="item">{{ item }}</li></ol>

        <h3 class="ops-title">Formação das equipes</h3>
        <div class="grid cols-4">
          <article v-for="item in teamFormation" :key="item.label" class="card">
            <h3>{{ item.label }}</h3>
            <div class="stat-value">{{ item.value }}</div>
          </article>
        </div>
        <div class="page-actions"><button class="btn ghost" type="button" @click="go('equipes')">Abrir Equipes</button></div>

        <h3 class="ops-title">Empresas e desafios</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Equipe</th><th>Empresa</th><th>Desafio</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-if="assignedChallenges.length === 0"><td colspan="4"><Empty title="Nenhum desafio distribuído." /></td></tr>
              <tr v-for="item in assignedChallenges" :key="item.id">
                <td>{{ teamName(item.teamId) }}</td>
                <td>{{ companyOf(state, item.companyId)?.name || '—' }}</td>
                <td>{{ item.title }}</td>
                <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <Modal v-if="modal === 'scan'" title="Validar ingresso" subtitle="QR Code demonstrativo — sem câmera e sem leitura real." @close="modal = null">
        <div class="qr" :style="{ margin: '0 auto 12px' }" />
        <p class="stat-hint">Dia 1 · leitura simulada neste navegador.</p>
        <button v-if="!scan" class="btn" type="button" @click="simulate('ok')">Simular leitura</button>
        <div v-if="scan?.kind === 'valid'" class="banner ok">
          <div>
            <b>Ingresso válido</b>
            <p>Participante: {{ scan.student.name }}</p>
            <p>Categoria: Participante · Turma: {{ scan.student.turma }}</p>
            <p>Equipe: {{ teamOf(scan.student.id) ? teamName(teamOf(scan.student.id).id) : '—' }} · Dia 1</p>
            <button class="btn small" type="button" @click="confirmScan">Confirmar presença</button>
          </div>
        </div>
        <div v-if="scan?.kind === 'invalid'" class="banner err"><b>Ingresso inválido</b><p>Não foi possível localizar este ingresso.</p></div>
        <div v-if="scan?.kind === 'used'" class="banner warn"><b>Já registrado</b><p>{{ scan.student?.name || 'Participante' }} já possui presença no Dia 1.</p></div>
        <div class="page-actions">
          <button class="btn ghost small" type="button" @click="simulate('invalid')">Simular inválido</button>
          <button class="btn ghost small" type="button" @click="simulate('used')">Simular já registrado</button>
        </div>
        <template #footer>
          <button class="btn ghost" type="button" @click="modal = null">Fechar</button>
        </template>
      </Modal>

      <Modal v-if="modal === 'manual'" title="Registrar presença manualmente" subtitle="Mesma lista de presença do credenciamento." @close="modal = null">
        <Field label="Participante" required>
          <select v-model="manualForm.personId" class="input">
            <option value="">Selecione</option>
            <option v-for="student in expected" :key="student.id" :value="student.id">{{ student.name }} · {{ student.turma }}</option>
          </select>
        </Field>
        <Field label="Dia"><input class="input" value="Dia 1" readonly /></Field>
        <Field label="Horário"><input v-model="manualForm.time" class="input" type="time" /></Field>
        <Field label="Motivo">
          <select v-model="manualForm.reason" class="input">
            <option v-for="item in MANUAL_REASONS" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Observação"><input v-model="manualForm.note" class="input" /></Field>
        <template #footer>
          <button class="btn ghost" type="button" @click="modal = null">Cancelar</button>
          <button class="btn" type="button" @click="saveManual">Salvar</button>
        </template>
      </Modal>
    </template>

    <template v-if="day === 2">
      <div class="day-strip">
        <div>
          <h2>Dia 2 — Desenvolvimento</h2>
          <p>Acompanhe as equipes durante o desenvolvimento das soluções.</p>
        </div>
        <Badge>08:00 às 12:00</Badge>
      </div>
      <section class="now-block">
        <p class="kicker">Agora</p>
        <h2>Equipes trabalhando</h2>
        <p>Veja salas, suporte e o que precisa de atenção.</p>
        <div class="page-actions">
          <button class="btn" type="button" @click="openOccurrenceFromNow">Registrar ocorrência</button>
        </div>
      </section>
      <ol class="day-track">
        <li class="now"><span>→</span> Equipes trabalhando</li>
        <li><span>○</span> Salas</li>
        <li><span>○</span> Suporte</li>
        <li><span>○</span> Equipamentos</li>
        <li><span>○</span> Ocorrências</li>
      </ol>
      <div class="grid cols-4">
        <article v-for="item in day2Summary" :key="item.label" class="card">
          <h3>{{ item.label }}</h3>
          <div class="stat-value">{{ item.value }}</div>
        </article>
      </div>
      <h3 id="salas" class="ops-title">Andamento do dia</h3>
      <div class="grid cols-4">
        <article v-for="card in roomCards" :key="card.team.id" class="card room-card">
          <div class="row-between"><h3>{{ roomLabel(card.team.id) }}</h3><Badge :tone="toneFor(card.status)">{{ card.status }}</Badge></div>
          <p>{{ teamName(card.team.id) }}</p>
          <p>Empresa {{ card.company?.name || '—' }}</p>
          <p>Desafio {{ card.challenge?.title || '—' }}</p>
          <p v-if="card.paused" class="stat-hint">Atenção. A composição desta equipe mudou.</p>
          <button class="btn ghost small" type="button" @click="roomId = card.team.id">Ver detalhes</button>
        </article>
      </div>

      <div class="row-between">
        <h3 class="ops-title">Ocorrências</h3>
        <button class="btn" type="button" @click="openNewOccurrence">+ Nova ocorrência</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ocorrência</th><th>Local</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            <tr v-if="unresolved.length === 0"><td colspan="5"><Empty title="Nenhuma ocorrência aberta no momento." /></td></tr>
            <tr v-for="item in unresolved" :key="item.id">
              <td>{{ item.title }}</td>
              <td>{{ item.place || '—' }}</td>
              <td><Badge :tone="toneFor(item.priority)">{{ item.priority }}</Badge></td>
              <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
              <td>
                <div class="row-actions">
                  <button class="btn ghost small" type="button" @click="detailId = item.id">Visualizar</button>
                  <button class="btn ghost small" type="button" @click="editOccurrence(item)">Editar</button>
                  <button class="btn ghost small" type="button" @click="removing = item">Excluir</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Drawer v-if="room" :title="roomPlace" :subtitle="teamName(room.id)" @close="roomId = null">
        <dl class="kv">
          <dt>Equipe</dt><dd>{{ teamName(room.id) }}</dd>
          <dt>Empresa</dt><dd>{{ roomCompany?.name || '—' }}</dd>
          <dt>Desafio</dt><dd>{{ roomChallenge?.title || '—' }}</dd>
        </dl>
        <h3>Participantes</h3>
        <p v-if="roomMembers.length === 0">Nenhum participante nesta equipe.</p>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Participante</th><th>Turma</th><th>Presença</th></tr></thead>
            <tbody>
              <tr v-for="student in roomMembers" :key="student.id">
                <td>{{ student.name }}</td>
                <td>{{ student.turma }}</td>
                <td>{{ presentOn(student.id, 2) ? 'Presente' : 'Não registrado' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="roomAside.length" class="stat-hint">{{ roomAsideText }}</p>
        <h3>Equipamentos</h3>
        <Empty v-if="roomGear.length === 0" title="Nenhum equipamento relacionado." />
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Equipamento</th><th>Quantidade</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="item in roomGear" :key="item.id">
                <td>{{ item.name }}</td>
                <td>{{ item.qty }}</td>
                <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="btn ghost small" type="button" @click="openProblem(roomPlace, roomGear[0]?.id || '')">Registrar problema</button>
        <h3>Ocorrências</h3>
        <p v-if="roomOcc.length === 0">Nenhuma ocorrência registrada.</p>
        <p v-for="item in roomOcc" :key="item.id">{{ item.title }} · <Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></p>
      </Drawer>

      <Drawer v-if="occ" :title="occ.title" :subtitle="occ.place || 'Local a definir'" @close="detailId = null">
        <dl class="kv">
          <dt>Problema</dt><dd>{{ occ.description || occ.title }}</dd>
          <dt>Local</dt><dd>{{ occ.place || '—' }}</dd>
          <dt>Prioridade</dt><dd><Badge :tone="toneFor(occ.priority)">{{ occ.priority }}</Badge></dd>
          <dt>Responsável</dt><dd>{{ occ.responsible || '—' }}</dd>
          <dt>Status</dt><dd><Badge :tone="toneFor(occ.status)">{{ occ.status }}</Badge></dd>
          <dt>Solução</dt><dd>{{ occ.solution || '—' }}</dd>
        </dl>
        <template #footer>
          <button v-if="occ.status !== 'Resolvida'" class="btn" type="button" @click="openSolve">Registrar solução</button>
          <button v-else class="btn ghost" type="button" @click="detailId = null">Fechar</button>
        </template>
      </Drawer>

      <Modal v-if="modal === 'occ'" :title="dayForm.id ? 'Editar ocorrência' : 'Nova ocorrência'" @close="modal = null">
        <Field label="Título" required><input v-model="dayForm.title" class="input" /></Field>
        <Field label="Categoria">
          <select v-model="dayForm.category" class="input">
            <option v-for="item in OCC_CATEGORIES" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Descrição"><textarea v-model="dayForm.description" class="input" /></Field>
        <Field label="Local / Sala"><input v-model="dayForm.place" class="input" /></Field>
        <div class="field">
          <span>Prioridade</span>
          <div class="chips">
            <button v-for="item in PRIORITIES" :key="item" type="button" class="chip" :class="{ on: dayForm.priority === item }" @click="dayForm.priority = item">{{ item }}</button>
          </div>
        </div>
        <Field label="Responsável"><input v-model="dayForm.responsible" class="input" /></Field>
        <Field label="Status">
          <select v-model="dayForm.status" class="input">
            <option>Aberta</option>
            <option>Em atendimento</option>
          </select>
        </Field>
        <template #footer>
          <button class="btn ghost" type="button" @click="modal = null">Cancelar</button>
          <button class="btn" type="button" @click="saveOccurrence">{{ dayForm.id ? 'Salvar alterações' : 'Salvar' }}</button>
        </template>
      </Modal>
      <Modal v-if="modal === 'problem'" title="Registrar problema" subtitle="O status segue o mesmo padrão de Tecnologia." @close="modal = null">
        <Field label="Equipamento">
          <select v-model="dayForm.equipmentId" class="input">
            <option value="">Selecione, se já estiver cadastrado</option>
            <option v-for="item in state.equipment" :key="item.id" :value="item.id">{{ item.name }} · {{ item.place || '—' }}</option>
          </select>
        </Field>
        <Field label="Sala"><input v-model="dayForm.place" class="input" /></Field>
        <Field label="Problema" required><input v-model="dayForm.problem" class="input" /></Field>
        <div class="field">
          <span>Prioridade</span>
          <div class="chips">
            <button v-for="item in PRIORITIES" :key="item" type="button" class="chip" :class="{ on: dayForm.priority === item }" @click="dayForm.priority = item">{{ item }}</button>
          </div>
        </div>
        <Field label="Responsável"><input v-model="dayForm.responsible" class="input" /></Field>
        <Field label="Observação"><textarea v-model="dayForm.note" class="input" /></Field>
        <template #footer>
          <button class="btn ghost" type="button" @click="modal = null">Cancelar</button>
          <button class="btn" type="button" @click="saveProblem">Salvar</button>
        </template>
      </Modal>
      <Modal v-if="removing" title="Excluir ocorrência?" subtitle="O registro será removido deste navegador." @close="removing = null">
        <p>{{ removing.title }}</p>
        <template #footer>
          <button class="btn ghost" type="button" @click="removing = null">Cancelar</button>
          <button class="btn danger" type="button" @click="removeOccurrence">Excluir</button>
        </template>
      </Modal>
      <Modal v-if="modal === 'solve'" title="Registrar solução" @close="modal = null">
        <Field label="Solução adotada"><textarea v-model="dayForm.solution" class="input" /></Field>
        <Field label="Responsável"><input v-model="dayForm.responsible" class="input" /></Field>
        <Field label="Observação"><input v-model="dayForm.note" class="input" /></Field>
        <template #footer>
          <button class="btn ghost" type="button" @click="modal = null">Cancelar</button>
          <button class="btn" type="button" @click="saveSolution">Salvar</button>
        </template>
      </Modal>
    </template>

    <template v-if="day === 3">
      <div class="day-strip">
        <div>
          <h2>Dia 3 — Apresentações e Resultados</h2>
          <p>Acompanhe apresentações, avaliações e o encerramento.</p>
        </div>
        <Badge>08:00 às 12:00</Badge>
      </div>
      <section class="now-block">
        <p class="kicker">Agora</p>
        <h2>Apresentações</h2>
        <p>Acompanhe as equipes. Avaliações, votação e resultados ficam no encerramento.</p>
      </section>
      <ol class="day-track">
        <li class="now"><span>→</span> Apresentações</li>
        <li><span>○</span> Avaliações</li>
        <li><span>○</span> Votação</li>
        <li><span>○</span> Resultados</li>
        <li><span>○</span> Encerramento</li>
      </ol>
      <h3 class="ops-title">Resumo</h3>
      <div class="grid cols-4">
        <article v-for="item in day3Summary" :key="item.label" class="card">
          <h3>{{ item.label }}</h3>
          <div class="stat-value">{{ item.value }}</div>
        </article>
      </div>
      <h3 id="apresentacoes" class="ops-title">Apresentações</h3>
      <p class="stat-hint">A ordem oficial ainda não está definida. Horário: A definir.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Equipe</th><th>Empresa / Desafio</th><th>Apresentação</th><th>Avaliação</th></tr></thead>
          <tbody>
            <tr v-if="state.teams.length === 0"><td colspan="4"><Empty title="Nenhuma equipe relacionada." /></td></tr>
            <tr v-for="team in state.teams" :key="team.id">
              <td>{{ teamName(team.id) }}</td>
              <td>{{ teamMeta(team).company?.name || '—' }}{{ teamMeta(team).challenge ? ` · ${teamMeta(team).challenge.title}` : '' }}</td>
              <td>A definir</td>
              <td><Badge>{{ (state.evaluations || []).some((item) => item.teamId === team.id) ? 'Avaliada' : 'Aguardando' }}</Badge></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid cols-2 mt">
        <article class="card">
          <h3>Jurados</h3>
          <p>Jurados {{ dash(state.judges.length) }}</p>
          <p>Avaliações pendentes —</p>
          <button class="btn ghost small" type="button" @click="go('jurados')">Abrir jurados</button>
        </article>
        <article class="card">
          <h3>Votação do Público</h3>
          <p><Badge :tone="toneFor(state.voting.status)">{{ state.voting.status }}</Badge></p>
          <button class="btn ghost small" type="button" @click="go('votacao')">Abrir votação</button>
        </article>
        <article class="card">
          <h3>Painel de Resultados</h3>
          <p>{{ state.resultsReleased ? 'Resultados liberados' : 'Resultados ainda não liberados' }}</p>
          <button class="btn ghost small" type="button" @click="go('resultados')">Abrir resultados</button>
        </article>
        <article class="card">
          <h3>Premiação</h3>
          <p><Badge>A definir</Badge></p>
        </article>
      </div>

      <h3 class="ops-title">Cronograma</h3>
      <ol class="day-flow"><li v-for="item in DAY3_FLOW" :key="item">{{ item }}</li></ol>
      <NextStep title="Dia 3 em andamento" text="Quando as apresentações avançarem, siga para o encerramento." action="Ir para Encerramento" to="jurados" />
    </template>
  </Page>
</template>
