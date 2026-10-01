<script setup>
import { ref } from 'vue'
import { teamName, uid } from '../model'
import { useHack, go } from '../store'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'

const { state, update, flash } = useHack()
const modal = ref(false)
const form = ref({ name: '', description: '', team: '', criterion: 'Resultado dos Jurados' })
const removing = ref(null)

function save() {
  if (!form.value.name.trim()) return flash('Informe o nome.', 'err')
  const editing = form.value.id
  const record = { ...form.value }
  update((draft) => {
    const index = editing ? draft.awards.findIndex((item) => item.id === editing) : -1
    if (index >= 0) draft.awards[index] = { ...draft.awards[index], ...record }
    else draft.awards.push({ id: uid('pre'), ...record })
  })
  modal.value = false
  flash(editing ? 'Alterações salvas.' : 'Premiação salva.')
}

function removeAward() {
  const id = removing.value.id
  update((draft) => {
    draft.awards = draft.awards.filter((item) => item.id !== id)
  })
  removing.value = null
  flash('Premiação excluída.')
}
</script>

<template>
  <Page crumbs="HackLab / Evento / Jurados e Votação / Premiação" title="Premiação" subtitle="Os prêmios oficiais ainda não foram definidos.">
    <template #actions>
      <button class="btn ghost" type="button" @click="go('encerramento?aba=resultados')">Voltar</button>
    </template>
    <Empty v-if="state.awards.length === 0" title="Nenhuma premiação configurada." text="A definir." />
    <div v-else class="grid cols-3">
      <article v-for="item in state.awards" :key="item.id" class="card">
        <h3>{{ item.name }}</h3>
        <p>{{ item.description || '—' }}</p>
        <p>Equipe {{ item.team || 'A definir' }}</p>
        <div class="row-actions">
          <button class="btn ghost small" type="button" @click="form = { description: '', team: '', criterion: 'Resultado dos Jurados', ...item }; modal = true">Editar</button>
          <button class="btn ghost small" type="button" @click="removing = item">Excluir</button>
        </div>
      </article>
    </div>
    <div class="page-actions mt">
      <button class="btn" type="button" @click="form = { name: '', description: '', team: '', criterion: 'Resultado dos Jurados' }; modal = true">Adicionar premiação</button>
    </div>
    <Modal v-if="removing" title="Excluir premiação?" subtitle="O registro será removido deste navegador." @close="removing = null">
      <p>{{ removing.name }}</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="removing = null">Cancelar</button>
        <button class="btn danger" type="button" @click="removeAward">Excluir</button>
      </template>
    </Modal>
    <Modal v-if="modal" :title="form.id ? 'Editar premiação' : 'Adicionar premiação'" @close="modal = false">
      <Field label="Nome" required><input v-model="form.name" class="input" /></Field>
      <Field label="Descrição"><textarea v-model="form.description" class="input" /></Field>
      <Field label="Relação">
        <select v-model="form.criterion" class="input">
          <option>Resultado dos Jurados</option>
          <option>Votação do Público</option>
        </select>
      </Field>
      <Field label="Equipe">
        <select v-model="form.team" class="input">
          <option value="">A definir</option>
          <option v-for="team in state.teams" :key="team.id">{{ teamName(team.id) }}</option>
        </select>
      </Field>
      <template #footer>
        <button class="btn ghost" type="button" @click="modal = false">Cancelar</button>
        <button class="btn" type="button" @click="save">{{ form.id ? 'Salvar alterações' : 'Salvar' }}</button>
      </template>
    </Modal>
  </Page>
</template>
