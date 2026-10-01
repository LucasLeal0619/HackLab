<script setup>
import { computed, ref } from 'vue'
import { canAccess } from '../access'
import { companyOf, teamChallenge, teamName, uid } from '../model'
import { useHack, go } from '../store'
import Badge from '../components/Badge.vue'
import Drawer from '../components/Drawer.vue'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'
import { toneFor } from '../components/tone.js'

const TYPES = ['Nota numérica', 'Escala', 'Conceito']

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  part: { type: String },
})

const { state, update, flash } = useHack()

function dash(value) {
  return value ? value : '—'
}

function teamLabel(team) {
  const challenge = teamChallenge(state, team.id)
  const company = challenge ? companyOf(state, challenge.companyId) : null
  return { challenge, company }
}

function doneEvals(teamId) {
  return state.evaluations.filter((item) => item.teamId === teamId && item.status === 'concluida')
}

function teamStatus(teamId) {
  const items = state.evaluations.filter((item) => item.teamId === teamId)
  if (items.some((item) => item.status === 'revisao')) return 'Em revisão'
  const active = state.judges.filter((item) => item.status !== 'Inativo')
  const done = items.filter((item) => item.status === 'concluida')
  if (!items.length) return 'Não iniciada'
  if (active.length && done.length >= active.length) return 'Concluída'
  if (!active.length && done.length) return 'Concluída'
  return 'Em andamento'
}

function voteCount(teamId) {
  return state.voting.ballots.filter((item) => item.teamId === teamId).length
}

function isInactive(item) {
  return item.active === false || item.status === 'Inativo'
}

function isDemo(item) {
  return item.demo || /demonstrativo/i.test(item.name)
}

function scaleOf(item) {
  return item.min !== '' && item.max !== '' && item.min != null && item.max != null ? `${item.min}–${item.max}` : '—'
}

function weightOf(item) {
  return item.weight === '' || item.weight == null ? '—' : item.weight
}

const tab = computed(() => (props.part === 'votacao' || props.params.aba === 'publico' ? 'publico' : 'avaliacoes'))
const showAdmin = computed(() => (props.part ? props.part === 'jurados' || props.part === 'avaliacoes' : tab.value === 'avaliacoes'))
const showJudgesBlock = computed(() => !props.part || props.part === 'jurados')
const showEvalBlock = computed(() => !props.part || props.part === 'avaliacoes')
const showVote = computed(() => props.part === 'votacao' || (!props.part && tab.value === 'publico'))
const showResults = computed(() => props.part === 'resultados')
const heading = computed(() => {
  if (props.part === 'avaliacoes') return ['Avaliações', 'Acompanhe as avaliações das equipes e dos jurados.']
  if (props.part === 'votacao') return ['Votação', 'Gerencie a votação do público.']
  if (props.part === 'resultados') return ['Resultados', 'Visualize, libere e apresente os resultados do Hackathon.']
  return ['Jurados', 'Gerencie os jurados participantes das avaliações.']
})

const modal = ref(null)
const form = ref({})
const confirmVote = ref(false)
const judgeDetail = ref(null)
const removing = ref(null)
const showVotes = ref(false)

const activeJudges = computed(() => state.judges.filter((item) => item.status !== 'Inativo'))
const finished = computed(() => state.evaluations.filter((item) => item.status === 'concluida').length)
const pendingTeams = computed(() => (activeJudges.value.length ? state.teams.filter((team) => teamStatus(team.id) !== 'Concluída').length : 0))
const company = computed(() => state.companies.find((item) => item.id === form.value.companyId))
const reps = computed(() => company.value?.reps || [])
const selectedRep = computed(() => reps.value.find((item) => item.id === form.value.repId))
const totalVotes = computed(() => state.voting.ballots.length)

function releaseResults() {
  update((draft) => { draft.resultsReleased = true })
  flash('Resultados liberados para divulgação.')
}

