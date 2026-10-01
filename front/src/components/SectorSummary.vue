<script setup>
import { computed } from 'vue'
import { sectorSummaries } from '../model'
import { go, useHack } from '../store'
import Icon from './Icon.vue'

const { state } = useHack()
const summaries = computed(() => sectorSummaries(state))
const link = (name) => `setores?setor=${encodeURIComponent(name)}`
</script>

<template>
  <section class="mt">
    <h3 class="ops-title">Resumo dos Setores</h3>
    <p class="stat-hint">Acompanhe rapidamente a situação das áreas responsáveis pela organização.</p>
    <div class="sector-grid">
      <a v-for="item in summaries" :key="item.name" class="card sector-card" :href="`#/${link(item.name)}`" @click.prevent="go(link(item.name))">
        <span class="sector-card-head"><Icon :name="item.icon" :size="18" /><strong>{{ item.name }}</strong></span>
        <dl class="sector-lines">
          <div v-for="line in item.lines" :key="line.label">
            <dt>{{ line.label }}</dt>
            <dd>{{ line.value }}<i v-if="line.alert && line.raw > 0" class="sector-alert" title="Requer atenção" aria-label="Requer atenção" /></dd>
          </div>
        </dl>
        <span class="sector-go">Ver setor →</span>
      </a>
    </div>
  </section>
</template>
