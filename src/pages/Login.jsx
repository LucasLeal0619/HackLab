import { useState } from 'react'
import { ACCOUNTS } from '../model'
import { useHack } from '../store'
import { Field, Icon, Logo, Modal } from '../ui'

export default function Login() {
  const { login } = useHack()
  const remembered = localStorage.getItem('hacklab.remember') || ''
  const [email, setEmail] = useState(remembered)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(Boolean(remembered))
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [forgot, setForgot] = useState(false)
  const [a11y, setA11y] = useState(false)

  function submit(event) {
    event.preventDefault()
    const message = login(email, password, remember)
    setError(message)
  }

  return (
    <div className="login">
      <section className="login-side">
        <Logo />
        <div className="login-copy">
          <div className="bar" />
          <h1>Organização do Hackathon em um só lugar.</h1>
          <p>Planejamento, acompanhamento durante o evento e consulta de resultados, documentos e presença.</p>
        </div>
        <div className="login-foot">Hackathon Senac · Plataforma de gestão</div>
      </section>
      <section className="login-main">
        <div className="login-tools">
          <button className="a11y-btn" onClick={() => setA11y(true)}><Icon name="access" size={16} /> Acessibilidade</button>
        </div>
        <form className="login-card" onSubmit={submit}>
          <h2>Bem-vindo ao HackLab</h2>
          <p className="lead">Acesse sua conta para acompanhar e gerenciar a organização do Hackathon.</p>
          {error ? <p className="error">{error}</p> : null}
          <Field label="E-mail">
            <div className="input-icon">
              <Icon name="mail" size={16} />
              <input className="input" type="email" placeholder="Digite seu e-mail" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
          </Field>
          <Field label="Senha">
            <div className="input-icon">
              <Icon name="lock" size={16} />
              <input className="input" type={show ? 'text' : 'password'} placeholder="Digite sua senha" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button type="button" className="eye" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShow((value) => !value)}><Icon name="eye" size={16} /></button>
            </div>
          </Field>
          <div className="login-row">
            <label className="check"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Lembrar de mim</label>
            <button type="button" className="linkish" onClick={() => setForgot(true)}>Esqueci minha senha</button>
          </div>
          <button className="btn full" type="submit">Entrar</button>
          <div className="demo-accounts">
            <span><strong>Contas demonstrativas</strong> — qualquer senha com 4 ou mais caracteres.</span>
            <div className="demo-list">
              {Object.entries(ACCOUNTS).map(([account, info]) => (
                <div key={account}>
                  <button type="button" onClick={() => { setEmail(account); setPassword('hacklab') }}>{account}</button>
                  <span>· {info.profile}</span>
                </div>
              ))}
            </div>
          </div>
        </form>
      </section>
      {forgot ? (
        <Modal title="Esqueci minha senha" subtitle="Representação visual — sem envio real de mensagens." onClose={() => setForgot(false)} footer={<button className="btn" onClick={() => setForgot(false)}>Entendi</button>}>
          <p>Neste protótipo a recuperação de senha não envia e-mail. Use uma conta demonstrativa, por exemplo <b>admin@senac.br</b>, com a senha <b>hacklab</b>.</p>
        </Modal>
      ) : null}
      {a11y ? (
        <Modal title="Acessibilidade" subtitle="As preferências completas ficam disponíveis depois do login." onClose={() => setA11y(false)} footer={<button className="btn" onClick={() => setA11y(false)}>Fechar</button>}>
          <p>Alto contraste, tamanho da fonte, foco reforçado, redução de animações e espaçamento podem ser ajustados no topo de qualquer tela depois de entrar.</p>
        </Modal>
      ) : null}
    </div>
  )
}
