<script setup>
import { computed, ref, watch } from 'vue'
import { EXPENSE_CATEGORIES, SETORES, uid } from '../model'
import { useHack, go } from '../store'
import Badge from '../components/Badge.vue'
import Drawer from '../components/Drawer.vue'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'
import { toneFor } from '../components/tone.js'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const { state, update, flash } = useHack()

const COPY = {
  'Recursos Humanos': 'Integrantes da organização, funções, responsáveis, participantes e apoio.',
  Finanças: 'Orçamento, receitas, despesas, saldo, fornecedores e comprovantes.',
  Marketing: 'Campanhas, conteúdos, materiais, canais e cronograma.',
  Tecnologia: 'Equipamentos, infraestrutura, suporte e ocorrências técnicas.',
  Produção: 'Espaços, materiais, estrutura, alimentação e logística.',
}

const SUB = {
  'Recursos Humanos': [
    { id: 'integrantes', label: 'Integrantes' },
    { id: 'funcoes', label: 'Funções' },
    { id: 'responsaveis', label: 'Responsáveis' },
  ],
  Finanças: [
    { id: 'mov', label: 'Movimentações' },
    { id: 'fornecedores', label: 'Fornecedores' },
    { id: 'comprovantes', label: 'Comprovantes' },
  ],
  Marketing: [
    { id: 'campanhas', label: 'Campanhas' },
    { id: 'conteudos', label: 'Conteúdos e Materiais' },
    { id: 'cronograma', label: 'Cronograma' },
  ],
  Tecnologia: [
    { id: 'equipamentos', label: 'Equipamentos' },
    { id: 'infra', label: 'Infraestrutura' },
    { id: 'suporte', label: 'Suporte' },
  ],
  Produção: [
    { id: 'espacos', label: 'Espaços' },
    { id: 'materiais', label: 'Materiais' },
    { id: 'operacao', label: 'Operação' },
  ],
}

const EQUIP_STATUS = ['Disponível', 'Em uso', 'Com problema', 'Em manutenção', 'Indisponível']
const ITEM_STATUS = ['Não iniciado', 'Em andamento', 'Concluído', 'Com problema']
const CHANNELS = ['Instagram', 'WhatsApp', 'E-mail', 'Site', 'Cartazes', 'Comunicação interna', 'Outros']
const EQUIP_CATEGORIES = ['Computador', 'Notebook', 'Projetor', 'Tela', 'Áudio', 'Vídeo', 'Cabo', 'Extensão', 'Rede', 'Outro']
const PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente']
const MOV_KINDS = ['Todos', 'Receitas', 'Despesas']
const CONTENT_KINDS = ['Todos', 'Conteúdos', 'Materiais']

const NEW_TITLES = {
  membro: 'Novo integrante',
  mov: 'Nova movimentação',
  fornecedor: 'Novo fornecedor',
  comprovante: 'Adicionar comprovante',
  campanha: 'Nova campanha',
  conteudo: 'Novo item',
  equip: 'Novo equipamento',
  chamado: 'Novo chamado',
  espaco: 'Novo espaço',
  material: 'Novo material',
  infra: 'Novo item',
  operacao: 'Novo item',
}

const EDIT_TITLES = {
  membro: 'Editar integrante',
  mov: 'Editar movimentação',
  fornecedor: 'Editar fornecedor',
  comprovante: 'Editar comprovante',
  campanha: 'Editar campanha',
  conteudo: 'Editar item',
  equip: 'Editar equipamento',
  chamado: 'Editar chamado',
  espaco: 'Editar espaço',
  material: 'Editar material',
  infra: 'Editar item',
  operacao: 'Editar item',
}

