<script setup>
import { computed, ref } from 'vue'
import { CHALLENGE_FLOW, companyOf, teamName, uid } from '../model'
import { go, useHack } from '../store'
import Badge from '../components/Badge.vue'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'
import Tabs from '../components/Tabs.vue'
import { toneFor } from '../components/tone.js'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const emptyCompany = {
  name: '', razao: '', cnpj: '', segmento: '', phone: '', email: '', site: '', description: '',
  tipo: 'Empresa participante', status: 'Em cadastro',
  reps: [{ name: '', cargo: '', email: '', phone: '', principal: true }],
}

const COMPANY_TABS = [
  { id: 'empresas', label: 'Empresas' },
  { id: 'desafios', label: 'Desafios' },
]
const COMPANY_STATUSES = ['Todos', 'Em cadastro', 'Confirmada', 'Aguardando desafio', 'Com desafio', 'Inativa']
const CHALLENGE_STATUSES = ['Todos', ...CHALLENGE_FLOW]
const TIPOS = ['Empresa participante', 'Parceira', 'Patrocinadora', 'Apoio', 'Outro']

const { state, update, flash } = useHack()
const tab = ref(props.params.aba === 'desafios' ? 'desafios' : 'empresas')
const query = ref('')
const status = ref('Todos')
const modal = ref(false)
const challenge = ref(null)
const removing = ref(null)

function blankCompany() {
  return { ...emptyCompany, reps: [{ name: '', cargo: '', email: '', phone: '', principal: true }] }
}

function blankChallenge() {
  return { title: '', companyId: state.companies[0]?.id || '', problem: '', objective: '', requirements: '', restrictions: '', expected: '', note: '' }
}

const form = ref(blankCompany())

function openCompany(company) {
  form.value = company
    ? { ...blankCompany(), ...company, reps: company.reps?.length ? company.reps.map((rep) => ({ ...rep })) : blankCompany().reps }
    : blankCompany()
  modal.value = true
}

function openChallenge() {
  challenge.value = blankChallenge()
}

function editChallenge(item) {
  challenge.value = { ...item, note: item.note || '' }
}

function saveCompany(event) {
  event.preventDefault()
  const current = form.value
  const rep = current.reps[0]
  if (!current.name.trim() || !rep?.name.trim()) {
    flash('Informe o nome da empresa e o representante principal.', 'err')
    return
  }
  const reps = current.reps.filter((item) => item.name.trim()).map((item, index) => ({ ...item, id: item.id || uid('rep'), principal: index === 0 }))
  update((draft) => {
    if (current.id) {
      const index = draft.companies.findIndex((item) => item.id === current.id)
      if (index >= 0) draft.companies[index] = { ...draft.companies[index], ...current, name: current.name.trim(), reps }
    } else {
      draft.companies.push({ ...current, id: uid('emp'), name: current.name.trim(), reps })
    }
  })
  modal.value = false
  form.value = blankCompany()
  flash(current.id ? 'Empresa atualizada.' : 'Empresa cadastrada.')
}

function saveChallenge(event) {
  event.preventDefault()
  const current = challenge.value
  if (!current.title.trim() || !current.companyId) {
    flash('Informe o título e a empresa.', 'err')
    return
  }
  update((draft) => {
    if (current.id) {
      const index = draft.challenges.findIndex((item) => item.id === current.id)
      if (index >= 0) {
        draft.challenges[index] = { ...draft.challenges[index], ...current, title: current.title.trim(), updatedAt: new Date().toLocaleString('pt-BR') }
      }
    } else {
      draft.challenges.push({ ...current, id: uid('des'), title: current.title.trim(), status: 'Recebido', teamId: null, updatedAt: new Date().toLocaleString('pt-BR') })
      const company = draft.companies.find((item) => item.id === current.companyId)
      if (company && company.status === 'Em cadastro') company.status = 'Aguardando desafio'
    }
  })
  challenge.value = null
  flash(current.id ? 'Desafio atualizado.' : 'Desafio recebido.')
}

function askRemoveCompany(company) {
  removing.value = {
    kind: 'empresa',
    id: company.id,
    name: company.name,
    challenges: state.challenges.filter((item) => item.companyId === company.id).length,
  }
}

function askRemoveChallenge(item) {
  removing.value = { kind: 'desafio', id: item.id, name: item.title }
}

