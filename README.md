# HackLab

Protótipo do HackLab, separado em duas pastas:

- `front` — interface em JavaScript com Vue 3 e Vite. As telas já estão aqui.
- `back` — API em PHP com Laravel 12. A estrutura do framework está pronta. A regra de negócio do HackLab ainda não foi implementada.

Cada pasta tem as próprias dependências. `node_modules`, `vendor` e o arquivo `.env` não vão no Git. Quem clonar o repositório precisa instalar na própria máquina.

## O que instalar antes

**Front**

- [Node.js](https://nodejs.org/) 20 ou mais recente, com npm

**Back**

- PHP 8.2 ou 8.3, com as extensões `pdo_sqlite`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json` e `fileinfo`
- [Composer](https://getcomposer.org/)

O Laravel 12 deste projeto pede PHP 8.2. A versão 13 do Laravel pede PHP 8.3 e não entra nesta máquina se o PHP for 8.2.

## Front

```bash
cd front
npm install
npm run dev
```

Abre em http://localhost:5174/

Os dados da interface ficam no navegador (`localStorage`). Ainda não existe ligação com a API.

## Back

No Windows (PowerShell), a partir da pasta do projeto:

```powershell
cd back
composer install
Copy-Item .env.example .env
php artisan key:generate
New-Item -ItemType File -Force database\database.sqlite
php artisan migrate
php artisan serve
```

No Linux ou no macOS:

```bash
cd back
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan serve
```

Abre em http://localhost:8000/

O banco local é SQLite, no arquivo `back/database/database.sqlite`. As migrações iniciais são as do Laravel (usuários, cache e filas do framework), não as tabelas do HackLab.