function brl(value) {
  if (value === '' || value == null) return '—'
  const number = Number(value)
  if (Number.isNaN(number)) return '—'
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function matches(text, query) {
  return String(text || '').toLowerCase().includes(query.trim().toLowerCase())
}

function sectorPulse(name) {
  const open = state.tasks.filter((task) => task.sector === name && task.status !== 'Concluído').length
  if (open) return { label: 'Com pendências', count: open }
  const started = {
    'Recursos Humanos': state.orgMembers.length,
    Finanças: state.incomes.length + state.expenses.length + (state.suppliers || []).length,
    Marketing: state.campaigns.length + (state.contents || []).length,
    Tecnologia: state.equipment.length + (state.infra || []).length + (state.occurrences || []).filter((item) => item.category === 'Suporte').length,
    Produção: state.spaces.length + (state.materials || []).length + (state.operations || []).length,
  }[name]
  return started ? { label: 'Em andamento', count: open } : { label: 'Não iniciado', count: 0 }
}

function leadOf(name) {
  return state.orgMembers.find((item) => item.sector === name)?.name || '—'
}

const opened = computed(() => (SETORES.includes(props.params.setor) ? props.params.setor : ''))
const sector = computed(() => opened.value || 'Recursos Humanos')
const view = ref(SUB[sector.value][0].id)
const modal = ref(null)
const form = ref({})
const query = ref('')
const status = ref('')
const kind = ref('Todos')
const detail = ref(null)
const removing = ref(null)

watch(sector, (name) => {
  view.value = SUB[name][0].id
  query.value = ''
  status.value = ''
  kind.value = 'Todos'
})

const pendencias = computed(() => state.tasks.filter((task) => task.sector === sector.value && task.status !== 'Concluído'))
const knownExpenses = computed(() => state.expenses.filter((item) => (item.actual !== '' && item.actual != null) || (item.planned !== '' && item.planned != null)))
const calls = computed(() => (state.occurrences || []).filter((item) => item.category === 'Suporte'))
const suppliers = computed(() => state.suppliers || [])
const contents = computed(() => state.contents || [])
const materials = computed(() => state.materials || [])
const receipts = computed(() => state.documents.filter((doc) => doc.category === 'Finanças'))
const infraList = computed(() => state.infra || [])
const operations = computed(() => state.operations || [])
const members = computed(() => state.orgMembers.filter((item) => matches(`${item.name} ${item.func} ${item.profile}`, query.value) && (!status.value || item.status === status.value)))
const roleMembers = computed(() => state.orgMembers.filter((item) => item.func))
const movements = computed(() => [
  ...state.incomes.map((item) => ({ ...item, tipo: 'Receita', valor: item.value })),
  ...state.expenses.map((item) => ({ ...item, tipo: 'Despesa', valor: item.actual !== '' && item.actual != null ? item.actual : item.planned })),
].filter((item) => matches(item.description, query.value) && (!status.value || item.status === status.value)))
const typed = computed(() => movements.value.filter((item) => kind.value === 'Todos' || (kind.value === 'Receitas' && item.tipo === 'Receita') || (kind.value === 'Despesas' && item.tipo === 'Despesa')))
const visibleContents = computed(() => contents.value.filter((item) => kind.value === 'Todos' || (kind.value === 'Conteúdos' && item.kind !== 'Material') || (kind.value === 'Materiais' && item.kind === 'Material')))
const schedule = computed(() => [
  ...state.campaigns.map((item) => ({ ...item, source: 'campanha' })),
  ...contents.value.map((item) => ({ ...item, source: 'conteudo' })),
].sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999'))))
const expenseChips = computed(() => EXPENSE_CATEGORIES.map((category) => {
  const total = state.expenses.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.actual || item.planned || 0), 0)
  return total ? { category, total } : null
}).filter(Boolean))
const mine = computed(() => {
  if (state.session?.sectors?.length) return state.session.sectors
  if (state.session?.profile === 'Editor' && state.session.sector) return [state.session.sector]
  return []
})
const mineSet = computed(() => new Set(mine.value.filter((name) => SETORES.includes(name))))
const primarySectors = computed(() => (mineSet.value.size ? SETORES.filter((name) => mineSet.value.has(name)) : SETORES))
const otherSectors = computed(() => (mineSet.value.size ? SETORES.filter((name) => !mineSet.value.has(name)) : []))
const modalTitle = computed(() => (form.value.id ? EDIT_TITLES : NEW_TITLES)[modal.value])

function selectSector(name) {
  go(`setores?setor=${encodeURIComponent(name)}`)
}

function open(type, seed) {
  form.value = seed
  modal.value = type
}

function save() {
  const type = modal.value
  const current = form.value
  if ((type === 'membro' || type === 'campanha' || type === 'equip' || type === 'espaco' || type === 'chamado' || type === 'material' || type === 'fornecedor' || type === 'conteudo' || type === 'comprovante' || type === 'infra' || type === 'operacao') && !String(current.name || current.title || '').trim()) {
    flash('Informe o nome para salvar.', 'err')
    return
  }
  if (type === 'mov' && !String(current.description || '').trim()) {
    flash('Informe a descrição da movimentação.', 'err')
    return
  }
  update((draft) => {
    const place = (list, record) => {
      const index = record.id ? list.findIndex((item) => item.id === record.id) : -1
      if (index >= 0) list[index] = { ...list[index], ...record }
      else list.push(record)
    }
    if (type === 'membro') place(draft.orgMembers, { ...current, id: current.id || uid('org') })
    if (type === 'mov') {
      if (current.id) {
        draft.incomes = draft.incomes.filter((item) => item.id !== current.id)
        draft.expenses = draft.expenses.filter((item) => item.id !== current.id)
      }
      const id = current.id || uid(current.kind === 'Despesa' ? 'desp' : 'rec')
      if (current.kind === 'Despesa') {
        draft.expenses.push({
          id,
          description: current.description,
          category: current.category,
          supplier: current.supplier,
          responsible: current.responsible,
          planned: current.value === '' ? '' : Number(current.value),
          actual: current.value === '' ? '' : Number(current.value),
          date: current.date,
          status: current.status,
          notes: current.notes,
        })
      } else {
        draft.incomes.push({
          id,
          description: current.description,
          category: current.category,
          origin: current.origin,
          responsible: current.responsible,
          value: current.value === '' ? '' : Number(current.value),
          date: current.date,
          status: current.status,
          notes: current.notes,
        })
      }
    }
    if (type === 'fornecedor') {
      if (!draft.suppliers) draft.suppliers = []
      place(draft.suppliers, { id: current.id || uid('forn'), name: current.name, category: current.category, contact: current.contact, status: current.status })
    }
    if (type === 'comprovante') {
      const record = {
        name: current.name,
        category: 'Finanças',
        sector: 'Finanças',
        responsible: current.responsible || '',
        description: current.description || '',
        version: current.version || '1.0',
        note: current.note || 'Comprovante demonstrativo',
        fileName: current.fileName || '',
      }
      const index = current.id ? draft.documents.findIndex((item) => item.id === current.id) : -1
      if (index >= 0) draft.documents[index] = { ...draft.documents[index], ...record }
      else draft.documents.unshift({ ...record, id: uid('doc'), date: new Date().toLocaleDateString('pt-BR'), history: [{ version: '1.0', date: new Date().toLocaleDateString('pt-BR'), responsible: current.responsible || '—', note: 'Comprovante demonstrativo' }] })
    }
    if (type === 'campanha') place(draft.campaigns, { ...current, id: current.id || uid('camp') })
    if (type === 'conteudo') {
      if (!draft.contents) draft.contents = []
      place(draft.contents, { id: current.id || uid('cont'), name: current.name, kind: current.kind, channel: current.channel, responsible: current.responsible, date: current.date, status: current.status })
    }
    if (type === 'equip') place(draft.equipment, { ...current, id: current.id || uid('eq'), qty: Number(current.qty || 1) })
    if (type === 'chamado') {
      const record = { title: current.title, category: current.category || 'Suporte', description: current.description || '', place: current.place, priority: current.priority, responsible: current.responsible, status: current.status || 'Aberta' }
      const index = current.id ? draft.occurrences.findIndex((item) => item.id === current.id) : -1
      if (index >= 0) draft.occurrences[index] = { ...draft.occurrences[index], ...record }
      else draft.occurrences.unshift({ id: uid('oc'), ...record, solution: '', day: '', at: '' })
    }
    if (type === 'espaco') place(draft.spaces, { ...current, id: current.id || uid('sp') })
    if (type === 'material') {
      if (!draft.materials) draft.materials = []
      place(draft.materials, { id: current.id || uid('mat'), name: current.name, needed: current.needed, available: current.available, status: current.status })
    }
    if (type === 'infra') {
      if (!draft.infra) draft.infra = []
      place(draft.infra, { id: current.id || uid('inf'), name: current.name, status: current.status, responsible: current.responsible || '', notes: current.notes || '' })
    }
    if (type === 'operacao') {
      if (!draft.operations) draft.operations = []
      place(draft.operations, { id: current.id || uid('op'), name: current.name, description: current.description || '', status: current.status })
    }
  })
  flash(current.id ? 'Alterações salvas.' : 'Registro salvo neste navegador.')
  modal.value = null
}