function confirmRemove() {
  const current = removing.value
  if (!current) return
  update((draft) => {
    if (current.kind === 'empresa') {
      draft.companies = draft.companies.filter((item) => item.id !== current.id)
      draft.challenges = draft.challenges.filter((item) => item.companyId !== current.id)
      draft.judges = (draft.judges || []).filter((item) => item.companyId !== current.id)
    } else {
      const found = draft.challenges.find((item) => item.id === current.id)
      draft.challenges = draft.challenges.filter((item) => item.id !== current.id)
      const owner = found && draft.companies.find((item) => item.id === found.companyId)
      if (owner && owner.status === 'Com desafio' && !draft.challenges.some((item) => item.companyId === owner.id)) owner.status = 'Aguardando desafio'
    }
  })
  removing.value = null
  flash(current.kind === 'empresa' ? 'Empresa excluída.' : 'Desafio excluído.')
}

function onTab(value) {
  tab.value = value
  status.value = 'Todos'
  query.value = ''
  go(value === 'desafios' ? 'preparacao?aba=empresas&inner=desafios' : 'preparacao?aba=empresas')
}

const companies = computed(() => state.companies.filter((company) => company.name.toLowerCase().includes(query.value.toLowerCase()) && (status.value === 'Todos' || company.status === status.value)))
const challenges = computed(() => state.challenges.filter((item) => item.title.toLowerCase().includes(query.value.toLowerCase()) && (status.value === 'Todos' || item.status === status.value)))
const challengeStats = computed(() => [
  ['Cadastrados', state.challenges.length],
  ['Em análise', state.challenges.filter((item) => item.status === 'Em análise').length],
  ['Aprovados', state.challenges.filter((item) => item.status === 'Aprovado').length],
  ['Distribuídos', state.challenges.filter((item) => item.status === 'Distribuído').length],
])
</script>

