<script setup>
import { computed, ref } from 'vue'
import { companyOf, teamChallenge, teamName } from '../model'
import { useHack } from '../store'
import Modal from '../components/Modal.vue'

// Sem sessão (link público), o voto único é controlado neste navegador.
const VOTE_KEY = 'hacklab.vote.cast'

const { state, update } = useHack()

function teamLabel(team) {
  const challenge = teamChallenge(state, team.id)
  const company = challenge ? companyOf(state, challenge.companyId) : null
  return { challenge, company }
}

const choice = ref(null)
const localVote = ref(localStorage.getItem(VOTE_KEY) === '1')
const voter = computed(() => state.session?.email || '')
const voted = computed(() => (voter.value ? state.voting.ballots.some((item) => item.voter === voter.value) : localVote.value))
const open = computed(() => state.voting.status === 'Em andamento')

function confirm() {
  const teamId = choice.value
  const who = voter.value
  update((draft) => { draft.voting.ballots.push({ teamId, voter: who, at: new Date().toISOString() }) })
  if (!who) {
    localStorage.setItem(VOTE_KEY, '1')
    localVote.value = true
  }
  choice.value = null
}
</script>

<template>
  <section class="vote-wrap">
    <header class="vote-head">
      <h1>Votação do Público</h1>
      <p>Escolha a solução que deseja apoiar.</p>
    </header>

    <div v-if="voted" class="vote-done" role="status">
      <span class="vote-check" aria-hidden="true">✓</span>
      <h2>Voto registrado</h2>
      <p>Obrigado pela participação.</p>
    </div>

    <template v-else>
      <div v-if="state.voting.status === 'Não iniciada'" class="banner warn">A votação ainda não foi iniciada. Volte quando a organização abrir a votação.</div>
      <div v-else-if="state.voting.status === 'Encerrada'" class="banner warn">A votação está encerrada.</div>
      <p v-if="state.teams.length === 0" class="banner">Nenhuma equipe disponível para votação.</p>
      <ul class="vote-board">
        <li v-for="team in state.teams" :key="team.id" class="card vote-card">
          <h2>{{ teamName(team.id) }}</h2>
          <dl>
            <dt>Empresa</dt><dd>{{ teamLabel(team).company?.name || 'A definir' }}</dd>
            <dt>Desafio</dt><dd>{{ teamLabel(team).challenge?.title || 'A definir' }}</dd>
          </dl>
          <p class="vote-summary">{{ (team.solution || '').trim() || 'Resumo da solução ainda não informado.' }}</p>
          <button class="btn vote-btn" type="button" :disabled="!open" @click="choice = team.id">Votar nesta equipe</button>
        </li>
      </ul>
    </template>

    <Modal v-if="choice" title="Confirmar voto" subtitle="Depois de confirmado, o voto não pode ser alterado." @close="choice = null">
      <p class="vote-confirm">{{ teamName(choice) }}</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="choice = null">Voltar</button>
        <button class="btn" type="button" @click="confirm">Confirmar voto</button>
      </template>
    </Modal>
  </section>
</template>