function confirmRemove() {
  if (!removing.value) return
  const target = removing.value
  update((draft) => {
    if (target.list === 'mov') {
      draft.incomes = draft.incomes.filter((item) => item.id !== target.id)
      draft.expenses = draft.expenses.filter((item) => item.id !== target.id)
      return
    }
    draft[target.list] = (draft[target.list] || []).filter((item) => item.id !== target.id)
  })
  removing.value = null
  flash('Registro excluído.')
}

function editSchedule(item) {
  const { source, ...rest } = item
  open(source, rest)
}
</script>

<template>
  <Page v-if="!opened" title="Setores" subtitle="Acompanhe as áreas responsáveis pela organização.">
    <p class="stat-hint">Cada setor mostra o status, o responsável e as pendências. Abra um setor para ver o que precisa ser feito.</p>
    <h3 v-if="mineSet.size" class="ops-title">Meus setores</h3>
    <div class="grid cols-3">
      <article v-for="name in primarySectors" :key="name" class="card">
        <h3>{{ name }}</h3>
        <p><Badge :tone="toneFor(sectorPulse(name).label)">{{ sectorPulse(name).label }}</Badge></p>
        <p>Responsável: {{ leadOf(name) }}</p>
        <p>Pendências: {{ sectorPulse(name).count || '—' }}</p>
        <button class="btn small" type="button" @click="selectSector(name)">Abrir setor</button>
      </article>
    </div>
    <template v-if="mineSet.size">
      <h3 class="ops-title">Demais setores</h3>
      <div class="grid cols-3">
        <article v-for="name in otherSectors" :key="name" class="card">
          <h3>{{ name }}</h3>
          <p><Badge :tone="toneFor(sectorPulse(name).label)">{{ sectorPulse(name).label }}</Badge></p>
          <p>Responsável: {{ leadOf(name) }}</p>
          <p>Pendências: {{ sectorPulse(name).count || '—' }}</p>
          <button class="btn small" type="button" @click="selectSector(name)">Abrir setor</button>
        </article>
      </div>
    </template>
  </Page>

  <Page v-else :crumbs="`Setores / ${sector}`" :title="sector" :subtitle="COPY[sector]">
    <template #actions>
      <button class="btn ghost" type="button" @click="go('setores')">Voltar</button>
      <button v-if="view === 'integrantes'" class="btn" @click="open('membro', { name: '', profile: 'Editor', sector: 'Recursos Humanos', func: '', status: 'Ativo', email: '' })">+ Novo integrante</button>
      <button v-else-if="view === 'mov'" class="btn" @click="open('mov', { kind: 'Receita', description: '', category: 'Outros', value: '', date: '', status: 'Pendente', supplier: '', origin: '', responsible: '', notes: '' })">+ Nova movimentação</button>
      <button v-else-if="view === 'fornecedores'" class="btn" @click="open('fornecedor', { name: '', category: 'Outros', contact: '', status: 'Ativo' })">+ Novo fornecedor</button>
      <button v-else-if="view === 'comprovantes'" class="btn" @click="open('comprovante', { name: '', description: '', note: '', fileName: '', responsible: '' })">+ Adicionar comprovante</button>
      <button v-else-if="view === 'campanhas'" class="btn" @click="open('campanha', { name: '', objective: '', audience: '', channel: 'Instagram', responsible: '', date: '', status: 'Não iniciado', description: '' })">+ Nova campanha</button>
      <button v-else-if="view === 'conteudos'" class="btn" @click="open('conteudo', { name: '', kind: 'Conteúdo', channel: 'Instagram', responsible: '', date: '', status: 'Pendente' })">+ Novo item</button>
      <button v-else-if="view === 'equipamentos'" class="btn" @click="open('equip', { name: '', category: 'Notebook', qty: 1, place: '', status: 'Disponível', notes: '' })">+ Novo equipamento</button>
      <button v-else-if="view === 'suporte'" class="btn" @click="open('chamado', { title: '', place: '', priority: 'Média', responsible: '', description: '' })">+ Novo chamado</button>
      <button v-else-if="view === 'espacos'" class="btn" @click="open('espaco', { name: '', type: 'Sala', capacity: '', purpose: '', status: 'Não iniciado', notes: '' })">+ Novo espaço</button>
      <button v-else-if="view === 'materiais'" class="btn" @click="open('material', { name: '', needed: '', available: '', status: 'A definir' })">+ Novo material</button>
      <button v-else-if="view === 'funcoes'" class="btn" @click="open('membro', { name: '', profile: 'Editor', sector: 'Recursos Humanos', func: '', status: 'Ativo', email: '' })">+ Nova função</button>
      <button v-else-if="view === 'responsaveis'" class="btn" @click="open('membro', { name: '', profile: 'Editor', sector: 'Recursos Humanos', func: '', status: 'Ativo', email: '' })">+ Novo responsável</button>
      <button v-else-if="view === 'cronograma'" class="btn" @click="open('campanha', { name: '', objective: '', audience: '', channel: 'Instagram', responsible: '', date: '', status: 'Não iniciado', description: '' })">+ Nova atividade</button>
      <button v-else-if="view === 'infra'" class="btn" @click="open('infra', { name: '', status: 'Não iniciado', responsible: '', notes: '' })">+ Novo item</button>
      <button v-else-if="view === 'operacao'" class="btn" @click="open('operacao', { name: '', description: '', status: 'Não iniciado' })">+ Novo item</button>
    </template>

    <div class="stack-nav">
      <button v-for="item in SUB[sector]" :key="item.id" type="button" :class="view === item.id ? 'on' : ''" @click="view = item.id">{{ item.label }}</button>
    </div>

    <template v-if="sector === 'Recursos Humanos' && view === 'integrantes'">
      <div class="filters">
        <input v-model="query" class="input" placeholder="Buscar" aria-label="Buscar integrante" />
        <select v-model="status" class="input" aria-label="Status">
          <option value="">Status</option>
          <option>Ativo</option>
          <option>Inativo</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Integrante</th><th>Perfil</th><th>Função</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            <tr v-if="members.length === 0"><td colspan="5"><Empty title="Nenhum integrante cadastrado." /></td></tr>
            <tr v-for="item in members" :key="item.id">
              <td>{{ item.name }}</td>
              <td>{{ item.profile }}</td>
              <td>{{ item.func || '—' }}</td>
              <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
              <td>
                <div class="row-actions">
                  <button class="btn ghost small" type="button" @click="detail = { title: item.name, lines: [['Perfil', item.profile], ['Função', item.func || '—'], ['E-mail', item.email || '—'], ['Status', item.status]] }">Visualizar</button>
                  <button class="btn ghost small" type="button" @click="open('membro', { email: '', func: '', ...item })">Editar</button>
                  <button class="btn ghost small" type="button" @click="removing = { list: 'orgMembers', id: item.id, name: item.name }">Excluir</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-else-if="sector === 'Recursos Humanos' && view === 'funcoes'" class="table-wrap">
      <table>
        <thead><tr><th>Função</th><th>Integrante</th><th>Setor</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="roleMembers.length === 0"><td colspan="4"><Empty title="Nenhuma função cadastrada." /></td></tr>
          <tr v-for="item in roleMembers" :key="item.id">
            <td>{{ item.func }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.sector || '—' }}</td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { title: item.func, lines: [['Integrante', item.name], ['Setor', item.sector || '—'], ['Perfil', item.profile], ['Status', item.status]] }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="open('membro', { email: '', ...item })">Editar</button>
                <button class="btn ghost small" type="button" @click="removing = { list: 'orgMembers', id: item.id, name: item.name }">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="sector === 'Recursos Humanos' && view === 'responsaveis'" class="table-wrap">
      <table>
        <thead><tr><th>Função / Área</th><th>Responsável</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="roleMembers.length === 0"><td colspan="3"><Empty title="Nenhum responsável definido." /></td></tr>
          <tr v-for="item in roleMembers" :key="item.id">
            <td>{{ item.func }}</td>
            <td>{{ item.name }}</td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { title: item.name, lines: [['Função', item.func], ['Setor', item.sector || '—'], ['E-mail', item.email || '—'], ['Status', item.status]] }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="open('membro', { email: '', ...item })">Editar</button>
                <button class="btn ghost small" type="button" @click="removing = { list: 'orgMembers', id: item.id, name: item.name }">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template v-else-if="sector === 'Finanças' && view === 'mov'">
      <div class="filters">
        <input v-model="query" class="input" placeholder="Buscar" aria-label="Buscar movimentação" />
        <select v-model="status" class="input" aria-label="Status">
          <option value="">Status</option>
          <option>Pendente</option>
          <option>Em andamento</option>
          <option>Concluído</option>
        </select>
        <div class="chips">
          <button v-for="item in MOV_KINDS" :key="item" type="button" :class="kind === item ? 'chip on' : 'chip'" @click="kind = item">{{ item }}</button>
        </div>
      </div>
      <div class="card">
        <h3>Distribuição das despesas</h3>
        <p v-if="knownExpenses.length === 0">Ainda não há dados suficientes para gerar esta visualização.</p>
        <div v-else class="chips">
          <span v-for="chip in expenseChips" :key="chip.category" class="chip">{{ chip.category }} · {{ brl(chip.total) }}</span>
        </div>
      </div>
      <div class="table-wrap mt">
        <table>
          <thead><tr><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            <tr v-if="typed.length === 0"><td colspan="6"><Empty title="Nenhuma movimentação financeira cadastrada." /></td></tr>
            <tr v-for="item in typed" :key="item.id">
              <td>{{ item.description }}</td>
              <td>{{ item.tipo }}</td>
              <td>{{ item.category || '—' }}</td>
              <td>{{ brl(item.valor) }}</td>
              <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
              <td>
                <div class="row-actions">
                  <button class="btn ghost small" type="button" @click="detail = { title: item.description, lines: [['Tipo', item.tipo], ['Categoria', item.category || '—'], ['Valor', brl(item.valor)], ['Fornecedor', item.supplier || '—'], ['Data', item.date || '—'], ['Status', item.status]] }">Visualizar</button>
                  <button class="btn ghost small" type="button" @click="open('mov', { supplier: item.supplier || '', origin: item.origin || '', responsible: item.responsible || '', notes: item.notes || '', ...item, kind: item.tipo, value: item.valor === '' || item.valor == null ? '' : item.valor })">Editar</button>
                  <button class="btn ghost small" type="button" @click="removing = { list: 'mov', id: item.id, name: item.description }">Excluir</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-else-if="sector === 'Finanças' && view === 'fornecedores'" class="table-wrap">
      <table>
        <thead><tr><th>Fornecedor</th><th>Categoria</th><th>Contato</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="suppliers.length === 0"><td colspan="5"><Empty title="Nenhum fornecedor cadastrado." /></td></tr>
          <tr v-for="item in suppliers" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.category }}</td>
            <td>{{ item.contact || '—' }}</td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { title: item.name, lines: [['Categoria', item.category], ['Contato', item.contact || '—'], ['Status', item.status]] }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="open('fornecedor', { contact: '', ...item })">Editar</button>
                <button class="btn ghost small" type="button" @click="removing = { list: 'suppliers', id: item.id, name: item.name }">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="sector === 'Finanças' && view === 'comprovantes'" class="table-wrap">
      <table>
        <thead><tr><th>Comprovante</th><th>Data</th><th>Arquivo</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="receipts.length === 0"><td colspan="4"><Empty title="Nenhum comprovante armazenado." text="O arquivo continua apenas demonstrativo e também aparece em Documentos." /></td></tr>
          <tr v-for="item in receipts" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.date }}</td>
            <td>{{ item.fileName || 'Upload demonstrativo' }}</td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { title: item.name, lines: [['Data', item.date || '—'], ['Arquivo', item.fileName || 'Upload demonstrativo'], ['Descrição', item.description || '—']] }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="open('comprovante', { description: '', note: '', fileName: '', responsible: '', ...item })">Editar</button>
                <button class="btn ghost small" type="button" @click="removing = { list: 'documents', id: item.id, name: item.name }">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="sector === 'Marketing' && view === 'campanhas'" class="table-wrap">
      <table>
        <thead><tr><th>Campanha</th><th>Canal</th><th>Responsável</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="state.campaigns.length === 0"><td colspan="6"><Empty title="Nenhuma campanha cadastrada." /></td></tr>
          <tr v-for="item in state.campaigns" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.channel }}</td>
            <td>{{ item.responsible || '—' }}</td>
            <td>{{ item.date || 'A definir' }}</td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { title: item.name, lines: [['Canal', item.channel], ['Objetivo', item.objective || '—'], ['Público', item.audience || '—'], ['Responsável', item.responsible || '—'], ['Data', item.date || 'A definir'], ['Status', item.status]] }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="open('campanha', { objective: '', audience: '', responsible: '', date: '', description: '', ...item })">Editar</button>
                <button class="btn ghost small" type="button" @click="removing = { list: 'campaigns', id: item.id, name: item.name }">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template v-else-if="sector === 'Marketing' && view === 'conteudos'">
      <div class="filters">
        <div class="chips">
          <button v-for="item in CONTENT_KINDS" :key="item" type="button" :class="kind === item ? 'chip on' : 'chip'" @click="kind = item">{{ item }}</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Tipo</th><th>Canal</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            <tr v-if="visibleContents.length === 0"><td colspan="5"><Empty title="Nenhum conteúdo ou material cadastrado." /></td></tr>
            <tr v-for="item in visibleContents" :key="item.id">
              <td>{{ item.name }}</td>
              <td>{{ item.kind }}</td>
              <td>{{ item.channel || '—' }}</td>
              <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
              <td>
                <div class="row-actions">
                  <button class="btn ghost small" type="button" @click="detail = { title: item.name, lines: [['Tipo', item.kind], ['Canal', item.channel || '—'], ['Responsável', item.responsible || '—'], ['Data', item.date || 'A definir'], ['Status', item.status]] }">Visualizar</button>
                  <button class="btn ghost small" type="button" @click="open('conteudo', { responsible: '', date: '', ...item })">Editar</button>
                  <button class="btn ghost small" type="button" @click="removing = { list: 'contents', id: item.id, name: item.name }">Excluir</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-else-if="sector === 'Marketing' && view === 'cronograma'" class="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>Atividade</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="state.campaigns.length + contents.length === 0"><td colspan="4"><Empty title="Nenhuma atividade no cronograma." /></td></tr>
          <tr v-for="item in schedule" :key="`${item.source}-${item.id}`">
            <td>{{ item.date || 'A definir' }}</td>
            <td>{{ item.name }}</td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { title: item.name, lines: [['Tipo', item.source === 'campanha' ? 'Campanha' : 'Conteúdo'], ['Data', item.date || 'A definir'], ['Status', item.status], ['Responsável', item.responsible || '—']] }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="editSchedule(item)">Editar</button>
                <button class="btn ghost small" type="button" @click="removing = { list: item.source === 'campanha' ? 'campaigns' : 'contents', id: item.id, name: item.name }">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="sector === 'Tecnologia' && view === 'equipamentos'" class="table-wrap">
      <table>
        <thead><tr><th>Equipamento</th><th>Categoria</th><th>Local</th><th>Qtd.</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="state.equipment.length === 0"><td colspan="6"><Empty title="Nenhum equipamento cadastrado." /></td></tr>
          <tr v-for="item in state.equipment" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.category }}</td>
            <td>{{ item.place || 'A definir' }}</td>
            <td>{{ item.qty }}</td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { title: item.name, lines: [['Categoria', item.category], ['Quantidade', item.qty], ['Local', item.place || 'A definir'], ['Status', item.status], ['Observação', item.notes || '—']] }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="open('equip', { place: '', notes: '', ...item })">Editar</button>
                <button class="btn ghost small" type="button" @click="removing = { list: 'equipment', id: item.id, name: item.name }">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="sector === 'Tecnologia' && view === 'infra'" class="table-wrap">
      <table>
        <thead><tr><th>Item</th><th>Responsável</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="infraList.length === 0"><td colspan="4"><Empty title="Nenhum item de infraestrutura cadastrado." /></td></tr>
          <tr v-for="item in infraList" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.responsible || '—' }}</td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { title: item.name, lines: [['Responsável', item.responsible || '—'], ['Status', item.status], ['Observação', item.notes || '—']] }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="open('infra', { responsible: '', notes: '', ...item })">Editar</button>
                <button class="btn ghost small" type="button" @click="removing = { list: 'infra', id: item.id, name: item.name }">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="sector === 'Tecnologia' && view === 'suporte'" class="table-wrap">
      <table>
        <thead><tr><th>Chamado</th><th>Local</th><th>Prioridade</th><th>Responsável</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="calls.length === 0"><td colspan="6"><Empty title="Nenhum chamado registrado." /></td></tr>
          <tr v-for="item in calls" :key="item.id">
            <td>{{ item.title }}</td>
            <td>{{ item.place || '—' }}</td>
            <td><Badge :tone="toneFor(item.priority)">{{ item.priority }}</Badge></td>
            <td>{{ item.responsible || '—' }}</td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { title: item.title, lines: [['Local', item.place || '—'], ['Prioridade', item.priority], ['Responsável', item.responsible || '—'], ['Status', item.status], ['Descrição', item.description || '—']] }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="open('chamado', { place: '', responsible: '', description: '', ...item })">Editar</button>
                <button class="btn ghost small" type="button" @click="removing = { list: 'occurrences', id: item.id, name: item.title }">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="sector === 'Produção' && view === 'espacos'" class="table-wrap">
      <table>
        <thead><tr><th>Espaço</th><th>Uso</th><th>Capacidade</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="state.spaces.length === 0"><td colspan="5"><Empty title="Nenhum espaço ou material cadastrado." /></td></tr>
          <tr v-for="item in state.spaces" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.purpose || item.type }}</td>
            <td>{{ item.capacity || '—' }}</td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { title: item.name, lines: [['Tipo', item.type], ['Uso', item.purpose || '—'], ['Capacidade', item.capacity || '—'], ['Status', item.status]] }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="open('espaco', { purpose: '', capacity: '', notes: '', type: item.type || 'Sala', ...item })">Editar</button>
                <button class="btn ghost small" type="button" @click="removing = { list: 'spaces', id: item.id, name: item.name }">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="sector === 'Produção' && view === 'materiais'" class="table-wrap">
      <table>
        <thead><tr><th>Material</th><th>Necessário</th><th>Disponível</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="materials.length === 0"><td colspan="5"><Empty title="Nenhum espaço ou material cadastrado." /></td></tr>
          <tr v-for="item in materials" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.needed === '' || item.needed == null ? '—' : item.needed }}</td>
            <td>{{ item.available === '' || item.available == null ? '—' : item.available }}</td>
            <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detail = { title: item.name, lines: [['Necessário', item.needed || '—'], ['Disponível', item.available || '—'], ['Status', item.status]] }">Visualizar</button>
                <button class="btn ghost small" type="button" @click="open('material', { needed: '', available: '', ...item })">Editar</button>
                <button class="btn ghost small" type="button" @click="removing = { list: 'materials', id: item.id, name: item.name }">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template v-else-if="sector === 'Produção' && view === 'operacao'">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Descrição</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            <tr v-if="operations.length === 0"><td colspan="4"><Empty title="Nenhum item de operação cadastrado." /></td></tr>
            <tr v-for="item in operations" :key="item.id">
              <td>{{ item.name }}</td>
              <td>{{ item.description || '—' }}</td>
              <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
              <td>
                <div class="row-actions">
                  <button class="btn ghost small" type="button" @click="detail = { title: item.name, lines: [['Descrição', item.description || '—'], ['Status', item.status]] }">Visualizar</button>
                  <button class="btn ghost small" type="button" @click="open('operacao', { description: '', ...item })">Editar</button>
                  <button class="btn ghost small" type="button" @click="removing = { list: 'operations', id: item.id, name: item.name }">Excluir</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="stat-hint mt">O evento permanece das 08:00 às 12:00. Horários fora desse intervalo aparecem apenas como aviso demonstrativo.</p>
    </template>

    <div class="card mt">
      <div class="row-between">
        <h3>Pendências deste setor</h3>
        <button class="btn ghost small" @click="go('pendencias')">Ver todas</button>
      </div>
      <p v-if="pendencias.length === 0">Nenhuma pendência registrada para este setor.</p>
      <p v-for="task in pendencias.slice(0, 4)" :key="task.id">{{ task.title }} · <Badge :tone="toneFor(task.status)">{{ task.status }}</Badge></p>
    </div>

    <Drawer v-if="detail" :title="detail.title" @close="detail = null">
      <dl class="kv">
        <span v-for="[label, value] in detail.lines" :key="label" style="display: contents">
          <dt>{{ label }}</dt>
          <dd>{{ value }}</dd>
        </span>
      </dl>
    </Drawer>

    <Modal v-if="modal" :title="modalTitle" subtitle="Os dados ficam salvos apenas neste navegador." @close="modal = null">
      <div v-if="modal === 'membro'" class="form-grid">
        <Field label="Nome" required><input v-model="form.name" class="input" /></Field>
        <Field label="Perfil">
          <select v-model="form.profile" class="input">
            <option>Administrador</option>
            <option>Consultor</option>
            <option>Editor</option>
          </select>
        </Field>
        <Field label="Função"><input v-model="form.func" class="input" /></Field>
        <Field label="E-mail"><input v-model="form.email" class="input" /></Field>
        <Field label="Status">
          <select v-model="form.status" class="input">
            <option>Ativo</option>
            <option>Inativo</option>
          </select>
        </Field>
      </div>
      <div v-else-if="modal === 'mov'" class="form-grid">
        <div class="field span-2">
          <span>Tipo</span>
          <div class="chips">
            <button v-for="item in ['Receita', 'Despesa']" :key="item" type="button" :class="form.kind === item ? 'chip on' : 'chip'" @click="form.kind = item">{{ item }}</button>
          </div>
        </div>
        <Field label="Descrição" required class="span-2"><input v-model="form.description" class="input" /></Field>
        <Field label="Categoria">
          <select v-model="form.category" class="input">
            <option v-for="item in EXPENSE_CATEGORIES" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Valor" hint="Deixe em branco se o valor ainda não for conhecido."><input v-model="form.value" class="input" type="number" /></Field>
        <Field v-if="form.kind === 'Despesa'" label="Fornecedor"><input v-model="form.supplier" class="input" /></Field>
        <Field v-else label="Origem"><input v-model="form.origin" class="input" /></Field>
        <Field label="Data"><input v-model="form.date" class="input" type="date" /></Field>
        <Field label="Status">
          <select v-model="form.status" class="input">
            <option>Pendente</option>
            <option>Em andamento</option>
            <option>Concluído</option>
          </select>
        </Field>
      </div>
      <div v-else-if="modal === 'fornecedor'" class="form-grid">
        <Field label="Fornecedor" required><input v-model="form.name" class="input" /></Field>
        <Field label="Categoria">
          <select v-model="form.category" class="input">
            <option v-for="item in EXPENSE_CATEGORIES" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Contato"><input v-model="form.contact" class="input" /></Field>
        <Field label="Status">
          <select v-model="form.status" class="input">
            <option>Ativo</option>
            <option>Inativo</option>
          </select>
        </Field>
      </div>
      <div v-else-if="modal === 'comprovante'" class="form-grid">
        <Field label="Nome" required><input v-model="form.name" class="input" /></Field>
        <Field label="Descrição" class="span-2"><input v-model="form.description" class="input" /></Field>
        <Field label="Arquivo demonstrativo" class="span-2" hint="Nenhum arquivo é enviado.">
          <input class="input" type="file" @change="form.fileName = $event.target.files?.[0]?.name || ''" />
        </Field>
      </div>
      <div v-else-if="modal === 'campanha'" class="form-grid">
        <Field label="Campanha" required><input v-model="form.name" class="input" /></Field>
        <Field label="Canal">
          <select v-model="form.channel" class="input">
            <option v-for="item in CHANNELS" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Responsável"><input v-model="form.responsible" class="input" /></Field>
        <Field label="Data"><input v-model="form.date" class="input" type="date" /></Field>
        <Field label="Status">
          <select v-model="form.status" class="input">
            <option>Não iniciado</option>
            <option>Em andamento</option>
            <option>Concluído</option>
          </select>
        </Field>
      </div>
      <div v-else-if="modal === 'conteudo'" class="form-grid">
        <Field label="Nome" required><input v-model="form.name" class="input" /></Field>
        <div class="field">
          <span>Tipo</span>
          <div class="chips">
            <button v-for="item in ['Conteúdo', 'Material']" :key="item" type="button" :class="form.kind === item ? 'chip on' : 'chip'" @click="form.kind = item">{{ item }}</button>
          </div>
        </div>
        <Field label="Canal"><input v-model="form.channel" class="input" /></Field>
        <Field label="Status">
          <select v-model="form.status" class="input">
            <option>Pendente</option>
            <option>Em andamento</option>
            <option>Concluído</option>
          </select>
        </Field>
      </div>
      <div v-else-if="modal === 'equip'" class="form-grid">
        <Field label="Nome" required><input v-model="form.name" class="input" /></Field>
        <Field label="Categoria">
          <select v-model="form.category" class="input">
            <option v-for="item in EQUIP_CATEGORIES" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Quantidade"><input v-model="form.qty" class="input" type="number" /></Field>
        <Field label="Local"><input v-model="form.place" class="input" /></Field>
        <Field label="Status">
          <select v-model="form.status" class="input">
            <option v-for="item in EQUIP_STATUS" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Observação" class="span-2"><textarea v-model="form.notes" class="input" /></Field>
      </div>
      <div v-else-if="modal === 'chamado'" class="form-grid">
        <Field label="Chamado" required class="span-2"><input v-model="form.title" class="input" /></Field>
        <Field label="Local"><input v-model="form.place" class="input" /></Field>
        <Field label="Responsável"><input v-model="form.responsible" class="input" /></Field>
        <div class="field span-2">
          <span>Prioridade</span>
          <div class="chips">
            <button v-for="item in PRIORITIES" :key="item" type="button" :class="form.priority === item ? 'chip on' : 'chip'" @click="form.priority = item">{{ item }}</button>
          </div>
        </div>
        <Field label="Descrição" class="span-2"><textarea v-model="form.description" class="input" /></Field>
      </div>
      <div v-else-if="modal === 'espaco'" class="form-grid">
        <Field label="Espaço" required><input v-model="form.name" class="input" /></Field>
        <Field label="Uso"><input v-model="form.purpose" class="input" /></Field>
        <Field label="Capacidade"><input v-model="form.capacity" class="input" /></Field>
        <Field label="Status">
          <select v-model="form.status" class="input">
            <option>Não iniciado</option>
            <option>Em andamento</option>
            <option>Concluído</option>
          </select>
        </Field>
      </div>
      <div v-else-if="modal === 'material'" class="form-grid">
        <Field label="Material" required><input v-model="form.name" class="input" /></Field>
        <Field label="Status">
          <select v-model="form.status" class="input">
            <option>A definir</option>
            <option>Em andamento</option>
            <option>Concluído</option>
          </select>
        </Field>
        <Field label="Necessário" hint="Deixe em branco se a quantidade ainda não for conhecida."><input v-model="form.needed" class="input" /></Field>
        <Field label="Disponível" hint="Deixe em branco se a quantidade ainda não for conhecida."><input v-model="form.available" class="input" /></Field>
      </div>
      <div v-else-if="modal === 'infra'" class="form-grid">
        <Field label="Item" required><input v-model="form.name" class="input" /></Field>
        <Field label="Responsável"><input :value="form.responsible || ''" class="input" @input="form.responsible = $event.target.value" /></Field>
        <Field label="Status">
          <select v-model="form.status" class="input">
            <option v-for="item in ITEM_STATUS" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Observação" class="span-2"><textarea :value="form.notes || ''" class="input" @input="form.notes = $event.target.value" /></Field>
      </div>
      <div v-else-if="modal === 'operacao'" class="form-grid">
        <Field label="Item" required><input v-model="form.name" class="input" /></Field>
        <Field label="Status">
          <select v-model="form.status" class="input">
            <option v-for="item in ITEM_STATUS" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Descrição" class="span-2"><textarea :value="form.description || ''" class="input" @input="form.description = $event.target.value" /></Field>
      </div>
      <template #footer>
        <button class="btn ghost" @click="modal = null">Cancelar</button>
        <button class="btn" @click="save">{{ form.id ? 'Salvar alterações' : 'Salvar' }}</button>
      </template>
    </Modal>

    <Modal v-if="removing" title="Excluir registro?" subtitle="O registro será removido deste navegador." @close="removing = null">
      <p>{{ removing.name }}</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="removing = null">Cancelar</button>
        <button class="btn danger" type="button" @click="confirmRemove">Excluir</button>
      </template>
    </Modal>
  </Page>
</template>
