<script setup>
import { computed, ref } from 'vue'
import { useHack, go } from '../store'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'

const options = [
  ['De acordo', 'acordo', 'Li e estou de acordo com o conteúdo desta ata.'],
  ['Com observação', 'obs', 'Com observação ou discordância. O campo de observação aparece nesta mesma tela.'],
  ['Ciente', 'ciente', 'Li e estou ciente do conteúdo, sem manifestação de concordância ou discordância.'],
]

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  embedded: { type: Boolean, default: false },
})

const { state, update, flash } = useHack()
const type = ref('')
const note = ref('')
const ask = ref(false)
const meeting = computed(() => state.meetings.find((item) => item.id === props.params.id))
const total = computed(() => meeting.value?.participantIds?.length || 0)
const done = computed(() => meeting.value?.ata?.manifestations?.length || 0)

function manifestLabel(value) {
  return value === 'Com observação' ? 'Com observação ou discordância' : value
}

function confirmManifest() {
  const currentType = type.value
  const currentNote = note.value
  const meetingId = meeting.value.id
  update((draft) => {
    const current = draft.meetings.find((item) => item.id === meetingId)
    current.ata.manifestations.push({
      userId: 'session',
      name: state.session?.name || 'Usuário',
      type: currentType,
      note: currentNote,
      at: new Date().toLocaleString('pt-BR'),
    })
  })
  ask.value = false
  type.value = ''
  note.value = ''
  flash('Manifestação registrada.')
}
</script>

<template>
  <Page v-if="!meeting?.ata" title="Reuniões e Pendências">
    <template #actions>
      <button class="btn ghost" type="button" @click="go('gestao?aba=reunioes')">Voltar</button>
    </template>
    <Empty title="Nenhuma ata disponível." text="Finalize a ata antes de registrar a manifestação." />
  </Page>
  <Page
    v-else
    crumbs="HackLab / Gestão / Reuniões e Pendências / Manifestação sobre a Ata"
    title="Reuniões e Pendências"
    :subtitle="`Manifestação sobre a ata · ${meeting.title}`"
  >
    <template #actions>
      <button class="btn ghost" type="button" @click="go('gestao?aba=reunioes')">Voltar</button>
    </template>
    <div class="card">
      <h3>ATA Nº {{ meeting.ata.number }}</h3>
      <p class="stat-hint">{{ total ? `${done} de ${total} manifestaram` : `${done} manifestação(ões)` }} · Numeração deste protótipo.</p>
      <p><b>Assuntos</b><br>{{ meeting.ata.discussed }}</p>
      <p><b>Decisões</b><br>{{ meeting.ata.decisions }}</p>
      <p><b>Encaminhamentos</b><br>{{ meeting.ata.forwards }}</p>
    </div>
    <div class="grid cols-3 mt">
      <button
        v-for="[id, tone, text] in options"
        :key="id"
        type="button"
        class="choice"
        :class="[tone, { on: type === id }]"
        @click="type = id"
      >
        <b>{{ manifestLabel(id) }}</b>
        <p>{{ text }}</p>
      </button>
    </div>
    <Field v-if="type === 'Com observação'" label="Observação">
      <textarea v-model="note" class="input" />
    </Field>
    <div v-if="meeting.ata.manifestations?.length" class="table-wrap mt">
      <table>
        <thead><tr><th>Participante</th><th>Manifestação</th><th>Data</th></tr></thead>
        <tbody>
          <tr v-for="(item, index) in meeting.ata.manifestations" :key="index">
            <td>{{ item.name }}</td>
            <td>{{ manifestLabel(item.type) }}</td>
            <td>{{ item.at || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="stat-hint">Este registro não é assinatura digital qualificada, assinatura GOV.BR nem certificado digital.</p>
    <button class="btn" type="button" :disabled="!type" @click="ask = true">Registrar manifestação</button>
    <Modal
      v-if="ask"
      title="Confirmar manifestação?"
      :subtitle="`Tipo selecionado: ${manifestLabel(type)}.`"
      @close="ask = false"
    >
      <p v-if="note">{{ note }}</p>
      <p v-else>A manifestação será salva neste navegador.</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="ask = false">Voltar</button>
        <button class="btn" type="button" @click="confirmManifest">Confirmar</button>
      </template>
    </Modal>
  </Page>
</template>
