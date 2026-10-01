<script setup>
import { computed, ref } from 'vue'
import { teamName } from '../model'
import { useHack, go } from '../store'
import Badge from '../components/Badge.vue'
import Field from '../components/Field.vue'
import Page from '../components/Page.vue'

const { state, update, flash } = useHack()

const people = computed(() => [
  ...state.students.map((student) => ({ id: student.id, name: student.name, category: 'Participante', turma: student.turma, team: state.teams.find((team) => team.status === 'confirmada' && team.members.includes(student.id)) })),
  ...state.users.filter((user) => user.status === 'Ativo').map((user) => ({ id: user.id, name: user.name, category: user.profile === 'Consultor' ? 'Consultor' : 'Organização', turma: '—', team: null })),
  ...state.judges.map((judge) => ({ id: judge.id, name: judge.name, category: 'Jurado', turma: '—', team: null })),
])

const personId = ref(people.value[0]?.id || '')
const person = computed(() => people.value.find((item) => item.id === personId.value) || { name: 'Participante demonstrativo', category: 'Participante', turma: 'Turma demonstrativa', team: null })
</script>

<template>
  <Page crumbs="HackLab / Evento / Modo Evento / Ingresso Digital" title="Ingresso Digital HackLab" subtitle="Modelo visual do ingresso — o mesmo ingresso pode ser usado nos três dias. QR Code apenas representativo.">
    <template #actions>
      <button class="btn ghost" type="button" @click="go('evento?dia=1')">Voltar</button>
      <button class="btn" type="button" @click="go('validar?dia=1')">Validar ingresso</button>
    </template>
    <Field v-if="people.length" label="Pessoa">
      <select v-model="personId" class="input">
        <option v-for="item in people" :key="item.id" :value="item.id">{{ item.name }} · {{ item.category }}</option>
      </select>
    </Field>
    <div v-else class="banner">Sem pessoas cadastradas. O modelo abaixo usa dados demonstrativos.</div>
    <div class="ticket">
      <div class="ticket-top"><b>HackLab</b><p>Ingresso de Participação</p></div>
      <div class="ticket-body">
        <Badge>{{ person.category }}</Badge>
        <p><b>{{ person.name }}</b></p>
        <p>Turma {{ person.turma || '—' }} · Equipe {{ person.team ? teamName(person.team.id) : 'A definir' }}</p>
        <p>Evento {{ state.event.name }} · {{ state.event.date || 'Data a definir' }} · {{ state.event.start }} às {{ state.event.end }}</p>
        <div class="qr" />
        <p class="stat-hint">Ingresso nº DEMO-{{ String(person.id || '001').slice(-3).toUpperCase() }} · representação visual, não é um QR Code real.</p>
      </div>
    </div>
    <div class="card mt">
      <p>Não são exibidos CPF, matrícula, telefone ou documentos. O mesmo ingresso é usado no Dia 1, Dia 2 e Dia 3. A entrada pode ser registrada por QR Code simulado ou manualmente.</p>
      <p>Tipos: Participante, Consultor, Jurado, Empresa, Organização e Público — diferenciados por texto e selo.</p>
    </div>
  </Page>
</template>
