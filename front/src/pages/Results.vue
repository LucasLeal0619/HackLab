<script setup>
import { computed, ref } from 'vue'
import { companyOf, teamChallenge, teamName } from '../model'
import { useHack, go } from '../store'
import Badge from '../components/Badge.vue'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'

const { state, update, flash } = useHack()
const ask = ref(false)

function teamLabel(team) {
  const challenge = teamChallenge(state, team.id)
  const company = challenge ? companyOf(state, challenge.companyId) : null
  return { challenge, company }
}

function doneEvals(teamId) {
  return state.evaluations.filter((item) => item.teamId === teamId && item.status === 'concluida')
}

function averageOf(teamId) {
  const scores = doneEvals(teamId).flatMap((item) => Object.values(item.scores || {}).map(Number).filter((value) => !Number.isNaN(value)))
  if (!scores.length) return null
  return scores.reduce((sum, value) => sum + value, 0) / scores.length
}

function voteCount(teamId) {
  return state.voting.ballots.filter((item) => item.teamId === teamId).length
}

const rows = computed(() => state.teams.map((team) => {
  const meta = teamLabel(team)
  return { team, ...meta, avg: averageOf(team.id), votes: voteCount(team.id) }
}))
const technical = computed(() => rows.value.filter((item) => item.avg != null))
const totalVotes = computed(() => state.voting.ballots.length)
const topVotes = computed(() => Math.max(0, ...rows.value.map((item) => item.votes)))
const leaders = computed(() => rows.value.filter((item) => item.votes === topVotes.value && topVotes.value > 0))
const admin = computed(() => state.session?.profile === 'Administrador')

function release() {
  update((draft) => { draft.resultsReleased = true })
  ask.value = false
  flash('Resultados liberados.')
}
</script>

<template>
  <Page crumbs="HackLab / Evento / Painel de Resultados" title="Painel de Resultados" subtitle="Visualize os resultados liberados do Hackathon.">
    <template #actions>
      <button class="btn ghost" type="button" @click="go('encerramento?aba=resultados')">Voltar</button>
      <button :class="state.resultsReleased ? 'btn' : 'btn ghost'" type="button" @click="go('apresentacao')">Modo Apresentação</button>
    </template>
    <div class="results-stage">
      <div v-if="!state.resultsReleased" class="results-wait">
        <div class="results-mark" aria-hidden="true"><Icon name="trophy" :size="32" /></div>
        <h2>Resultados ainda não divulgados</h2>
        <p>Aguarde a liberação oficial dos resultados.</p>
        <button v-if="admin" class="btn" type="button" @click="ask = true">Liberar resultados</button>
      </div>
      <template v-else>
        <section class="results-block">
          <h2>Resultado dos Jurados</h2>
          <p class="stat-hint">Resultado técnico. Não inclui a votação do público e não aplica uma fórmula final.</p>
          <p v-if="technical.length === 0">Ainda não há resultado técnico registrado.</p>
          <div v-else class="grid cols-2">
            <article v-for="item in technical" :key="item.team.id" class="card">
              <h3>{{ teamName(item.team.id) }}</h3>
              <p>{{ item.company?.name || '—' }} · {{ item.challenge?.title || '—' }}</p>
              <p>Resultado técnico {{ item.avg.toFixed(1) }}</p>
            </article>
          </div>
        </section>
        <section class="results-block">
          <h2>Votação do Público</h2>
          <p v-if="totalVotes === 0">Nenhum voto registrado.</p>
          <div v-else class="table-wrap">
            <table>
              <thead><tr><th>Equipe</th><th>Votos</th><th>Percentual</th></tr></thead>
              <tbody>
                <tr v-for="item in rows" :key="item.team.id">
                  <td>
                    {{ teamName(item.team.id) }}
                    <Badge v-if="leaders.length === 1 && leaders[0].team.id === item.team.id" tone="orange">Mais votos</Badge>
                  </td>
                  <td>{{ item.votes }}</td>
                  <td>{{ Math.round((item.votes / totalVotes) * 100) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
    <Modal v-if="ask" title="Liberar resultados?" subtitle="O resultado dos jurados e a votação do público serão exibidos em blocos separados, sem soma automática." @close="ask = false">
      <p>O painel público não mostra notas individuais, contatos, ocorrências nem documentos.</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="ask = false">Cancelar</button>
        <button class="btn" type="button" @click="release">Liberar resultados</button>
      </template>
    </Modal>
  </Page>
</template>
