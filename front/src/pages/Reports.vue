<script setup>
import { onUnmounted, reactive, ref } from 'vue'
import { REPORT_MODELS, generateReport } from '../reports'
import { useHack } from '../store'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'

const { state, flash } = useHack()
const busy = reactive({})
const ready = reactive({})
const preview = ref(null)

function save(result) {
  const link = document.createElement('a')
  link.href = result.url
  link.download = result.fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function build(id, mode) {
  busy[id] = mode
  try {
    const result = await generateReport(id, state)
    if (ready[id]) URL.revokeObjectURL(ready[id].url)
    ready[id] = { ...result, url: URL.createObjectURL(result.blob) }
    return ready[id]
  } catch (error) {
    console.error(error)
    flash('Não foi possível gerar o relatório. Tente novamente.', 'err')
    return null
  } finally {
    busy[id] = ''
  }
}

async function view(id) {
  const result = await build(id, 'preview')
  if (result) preview.value = { id, ...result }
}

async function exportPdf(id) {
  const result = ready[id] || (await build(id, 'pdf'))
  if (result) save(result)
}

onUnmounted(() => Object.values(ready).forEach((item) => URL.revokeObjectURL(item.url)))
</script>

<template>
  <Page title="Relatórios" subtitle="Gere documentos consolidados sobre a organização e realização do Hackathon.">
    <section class="report-center" aria-labelledby="report-models">
      <div class="report-center-head">
        <h2 id="report-models" class="report-center-title">Modelos de relatório</h2>
        <p>Escolha o relatório que deseja gerar.</p>
      </div>
      <ul class="report-list">
        <li v-for="item in REPORT_MODELS" :key="item.id" class="report-row" :class="{ featured: item.recommended }">
          <div class="report-info">
            <h3>{{ item.title }} <span v-if="item.recommended" class="badge info">Recomendado</span></h3>
            <p>{{ item.text }}</p>
          </div>
          <div class="report-actions">
            <button class="btn ghost" type="button" :disabled="Boolean(busy[item.id])" @click="view(item.id)">
              {{ busy[item.id] === 'preview' ? 'Gerando relatório...' : 'Visualizar' }}
            </button>
            <button class="btn" type="button" :disabled="Boolean(busy[item.id])" @click="exportPdf(item.id)">
              {{ busy[item.id] === 'pdf' ? 'Gerando relatório...' : ready[item.id] ? 'Baixar PDF' : 'Gerar PDF' }}
            </button>
          </div>
        </li>
      </ul>
      <p class="report-foot">Os documentos são gerados neste navegador, em PDF A4, a partir dos dados atuais do HackLab.</p>
    </section>

    <Modal v-if="preview" class="report-preview" :title="preview.title" :subtitle="preview.fileName" wide @close="preview = null">
      <iframe class="report-frame" :src="preview.url" :title="`Pré-visualização: ${preview.title}`" />
      <template #footer>
        <button class="btn ghost" type="button" @click="preview = null">Voltar</button>
        <button class="btn" type="button" @click="save(preview)">Baixar PDF</button>
      </template>
    </Modal>
  </Page>
</template>
