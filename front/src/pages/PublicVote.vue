<script setup>
import { computed, ref } from 'vue'
import { companyOf, teamChallenge, teamName } from '../model'
import { useHack, go } from '../store'
import Modal from '../components/Modal.vue'

const VOTE_KEY = 'hacklab.vote.cast'

const { state, update, flash } = useHack()

function teamLabel(team) {
  const challenge = teamChallenge(state, team.id)
  const company = challenge ? companyOf(state, challenge.companyId) : null
  return { challenge, company }
}

const choice = ref(null)
const ask = ref(false)
const voted = ref(localStorage.getItem(VOTE_KEY) === '1')
const open = computed(() => state.voting.status === 'Em andamento')

function confirm() {
  const teamId = choice.value
  update((draft) => { draft.voting.ballots.push({ teamId, at: new Date().toISOString() }) })
  localStorage.setItem(VOTE_KEY, '1')
  voted.value = true
  ask.value = false
  flash('Voto registrado.')
}

</script>

<template>
  <div class="vote-wrap">
    <h1>Escolha sua equipe</h1>
    <p>Selecione a equipe que deseja apoiar na votação do público.</p>
    <div v-if="state.voting.status === 'Não iniciada'" class="banner warn">A votação ainda não foi iniciada.</div>
    <div v-if="state.voting.status === 'Encerrada'" class="banner warn">A votação está encerrada.</div>
    <div v-if="voted" class="banner warn">Voto já registrado</div>
    <div class="vote-board">
      <article v-for="team in state.teams" :key="team.id" class="card vote-card">
        <h3>{{ teamName(team.id) }}</h3>
        <p>Empresa {{ teamLabel(team).company?.name || '—' }}</p>
        <p>Desafio {{ teamLabel(team).challenge?.title || '—' }}</p>
        <p>{{ (team.solution || '').trim() ? (team.solution || '').trim().slice(0, 110) : '—' }}</p>
        <button class="btn" type="button" :disabled="!open || voted" @click="choice = team.id; ask = true">Votar nesta equipe</button>
      </article>
    </div>
    <Modal v-if="ask" title="Confirmar voto?" subtitle="O voto fica registrado neste navegador." @close="ask = false">
      <p><b>Equipe selecionada</b><br />{{ teamName(choice) }}</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="ask = false">Voltar</button>
        <button class="btn" type="button" @click="confirm">Confirmar voto</button>
      </template>
    </Modal>
  </div>
</template>
