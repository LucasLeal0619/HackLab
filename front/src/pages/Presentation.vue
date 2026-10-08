<script setup>
import Logo from '../components/Logo.vue'
import { usePresentation } from '@/js/pages/presentation'

const { PRESENT_STEPS, state, step, totalVotes, current, currentTeam, currentAward, goStep, teamName, go } = usePresentation()
</script>

<template>
  <div class="present">
    <div class="present-top">
      <Logo />
      <button class="btn ghost present-exit" type="button" @click="go('painel')">Sair do modo apresentação</button>
    </div>
    <div class="present-stage">
      <div v-if="current.type === 'abertura'">
        <h1>Resultados HackLab</h1>
        <p>Apresentação dos resultados do Hackathon.</p>
      </div>
      <div v-else-if="current.type === 'equipe'" class="present-block">
        <p v-if="!state.resultsReleased">Resultados ainda não divulgados</p>
        <template v-else-if="currentTeam">
          <p class="present-eyebrow">Resultados da equipe</p>
          <h1 class="present-team-name">{{ teamName(currentTeam.team.id) }}</h1>
          <p class="present-challenge">
            Desafio proposto: {{ currentTeam.challenge?.title || 'Não informado' }}
            <span v-if="currentTeam.company?.name"> · {{ currentTeam.company.name }}</span>
          </p>
          <div class="present-result-grid">
            <article class="present-result">
              <h2>Votação dos Jurados</h2>
              <p v-if="currentTeam.avg == null">Ainda não há resultado técnico registrado.</p>
              <p v-else class="present-result-value">{{ currentTeam.avg.toFixed(1) }}</p>
              <p v-if="currentTeam.avg != null" class="present-result-caption">Resultado técnico</p>
            </article>
            <article class="present-result">
              <h2>Votação do Público</h2>
              <p v-if="totalVotes === 0">Nenhum voto registrado.</p>
              <template v-else>
                <p class="present-result-value">{{ currentTeam.votes }}</p>
                <p class="present-result-caption">
                  voto(s) · {{ Math.round((currentTeam.votes / totalVotes) * 100) }}% do total
                </p>
              </template>
            </article>
          </div>
        </template>
        <p v-else>Equipe não encontrada.</p>
      </div>
      <div
        v-else-if="current.type === 'premiacao'"
        class="present-block present-award-slide"
        :class="`present-award-slide--${current.awardIndex + 1}`"
      >
        <p class="present-eyebrow">Premiação</p>
        <h1>{{ ['1º LUGAR', '2º LUGAR', '3º LUGAR'][current.awardIndex] }}</h1>
        <article class="present-award">
          <h2>{{ currentAward?.name || 'Premiação a definir' }}</h2>
          <p class="present-award-team">{{ currentAward?.team || 'Equipe a definir' }}</p>
          <p v-if="currentAward?.description">{{ currentAward.description }}</p>
          <p v-if="!currentAward">Esta colocação ainda não possui premiação cadastrada.</p>
        </article>
      </div>
      <div v-else-if="current.type === 'fim'">
        <h1>HackLab</h1>
        <p>Obrigado pela participação!</p>
      </div>
    </div>
    <div class="present-nav">
      <button class="btn ghost" type="button" :disabled="step === 0" @click="goStep(step - 1)">Anterior</button>
      <span>{{ step + 1 }} de {{ PRESENT_STEPS.length }}</span>
      <button class="btn" type="button" :disabled="step === PRESENT_STEPS.length - 1" @click="goStep(step + 1)">Próximo</button>
    </div>
  </div>
</template>