function saveJudge() {
  if (!selectedRep.value) return flash('Selecione um representante já associado à empresa.', 'err')
  const rep = selectedRep.value
  const owner = company.value
  const exists = state.judges.some((item) => item.id !== form.value.id && (item.repId === rep.id || (item.name === rep.name && item.companyId === owner.id)))
  if (exists) return flash('Este representante já está definido como jurado.', 'err')
  const editing = form.value.id
  const record = {
    repId: rep.id,
    name: rep.name,
    companyId: owner.id,
    companyName: owner.name,
    cargo: rep.cargo || '—',
    email: rep.email || '',
    phone: rep.phone || '',
    status: form.value.status || 'Ativo',
  }
  update((draft) => {
    const index = editing ? draft.judges.findIndex((item) => item.id === editing) : -1
    if (index >= 0) draft.judges[index] = { ...draft.judges[index], ...record }
    else draft.judges.push({ id: uid('jur'), ...record })
  })
  modal.value = null
  flash(editing ? 'Alterações salvas.' : 'Jurado adicionado.')
}

function saveCriterion() {
  if (!form.value.name?.trim()) return flash('Informe o nome do critério.', 'err')
  const editing = form.value.id
  const record = {
    name: form.value.name.trim(),
    description: form.value.description || '',
    type: form.value.type || 'Nota numérica',
    min: form.value.min ?? '',
    max: form.value.max ?? '',
    weight: form.value.weight ?? '',
    active: form.value.status !== 'Inativo',
    status: form.value.status || 'Ativo',
    demo: /demonstrativo/i.test(form.value.name),
  }
  update((draft) => {
    const index = editing ? draft.criteria.findIndex((item) => item.id === editing) : -1
    if (index >= 0) draft.criteria[index] = { ...draft.criteria[index], ...record }
    else draft.criteria.push({ id: uid('cri'), ...record, order: draft.criteria.length + 1 })
  })
  modal.value = null
  flash(editing ? 'Alterações salvas.' : 'Critério salvo.')
}

function openJudge() {
  form.value = { companyId: state.companies[0]?.id || '', repId: '', status: 'Ativo' }
  modal.value = 'juiz'
}

function openCriterion(item) {
  if (item) form.value = { ...item, status: item.active === false || item.status === 'Inativo' ? 'Inativo' : 'Ativo' }
  else form.value = { name: '', description: '', type: 'Nota numérica', min: '', max: '', weight: '', status: 'Ativo' }
  modal.value = 'criterio'
}

function editJudge(judge) {
  const owner = state.companies.find((item) => item.id === judge.companyId)
  const rep = owner?.reps?.find((item) => item.id === judge.repId) || owner?.reps?.find((item) => item.name === judge.name)
  form.value = { id: judge.id, companyId: judge.companyId, repId: rep?.id || '', status: judge.status || 'Ativo' }
  modal.value = 'juiz'
}

function judgeDone(judge) {
  return state.evaluations.filter((item) => item.judgeName === judge.name && item.status === 'concluida').length
}

function toggleCriterion(item) {
  update((draft) => {
    const current = draft.criteria.find((criterion) => criterion.id === item.id)
    current.active = !current.active
    current.status = current.active ? 'Ativo' : 'Inativo'
  })
}

function applyVote() {
  const action = confirmVote.value
  update((draft) => {
    draft.voting.status = action === 'start' ? 'Em andamento' : 'Encerrada'
  })
  confirmVote.value = false
  showVotes.value = false
  flash(action === 'start' ? 'Votação iniciada.' : 'Votação encerrada.')
}

function removeRecord() {
  const current = removing.value
  update((draft) => {
    if (current.kind === 'jurado') draft.judges = draft.judges.filter((item) => item.id !== current.id)
    if (current.kind === 'criterio') draft.criteria = draft.criteria.filter((item) => item.id !== current.id)
    if (current.kind === 'avaliacao') draft.evaluations = draft.evaluations.filter((item) => item.teamId !== current.id)
  })
  removing.value = null
  flash(current.kind === 'avaliacao' ? 'Avaliação excluída.' : 'Registro excluído.')
}
</script>

