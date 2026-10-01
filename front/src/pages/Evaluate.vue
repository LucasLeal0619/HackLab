<script setup>
import { computed, ref } from 'vue'
import { companyOf, teamChallenge, teamName, uid } from '../model'
import { useHack, go } from '../store'
import Badge from '../components/Badge.vue'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const { state, update, flash } = useHack()

function teamLabel(team) {
  const challenge = teamChallenge(state, team.id)
  const company = challenge ? companyOf(state, challenge.companyId) : null
  return { challenge, company }
}

function isDemo(item) {
  return item.demo || /demonstrativo/i.test(item.name)
}

const team = computed(() => state.teams.find((item) => item.id === Number(props.params.id || 1)) || state.teams[0])
const meta = computed(() => (team.value ? teamLabel(team.value) : { challenge: null, company: null }))
const criteria = computed(() => state.criteria.filter((item) => item.active !== false && item.status !== 'Inativo'))
const judgeName = computed(() => state.session?.name || 'Jurado')
const existing = computed(() => (team.value ? state.evaluations.find((item) => item.teamId === team.value.id && item.judgeName === judgeName.value) : null))

const initialExisting = team.value
  ? state.evaluations.find((item) => item.teamId === team.value.id && item.judgeName === (state.session?.name || 'Jurado'))
  : null
const scores = ref({ ...(initialExisting?.scores || {}) })
const notes = ref(initialExisting?.notes || '')
const ask = ref(false)
const correct = ref(false)
const reason = ref('')
const locked = computed(() => existing.value?.status === 'concluida')
const filled = computed(() => criteria.value.filter((item) => scores.value[item.id] !== undefined && scores.value[item.id] !== '').length)

function setScore(id, value) {
  scores.value = { ...scores.value, [id]: value }
}

function persist(status) {
  if (status === 'concluida' && criteria.value.length && criteria.value.some((item) => scores.value[item.id] === undefined || scores.value[item.id] === '')) {
    flash('Preencha os critérios antes de finalizar.', 'err')
    ask.value = false
    return
  }
  const currentTeam = team.value
  const name = judgeName.value
  const payloadScores = scores.value
  const payloadNotes = notes.value
  update((draft) => {
    const current = draft.evaluations.find((item) => item.teamId === currentTeam.id && item.judgeName === name)
    const payload = { id: current?.id || uid('av'), teamId: currentTeam.id, judgeName: name, scores: { ...payloadScores }, notes: payloadNotes, status, at: new Date().toLocaleString('pt-BR') }
    if (current) Object.assign(current, payload)
    else draft.evaluations.push(payload)
    if (status === 'concluida') draft.audit.unshift({ id: uid('aud'), action: 'Avaliação finalizada', at: payload.at, detail: `${name} · ${teamName(currentTeam.id)}` })
  })
  ask.value = false
  flash(status === 'concluida' ? 'Avaliação registrada.' : 'Rascunho salvo.')
}

function applyCorrection() {
  if (!reason.value.trim()) return flash('Informe o motivo da correção.', 'err')
  const currentTeam = team.value
  const name = judgeName.value
  const text = reason.value.trim()
  update((draft) => {
    const current = draft.evaluations.find((item) => item.teamId === currentTeam.id && item.judgeName === name)
    if (current) {
      current.status = 'revisao'
      current.correction = text
    }
    draft.audit.unshift({ id: uid('aud'), action: 'Correção administrativa', at: new Date().toLocaleString('pt-BR'), detail: `${teamName(currentTeam.id)} · ${text}` })
  })
  correct.value = false
  reason.value = ''
  flash('Correção registrada.')
}
</script>

<template>
  <Page v-if="team" :crumbs="`Área do Jurado / ${teamName(team.id)}`" :title="`Avaliar ${teamName(team.id)}`" subtitle="Preencha os critérios e finalize a avaliação.">
    <template #actions>
      <button class="btn ghost" type="button" @click="go('area-jurado')">Voltar às equipes</button>
    </template>
    <div class="eval-head">
      <div>
        <p><b>Equipe</b> {{ teamName(team.id) }}</p>
        <p><b>Empresa</b> {{ meta.company?.name || '—' }}</p>
        <p><b>Desafio</b> {{ meta.challenge?.title || '—' }}</p>
      </div>
      <div>
        <Badge v-if="locked" tone="ok">Concluída</Badge>
        <Badge v-else-if="existing?.status === 'revisao'" tone="warn">Em revisão</Badge>
        <Badge v-else-if="existing" tone="warn">Em andamento</Badge>
        <Badge v-else>Não iniciada</Badge>
        <p v-if="criteria.length" class="eval-progress">{{ filled }} de {{ criteria.length }} critérios preenchidos</p>
      </div>
    </div>
    <article class="card">
      <h3>Solução apresentada</h3>
      <p>{{ team.solution || 'Resumo ainda não informado pela equipe.' }}</p>
    </article>
    <h3 class="ops-title">Critérios</h3>
    <Empty v-if="criteria.length === 0" title="Nenhum critério configurado." text="Configure os critérios em Jurados e Votação antes de avaliar." />
    <div v-for="item in criteria" :key="item.id" class="eval-row">
      <div>
        <b>{{ item.name }}</b>
        <Badge v-if="isDemo(item)">Dado demonstrativo</Badge>
        <p>{{ item.description || 'Sem descrição.' }}</p>
      </div>
      <Field :label="item.min !== '' && item.max !== '' ? `Avaliação (${item.min} a ${item.max})` : 'Avaliação'">
        <input class="input" type="number" :min="item.min === '' ? undefined : item.min" :max="item.max === '' ? undefined : item.max" :value="scores[item.id] ?? ''" :disabled="locked" @input="setScore(item.id, $event.target.value)" />
      </Field>
      <span class="stat-hint">{{ scores[item.id] !== undefined && scores[item.id] !== '' ? 'Preenchido' : 'Pendente' }}</span>
    </div>
    <Field label="Observações"><textarea v-model="notes" class="input" :disabled="locked" /></Field>
    <div v-if="locked" class="page-actions">
      <button class="btn ghost" type="button" @click="correct = true">Corrigir avaliação</button>
    </div>
    <div v-else class="page-actions">
      <button class="btn ghost" type="button" :disabled="!criteria.length" @click="persist('rascunho')">Salvar rascunho</button>
      <button class="btn" type="button" :disabled="!criteria.length" @click="ask = true">Finalizar avaliação</button>
    </div>
    <Modal v-if="ask" title="Finalizar avaliação?" subtitle="Revise as informações antes de finalizar a avaliação." @close="ask = false">
      <p>{{ teamName(team.id) }} · {{ filled }} de {{ criteria.length || '—' }} critérios preenchidos</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="ask = false">Continuar avaliando</button>
        <button class="btn" type="button" @click="persist('concluida')">Finalizar</button>
      </template>
    </Modal>
    <Modal v-if="correct" title="Corrigir avaliação" subtitle="A correção administrativa registra o motivo e reabre a avaliação em revisão." @close="correct = false">
      <Field label="Motivo da correção" required><textarea v-model="reason" class="input" /></Field>
      <template #footer>
        <button class="btn ghost" type="button" @click="correct = false">Cancelar</button>
        <button class="btn" type="button" @click="applyCorrection">Salvar</button>
      </template>
    </Modal>
  </Page>
</template>
