<script setup>
import { computed, ref } from 'vue'
import { findInvite } from '../model'
import { go, useHack } from '../store'
import Logo from '../components/Logo.vue'

// Cadastro público: apenas Votante (livre) e Jurado (com código de convite).
// Perfis internos são criados pelo SuperAdmin em Usuários e Permissões.
const OPTIONS = [
  { id: 'Votante', title: 'Votante', text: 'Participe da votação pública das soluções.' },
  { id: 'Jurado', title: 'Jurado', text: 'Avalie as soluções atribuídas a você.' },
]
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const hack = useHack()
const kind = ref('')
const form = ref({ name: '', email: '', password: '', confirm: '', code: '', own: false })
const errors = ref({})
const invite = computed(() => (kind.value === 'Jurado' ? findInvite(hack.state, form.value.code) : null))

function validate() {
  const f = form.value
  const found = {}
  if (!f.name.trim()) found.name = 'Preencha seu nome.'
  if (!EMAIL.test(f.email.trim())) found.email = 'Informe um e-mail válido.'
  if (!f.password.trim()) found.password = 'Crie uma senha.'
  else if (f.password.trim().length < 4) found.password = 'Use pelo menos 4 caracteres.'
  if (f.confirm !== f.password) found.confirm = 'As senhas não coincidem.'
  if (kind.value === 'Jurado' && !f.code.trim()) found.code = 'Informe o código de convite.'
  if (!f.own) found.own = 'Confirme que as informações fornecidas são suas.'
  return found
}

function submit(event) {
  event.preventDefault()
  errors.value = validate()
  if (Object.keys(errors.value).length) return
  const problem = hack.register({ kind: kind.value, ...form.value })
  if (problem) errors.value = { [problem.field]: problem.message }
}

function choose(id) {
  kind.value = id
  errors.value = {}
}
</script>

<template>
  <div class="signup">
    <header class="signup-bar">
      <Logo light />
      <button class="btn ghost" type="button" @click="go('login')">Voltar para Login</button>
    </header>
    <main class="signup-main">
      <form class="signup-card" novalidate @submit="submit">
        <h1>Criar cadastro</h1>
        <p class="lead">Cadastre-se para participar da votação pública ou acessar sua área de jurado.</p>

        <fieldset class="signup-kind">
          <legend>Como você participará do Hackathon?</legend>
          <label v-for="item in OPTIONS" :key="item.id" class="signup-option" :class="{ on: kind === item.id }">
            <input type="radio" name="kind" :value="item.id" :checked="kind === item.id" @change="choose(item.id)" />
            <span><b>{{ item.title }}</b><small>{{ item.text }}</small></span>
          </label>
        </fieldset>

        <template v-if="kind">
          <label class="field" :class="{ 'has-error': errors.name }">
            <span>Nome completo<em>*</em></span>
            <input v-model="form.name" class="input" autocomplete="name" />
            <small v-if="errors.name" class="field-error">{{ errors.name }}</small>
          </label>
          <label class="field" :class="{ 'has-error': errors.email }">
            <span>E-mail<em>*</em></span>
            <input v-model="form.email" class="input" type="email" autocomplete="email" inputmode="email" />
            <small v-if="errors.email" class="field-error">
              {{ errors.email }}
              <button v-if="errors.email.startsWith('Já existe')" type="button" class="linkish" @click="go('login')">Ir para Login</button>
            </small>
          </label>
          <label class="field" :class="{ 'has-error': errors.password }">
            <span>Senha<em>*</em></span>
            <input v-model="form.password" class="input" type="password" autocomplete="new-password" />
            <small v-if="errors.password" class="field-error">{{ errors.password }}</small>
          </label>
          <label class="field" :class="{ 'has-error': errors.confirm }">
            <span>Confirmar senha<em>*</em></span>
            <input v-model="form.confirm" class="input" type="password" autocomplete="new-password" />
            <small v-if="errors.confirm" class="field-error">{{ errors.confirm }}</small>
          </label>
          <label v-if="kind === 'Jurado'" class="field" :class="{ 'has-error': errors.code }">
            <span>Código de convite do jurado<em>*</em></span>
            <input v-model="form.code" class="input signup-code" autocomplete="off" autocapitalize="characters" placeholder="JUR-" @input="errors.code = ''" />
            <small v-if="errors.code" class="field-error">{{ errors.code }}</small>
            <small v-else>Enviado pela organização do Hackathon.</small>
          </label>
          <div v-if="invite && invite.status !== 'Utilizado' && !errors.code" class="banner ok signup-invite" role="status">
            <div>
              <b>Convite reconhecido</b>
              <p>Perfil: Jurado<template v-if="invite.companyName"> · Empresa: {{ invite.companyName }}</template></p>
            </div>
          </div>
          <label class="check signup-own" :class="{ 'has-error': errors.own }">
            <input v-model="form.own" type="checkbox" />
            Confirmo que as informações fornecidas são minhas.
          </label>
          <small v-if="errors.own" class="field-error">{{ errors.own }}</small>
          <button class="btn full signup-submit" type="submit">{{ kind === 'Jurado' ? 'Criar cadastro de Jurado' : 'Criar cadastro e continuar' }}</button>
        </template>
        <p class="signup-foot">Já possui cadastro? <button type="button" class="linkish" @click="go('login')">Entrar</button></p>
      </form>
    </main>
  </div>
</template>
