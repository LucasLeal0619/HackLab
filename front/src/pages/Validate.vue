<script setup>
import { ref } from 'vue'
import { uid } from '../model'
import { useHack, go } from '../store'
import Page from '../components/Page.vue'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const { state, update, flash } = useHack()
const day = ref(Number(props.params.dia || 1))
const result = ref(null)

function simulate(kind) {
  if (kind === 'invalid') {
    result.value = { ok: false, title: 'Ingresso inválido', text: 'Não foi possível localizar este ingresso.' }
    return
  }
  const student = state.students[0]
  if (!student) {
    result.value = { ok: false, title: 'Sem participantes', text: 'Cadastre alunos antes de simular a leitura.' }
    return
  }
  const used = state.checkins.some((item) => item.personId === student.id && item.day === day.value && item.status === 'Presente')
  if (kind === 'used' || used) {
    result.value = { ok: false, title: 'Ingresso já utilizado', text: `${student.name} já possui entrada registrada no Dia ${day.value}.` }
    return
  }
  result.value = { ok: true, title: 'Ingresso válido', text: 'Entrada liberada para o dia selecionado.', student }
}

function confirm() {
  if (!result.value?.student) return
  const student = result.value.student
  const currentDay = day.value
  update((draft) => {
    draft.checkins.push({
      id: uid('ck'),
      personId: student.id,
      personName: student.name,
      category: 'Participante',
      turma: student.turma,
      day: currentDay,
      method: 'QR Code',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      responsible: state.session?.name,
      status: 'Presente',
      note: '',
    })
  })
  flash('Check-in confirmado.')
  result.value = null
}
</script>

<template>
  <Page crumbs="HackLab / Evento / Modo Evento / Validar ingresso" title="Validar ingresso" subtitle="Simule a leitura do QR Code para confirmar a entrada do participante.">
    <template #actions>
      <button class="btn ghost" type="button" @click="go('evento?dia=1')">Voltar</button>
    </template>
    <div class="filters">
      <span>Dia</span>
      <button v-for="item in [1, 2, 3]" :key="item" type="button" class="chip" :class="{ on: day === item }" @click="day = item">Dia {{ item }}</button>
    </div>
    <div class="card" :style="{ textAlign: 'center' }">
      <div class="qr" :style="{ margin: '0 auto 12px' }" />
      <p>Posicione o QR Code para leitura. Leitura simulada — sem câmera real.</p>
      <div class="page-actions" :style="{ justifyContent: 'center' }">
        <button class="btn" type="button" @click="simulate('ok')">Simular leitura</button>
        <button class="btn ghost" type="button" @click="simulate('used')">Simular ingresso já utilizado</button>
        <button class="btn ghost" type="button" @click="simulate('invalid')">Simular ingresso inválido</button>
      </div>
    </div>
    <div v-if="result" class="banner" :class="result.ok ? 'ok' : 'warn'">
      <div>
        <b>{{ result.title }}</b>
        <p>{{ result.text }}</p>
        <button v-if="result.ok" class="btn small" type="button" @click="confirm">Confirmar check-in</button>
      </div>
    </div>
  </Page>
</template>
