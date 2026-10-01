<script setup>
import { companyOf, teamChallenge, teamName } from '../model'
import { useHack, go } from '../store'
import Badge from '../components/Badge.vue'
import Page from '../components/Page.vue'
import { toneFor } from '../components/tone.js'

const { state, update, flash } = useHack()

function teamLabel(team) {
  const challenge = teamChallenge(state, team.id)
  const company = challenge ? companyOf(state, challenge.companyId) : null
  return { challenge, company }
}

function teamStatus(teamId) {
  const items = state.evaluations.filter((item) => item.teamId === teamId)
  if (items.some((item) => item.status === 'revisao')) return 'Em revisão'
  const activeJudges = state.judges.filter((item) => item.status !== 'Inativo')
  const done = items.filter((item) => item.status === 'concluida')
  if (!items.length) return 'Não iniciada'
  if (activeJudges.length && done.length >= activeJudges.length) return 'Concluída'
  if (!activeJudges.length && done.length) return 'Concluída'
  return 'Em andamento'
}

</script>

<template>
  <Page title="Equipes disponíveis" subtitle="Escolha a equipe que você vai avaliar.">
    <div class="grid cols-2">
      <article v-for="team in state.teams" :key="team.id" class="card">
        <h3>{{ teamName(team.id) }}</h3>
        <p>{{ teamLabel(team).company?.name || '—' }} · {{ teamLabel(team).challenge?.title || '—' }}</p>
        <Badge :tone="toneFor(teamStatus(team.id))">{{ teamStatus(team.id) }}</Badge>
        <div><button class="btn small" type="button" @click="go(`avaliar?id=${team.id}`)">Avaliar equipe</button></div>
      </article>
    </div>
  </Page>
</template>