<template>
  <Page
    :crumbs="tab === 'empresas' ? 'HackLab / Organização / Empresas e Desafios / Empresas' : 'HackLab / Organização / Empresas e Desafios / Desafios'"
    title="Empresas e Desafios"
    subtitle="Gerencie as empresas participantes e os desafios propostos para o Hackathon."
  >
    <template #actions>
      <button v-if="tab === 'empresas'" class="btn" @click="openCompany()">+ Cadastrar empresa</button>
      <button v-else class="btn" @click="openChallenge()">+ Cadastrar desafio</button>
    </template>
    <Tabs :tabs="COMPANY_TABS" :model-value="tab" @update:model-value="onTab" />
    <template v-if="tab === 'empresas'">
      <div class="grid cols-3">
        <article class="card stat"><div class="stat-label">Empresas cadastradas</div><div class="stat-value">{{ state.companies.length || '—' }}</div></article>
        <article class="card stat"><div class="stat-label">Representantes</div><div class="stat-value">{{ state.companies.reduce((sum, company) => sum + company.reps.length, 0) || '—' }}</div></article>
        <article class="card stat"><div class="stat-label">Com desafios</div><div class="stat-value">{{ state.companies.filter((company) => state.challenges.some((item) => item.companyId === company.id)).length || '—' }}</div></article>
      </div>
      <div class="filters mt">
        <input v-model="query" class="input" placeholder="Buscar empresa" />
        <select v-model="status" class="input">
          <option v-for="item in COMPANY_STATUSES" :key="item">{{ item }}</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Empresa</th><th>Representante</th><th>Desafios</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            <template v-if="state.companies.length === 0">
              <tr>
                <td colspan="5">
                  <Empty title="Nenhuma empresa cadastrada" text="Cadastre uma empresa para registrar o representante e os desafios.">
                    <template #action>
                      <button class="btn" @click="openCompany()">+ Cadastrar empresa</button>
                    </template>
                  </Empty>
                </td>
              </tr>
            </template>
            <template v-else-if="companies.length === 0">
              <tr><td colspan="5"><Empty title="Nenhuma empresa encontrada" text="Ajuste a busca ou o filtro de status." /></td></tr>
            </template>
            <template v-else>
              <tr v-for="company in companies" :key="company.id">
                <td>{{ company.name }}</td>
                <td>{{ company.reps.find((rep) => rep.principal)?.name || company.reps[0]?.name || '—' }}</td>
                <td>{{ state.challenges.filter((item) => item.companyId === company.id).length || '—' }}</td>
                <td><Badge :tone="toneFor(company.status)">{{ company.status }}</Badge></td>
                <td>
                  <div class="row-actions">
                    <button class="btn ghost small" @click="go(`empresa?id=${company.id}`)">Visualizar</button>
                    <button class="btn ghost small" @click="openCompany(company)">Editar</button>
                    <button class="btn ghost small" @click="askRemoveCompany(company)">Excluir</button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>
    <template v-else>
      <div class="grid cols-4">
        <article v-for="[label, count] in challengeStats" :key="label" class="card stat"><div class="stat-label">{{ label }}</div><div class="stat-value">{{ count || '—' }}</div></article>
      </div>
      <div class="filters mt">
        <input v-model="query" class="input" placeholder="Buscar desafio" />
        <select v-model="status" class="input">
          <option v-for="item in CHALLENGE_STATUSES" :key="item">{{ item }}</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Desafio</th><th>Empresa</th><th>Equipe</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            <template v-if="state.challenges.length === 0">
              <tr>
                <td colspan="5">
                  <Empty title="Nenhum desafio cadastrado" text="Cadastre um desafio proposto por uma empresa.">
                    <template #action>
                      <button class="btn" @click="openChallenge()">+ Cadastrar desafio</button>
                    </template>
                  </Empty>
                </td>
              </tr>
            </template>
            <template v-else-if="challenges.length === 0">
              <tr><td colspan="5"><Empty title="Nenhum desafio encontrado" text="Ajuste a busca ou o filtro de status." /></td></tr>
            </template>
            <template v-else>
              <tr v-for="item in challenges" :key="item.id">
                <td>{{ item.title }}</td>
                <td>{{ companyOf(state, item.companyId)?.name || '—' }}</td>
                <td>{{ item.teamId ? teamName(item.teamId) : '—' }}</td>
                <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
                <td>
                  <div class="row-actions">
                    <button class="btn ghost small" @click="go(`desafio?id=${item.id}`)">Visualizar</button>
                    <button class="btn ghost small" @click="editChallenge(item)">Editar</button>
                    <button class="btn ghost small" @click="askRemoveChallenge(item)">Excluir</button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p class="stat-hint">Recebido → Em análise → Aprovado → Distribuído → Em desenvolvimento → Finalizado. <button class="linkish" @click="go('distribuicao')">Ver distribuição</button></p>
    </template>

    <Modal v-if="modal" wide :title="form.id ? 'Editar empresa' : 'Cadastrar empresa'" subtitle="Empresa, representante e participação." @close="modal = false">
      <h3>Empresa</h3>
      <div class="form-grid">
        <Field label="Nome da empresa" required><input v-model="form.name" class="input" /></Field>
        <Field label="Segmento"><input v-model="form.segmento" class="input" /></Field>
        <Field label="Descrição" class-name="span-2"><textarea v-model="form.description" class="input" /></Field>
      </div>
      <h3>Representante</h3>
      <div class="form-grid">
        <Field label="Nome" required><input v-model="form.reps[0].name" class="input" /></Field>
        <Field label="Cargo"><input v-model="form.reps[0].cargo" class="input" /></Field>
        <Field label="E-mail" hint="Opcional"><input v-model="form.reps[0].email" class="input" /></Field>
      </div>
      <h3>Participação</h3>
      <Field label="Tipo de participação">
        <select v-model="form.tipo" class="input">
          <option v-for="item in TIPOS" :key="item">{{ item }}</option>
        </select>
      </Field>
      <template #footer>
        <button class="btn ghost" @click="modal = false">Cancelar</button>
        <button class="btn" @click="saveCompany">{{ form.id ? 'Salvar alterações' : 'Cadastrar empresa' }}</button>
      </template>
    </Modal>

    <Modal v-if="challenge" wide :title="challenge.id ? 'Editar desafio' : 'Cadastrar desafio'" @close="challenge = null">
      <h3>Informações principais</h3>
      <Field label="Título" required><input v-model="challenge.title" class="input" /></Field>
      <Field label="Empresa" required>
        <select v-model="challenge.companyId" class="input">
          <option value="">Selecione</option>
          <option v-for="company in state.companies" :key="company.id" :value="company.id">{{ company.name }}</option>
        </select>
      </Field>
      <Field label="Problema"><textarea v-model="challenge.problem" class="input" /></Field>
      <Field label="Objetivo"><textarea v-model="challenge.objective" class="input" /></Field>
      <h3>Detalhamento</h3>
      <Field label="Requisitos"><textarea v-model="challenge.requirements" class="input" /></Field>
      <Field label="Restrições"><textarea v-model="challenge.restrictions" class="input" /></Field>
      <Field label="Resultado esperado"><textarea v-model="challenge.expected" class="input" /></Field>
      <Field label="Observações"><textarea v-model="challenge.note" class="input" /></Field>
      <template #footer>
        <button class="btn ghost" @click="challenge = null">Cancelar</button>
        <button class="btn" @click="saveChallenge">{{ challenge.id ? 'Salvar alterações' : 'Salvar desafio' }}</button>
      </template>
    </Modal>

    <Modal
      v-if="removing"
      :title="removing.kind === 'empresa' ? 'Excluir empresa?' : 'Excluir desafio?'"
      :subtitle="removing.kind === 'empresa' && removing.challenges ? 'Os desafios desta empresa também serão removidos deste navegador.' : 'O cadastro será removido deste navegador.'"
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