<template>
  <Page :title="heading[0]" :subtitle="heading[1]">
    <template #actions>
      <button v-if="showJudgesBlock && showAdmin" class="btn" type="button" @click="openJudge">+ Adicionar jurado</button>
      <button v-else-if="showEvalBlock && showAdmin && canAccess(state.session?.profile, 'area-jurado')" class="btn" type="button" @click="go('area-jurado')">Abrir Área do Jurado</button>
    </template>

    <template v-if="showAdmin">
      <template v-if="showJudgesBlock">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Jurado</th><th>Empresa</th><th>Avaliações</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              <tr v-if="state.judges.length === 0"><td colspan="5"><Empty title="Nenhum jurado cadastrado." text="O jurado reutiliza um representante já associado à empresa." /></td></tr>
              <tr v-for="judge in state.judges" :key="judge.id">
                <td>{{ judge.name }}</td>
                <td>{{ judge.companyName }}</td>
                <td>{{ dash(judgeDone(judge)) }}</td>
                <td><Badge :tone="toneFor(judge.status)">{{ judge.status }}</Badge></td>
                <td>
                  <div class="row-actions">
                    <button class="btn ghost small" type="button" @click="judgeDetail = judge">Visualizar</button>
                    <button class="btn ghost small" type="button" @click="editJudge(judge)">Editar</button>
                    <button class="btn ghost small" type="button" @click="removing = { kind: 'jurado', id: judge.id, name: judge.name }">Excluir</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="row-between mt">
          <div>
            <h3 class="ops-title">Critérios de Avaliação</h3>
            <p class="stat-hint">Os critérios oficiais ainda não foram definidos. Eles são configuráveis.</p>
          </div>
          <button class="btn ghost" type="button" @click="openCriterion()">+ Adicionar critério</button>
        </div>
        <Empty v-if="state.criteria.length === 0" title="Nenhum critério configurado." text="Adicione um critério quando a organização definir a avaliação. Um exemplo pode usar o nome Critério demonstrativo 01." />
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Critério</th><th>Tipo</th><th>Escala</th><th>Peso</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              <tr v-for="item in state.criteria" :key="item.id">
                <td>
                  {{ item.name }}
                  <div v-if="isDemo(item)"><Badge>Dado demonstrativo</Badge></div>
                  <div v-if="item.description"><small>{{ item.description }}</small></div>
                </td>
                <td>{{ item.type }}</td>
                <td>{{ scaleOf(item) }}</td>
                <td>{{ weightOf(item) }}</td>
                <td><Badge :tone="toneFor(isInactive(item) ? 'Inativo' : 'Ativo')">{{ isInactive(item) ? 'Inativo' : 'Ativo' }}</Badge></td>
                <td>
                  <div class="row-actions">
                    <button class="btn ghost small" type="button" @click="openCriterion(item)">Editar</button>
                    <button class="btn ghost small" type="button" @click="toggleCriterion(item)">{{ isInactive(item) ? 'Ativar' : 'Inativar' }}</button>
                    <button class="btn ghost small" type="button" @click="removing = { kind: 'criterio', id: item.id, name: item.name }">Excluir</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-if="showEvalBlock">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Equipe</th><th>Desafio</th><th>Jurados</th><th>Avaliações</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              <tr v-for="team in state.teams" :key="team.id">
                <td>{{ teamName(team.id) }}</td>
                <td>{{ teamLabel(team).challenge?.title || '—' }}</td>
                <td>{{ dash(activeJudges.length) }}</td>
                <td>{{ doneEvals(team.id).length || '—' }}</td>
                <td><Badge :tone="toneFor(teamStatus(team.id))">{{ teamStatus(team.id) }}</Badge></td>
                <td>
                  <div class="row-actions">
                    <button class="btn ghost small" type="button" @click="go(`avaliar?id=${team.id}`)">Editar</button>
                    <button class="btn ghost small" type="button" @click="removing = { kind: 'avaliacao', id: team.id, name: teamName(team.id) }">Excluir</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="state.evaluations.length === 0" class="stat-hint">Nenhuma avaliação iniciada.</p>
      </template>
    </template>

    <section v-if="showVote" class="vote-admin">
      <div class="row-between">
        <p class="stat-hint">A votação popular é independente do resultado técnico dos jurados. Os dois resultados não são somados.</p>
        <Badge :tone="toneFor(state.voting.status)">{{ state.voting.status }}</Badge>
      </div>
      <div class="page-actions">
        <button v-if="state.voting.status === 'Não iniciada'" class="btn" type="button" @click="confirmVote = 'start'">Iniciar votação</button>
        <button v-if="state.voting.status === 'Em andamento'" class="btn" type="button" @click="confirmVote = 'end'">Encerrar votação</button>
        <button v-if="state.voting.status === 'Encerrada'" class="btn" type="button" @click="showVotes = true">Visualizar resultado</button>
        <button class="btn ghost" type="button" @click="go('votacao')">Abrir Votação Pública</button>
      </div>
      <p v-if="state.voting.status !== 'Encerrada'" class="stat-hint">A tela pública não mostra votos, percentuais nem equipe mais votada enquanto a votação estiver aberta.</p>
      <div class="vote-qr">
        <div class="qr" aria-hidden="true" />
        <p class="stat-hint">QR Code demonstrativo — representação visual, sem leitura real.</p>
      </div>
      <p v-if="state.voting.status === 'Não iniciada'" class="stat-hint">A votação ainda não foi iniciada.</p>
      <div v-if="showVotes && state.voting.status === 'Encerrada'" class="mt">
        <h3 class="ops-title">Resultado da votação</h3>
        <Empty v-if="totalVotes === 0" title="Nenhum voto registrado." text="Não há dados suficientes para um resultado." />
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Equipe</th><th>Votos</th><th>Percentual</th></tr></thead>
            <tbody>
              <tr v-for="team in state.teams" :key="team.id">
                <td>{{ teamName(team.id) }}</td>
                <td>{{ voteCount(team.id) }}</td>
                <td>{{ Math.round((voteCount(team.id) / totalVotes) * 100) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section v-if="showResults" class="card">
      <p>{{ state.resultsReleased ? 'A divulgação já foi liberada.' : 'Verifique os resultados disponíveis e libere a divulgação quando estiver pronto.' }}</p>
      <div class="page-actions">
        <button class="btn" type="button" @click="go('painel')">Visualizar resultados</button>
        <button class="btn ghost" type="button" :disabled="state.resultsReleased" @click="releaseResults">Liberar resultados</button>
        <button class="btn ghost" type="button" @click="go('painel')">Abrir Painel de Resultados</button>
        <button class="btn ghost" type="button" @click="go('apresentacao')">Modo Apresentação</button>
      </div>
    </section>

    <Modal v-if="modal === 'juiz'" :title="form.id ? 'Editar jurado' : 'Adicionar jurado'" subtitle="Empresa, representante e, então, a função de jurado. O cadastro do representante não é duplicado." @close="modal = null">
      <Empty v-if="state.companies.length === 0" title="Nenhuma empresa cadastrada." text="Associe um representante à empresa antes de definir um jurado." />
      <template v-else>
        <Field label="Empresa" required>
          <select v-model="form.companyId" class="input" @change="form.repId = ''">
            <option v-for="item in state.companies" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </Field>
        <Field label="Representante" required>
          <select v-model="form.repId" class="input">
            <option value="">Selecione</option>
            <option v-for="rep in reps" :key="rep.id || rep.name" :value="rep.id">{{ rep.name }}</option>
          </select>
        </Field>
        <p v-if="reps.length === 0" class="stat-hint">Nenhum representante associado a esta empresa.</p>
        <Field label="Cargo / Função"><input class="input" :value="selectedRep?.cargo || ''" readonly placeholder="—" /></Field>
        <Field label="Status">
          <select v-model="form.status" class="input">
            <option>Ativo</option>
            <option>Inativo</option>
          </select>
        </Field>
      </template>
      <template #footer>
        <button class="btn ghost" type="button" @click="modal = null">Cancelar</button>
        <button class="btn" type="button" @click="saveJudge">{{ form.id ? 'Salvar alterações' : 'Salvar' }}</button>
      </template>
    </Modal>

    <Modal v-if="modal === 'criterio'" :title="form.id ? 'Editar critério' : 'Novo critério'" subtitle="Nenhum critério é oficial até a organização definir a avaliação." @close="modal = null">
      <Field label="Nome" required hint="Para um exemplo, use Critério demonstrativo 01."><input v-model="form.name" class="input" /></Field>
      <Field label="Descrição"><textarea v-model="form.description" class="input" /></Field>
      <div class="field">
        <span>Tipo</span>
        <div class="chips">
          <button v-for="item in TYPES" :key="item" type="button" class="chip" :class="{ on: form.type === item }" @click="form.type = item">{{ item }}</button>
        </div>
      </div>
      <div class="form-grid">
        <Field label="Nota mínima"><input v-model="form.min" class="input" /></Field>
        <Field label="Nota máxima"><input v-model="form.max" class="input" /></Field>
      </div>
      <Field label="Peso" hint="Opcional. Não define a fórmula oficial."><input v-model="form.weight" class="input" /></Field>
      <Field label="Status">
        <select v-model="form.status" class="input">
          <option>Ativo</option>
          <option>Inativo</option>
        </select>
      </Field>
      <template #footer>
        <button class="btn ghost" type="button" @click="modal = null">Cancelar</button>
        <button class="btn" type="button" @click="saveCriterion">{{ form.id ? 'Salvar alterações' : 'Salvar' }}</button>
      </template>
    </Modal>

    <Modal
      v-if="confirmVote"
      :title="confirmVote === 'start' ? 'Iniciar votação do público?' : 'Encerrar votação?'"
      :subtitle="confirmVote === 'end' ? 'Após o encerramento, novos votos não serão registrados neste protótipo.' : 'Os participantes poderão escolher uma equipe. A tela pública não mostra resultado parcial.'"
      @close="confirmVote = false"
    >
      <p>{{ confirmVote === 'start' ? 'Um voto por navegador.' : 'O resultado da votação continua separado do resultado dos jurados.' }}</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="confirmVote = false">Cancelar</button>
        <button class="btn" type="button" @click="applyVote">{{ confirmVote === 'start' ? 'Iniciar votação' : 'Encerrar votação' }}</button>
      </template>
    </Modal>

    <Modal
      v-if="removing"
      :title="removing.kind === 'avaliacao' ? 'Excluir avaliação?' : 'Excluir registro?'"
      :subtitle="removing.kind === 'avaliacao' ? 'As notas desta equipe saem deste navegador.' : 'O registro será removido deste navegador.'"
      @close="removing = null"
    >
      <p>{{ removing.name }}</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="removing = null">Cancelar</button>
        <button class="btn danger" type="button" @click="removeRecord">Excluir</button>
      </template>
    </Modal>

    <Drawer v-if="judgeDetail" :title="judgeDetail.name" :subtitle="judgeDetail.companyName" @close="judgeDetail = null">
      <p><b>Cargo / Função</b><br />{{ judgeDetail.cargo || '—' }}</p>
      <p><b>Status</b><br />{{ judgeDetail.status }}</p>
      <p><b>E-mail</b><br />{{ judgeDetail.email || '—' }}</p>
      <p><b>Telefone</b><br />{{ judgeDetail.phone || '—' }}</p>
      <p class="stat-hint">Estes dados vêm do representante da empresa e ficam fora da tabela principal.</p>
    </Drawer>
  </Page>
</template>
