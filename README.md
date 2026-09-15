# Estoque RPG

> **Documentação completa** — do motivo à arquitetura, regras, manual e deploy.
> Versão do projeto: **3.2.0** · Status: **em uso ativo** (mesa "Desajustados").

---

## 1. O problema (motivo do projeto)

Mesas de RPG de mesa costumam se apoiar em **ficha de papel, planilha e um estoque físico ou em texto**, espalhado entre o mestre e os jogadores. Isso gera uma série de dores bem conhecidas:

- **Estoque descentralizado**: itens, moedas, poções e materiais ficam na cabeça do mestre ou em anotações soltas; ninguém sabe ao certo "quanto tem".
- **Fichas desatualizadas**: atributos, vida/mana/esforço e equipamentos vivem no papel — cada alteração precisa ser "reescrita à mão" e re-sincronizada com o grupo.
- **Cálculos manuais**: fórmulas (vida, mana, defesa), bônus de itens equipados e tipagem de perícias exigem contas repetidas a cada sessão.
- **Nada é em tempo real**: quando o mestre entrega um item, os jogadores não veem a mochila mudar — só numa próxima atualização ou leitura em voz alta.
- **Sem controles**: não há trilha de quem pegou o quê, quando e por quê.

O **Estoque RPG** nasceu para resolver exatamente isso para o *sistema de regras próprio* da campanha ("Desajustados"): uma ferramenta de **inventário, fichas e equipamento em tempo real**, acessível de qualquer dispositivo do grupo, com o mestre no controle e os jogadores podendo cuidar do que é deles.

### A proposta em uma frase

> Um "estoque e ficha digital" para a mesa de RPG: catálogo de itens, mochilas individuais, equipamentos com efeito mecânico, magias/runas, e histório de movimentação — tudo sincronizado na hora entre todos os jogadores.

---

## 2. Visão geral

| | |
|---|---|
| **Nome** | Estoque RPG (tela de boot: "Carregando o Grimório…") |
| **Tipo** | Aplicação web de apoio a mesa de RPG (inventário + fichas) |
| **Público** | Mestre (admin/gestor) e jogadores de uma mesa específica |
| **Frontend** | Svelte 5 + TypeScript + Vite (SPA com roteamento interno) |
| **Backend** | Node.js (Express + Socket.IO), servidor único com bundle único |
| **Persistência** | Arquivos JSON (`data.json`, `users.json`, `runas.json`) |
| **Tempo real** | Socket.IO — toda ação é validada no servidor e re-transmitida a todos |
| **Auth** | Sessão (express-session, cookie `estoque.sid`) + bcrypt |
| **Infra atual** | Docker no Umbrel, com Tailscale (+ Funnel) para acesso externo |
| **Porta** | 3000 (padrão) |

### Principais recursos

- **Mesas/RPGs**: cada mesa tem seu próprio catálogo de itens, schema de ficha, regras e fichas.
- **Ficha digital** com seções de atributos, perícias, campos livres, inventário, equipamento, magias & técnicas, runas, anotações e histórico de itens.
- **Catálogo central de itens** com categorias, peso, valor e efeito; quantidade no estoque **controlada automaticamente** (o que está na mochila dos fichas sai do total disponível).
- **Movimentações auditadas**: entrada, saída, devolução, baixa, remoção e limpeza — com quem, quando e motivo (cap de 800 registros).
- **Equipamento com mecânica**: bits de itens equipados **aumentam atributos/fórmulas** (Vida, Mana, Defesa, Esforço, Dano).
- **Magias & técnicas e Runas** editáveis por ficha, com modal de adição/edição/remoção.
- **Regras de equipamento**: mão principal/secundária (arma/cajado/grimório), acessório, escudo, armadura — com conflito *escudo × arma na mão secundária* validado no servidor.
- **Perícias com tipagem visível** (ex.: `(FOR & AGI)`, `(AGI)`) + valor por ficha.
- **Fichas de Monstros**: aba própria por mesa (acesso restrito a gestores) — a ficha de um monstro reutiliza a ficha completa (atributos, perícias, inventário, equipamento…) e **jogadores não recebem** essas fichas nem suas movimentações.
- **Acessórios com estrelas** (opcional por mesa): com a flag `equipStars`, a ficha ganha 3 slots de acessório e o **somatório de estrelas é limitado**; badges no estoque e na ficha.
- **Anotações com autosave**: salvam conforme você digita (debounce ~500ms + salvamento imediato ao sair da caixa) — texto não se perde ao trocar de página.
- **6 temas visuais**, layout adaptado para **mobile** (menu hambúrguer).
- **3 papéis**: administrador, gestor e jogador, com permissões distintas.

---

## 3. Os desafios

### 3.1 Desafios de regras (design do jogo)

O sistema usa um **ruleset próprio** — não é D&D nem um sistema pronto. Traduzir as regras de papel para dados estruturados foi o maior desafio de modelagem:

- **Fórmulas dinâmicas**: Vida/Mana/Defesa/Esforço derivam de atributos com fórmulas editáveis por mesa (ex.: `VIDA = 10 + NIVEL * 5`). O app avalia a fórmula e mostra o resultado calculado na ficha.
- **Bônus de equipamento em linguagem natural**: os efeitos foram escritos "à mão" no catálogo ("Defesa +1d10", "Dano 1d6", "Recupera +7 de VIDA", "+5 de Espaço"). Foi preciso criar um **parser de efeitos** (`parseItemBonuses`) que entende os vários formatos, normaliza acentos, converte dados em valor médio e mapeia *ESTAMINA → ESFORÇO*.
- **Regras de equipamento com exceções**: duas mãos, mas escudo ocupa a secundária; equipar arma na secundária desequipa o escudo e vice-versa; cajados/grimórios também ocupam mão. Essas validações vivem **no servidor**, não só na UI.
- **Escalas de atributo**: atributos tipo `level` têm NPC 0–10 com "subdivisões" (divisor configurável), usados para requisito de armas e fórmulas.
- **Conteúdo do jogo digitalizado**: um catálogo de ~130 itens (poções, ervas, acessórios, armas, escudos, armaduras, cajados, grimórios) e as **combinações de runas elementares** (Fogo/Água/Gelo/Raio/Terra/Madeira/Vento) foram transcritos de documentos de regras (PDF) e estruturados em JSON.

### 3.2 Desafios técnicos

- **Tempo real confiável**: todas as ações passam por uma única função `apply(action, user)` no servidor; a cada ação o estado é **persistido e transmitido a todos** (`broadcast`). Isso garante que qualquer conflito (ex.: dois gestores equipando a mesma arma) é resolvido no servidor, não no cliente.
- **Multi-dispositivo da mesa**: os jogadores usam celular. Foi necessário um layout responsivo real — não apenas "encolher o CSS".
- **Persistência sem banco de dados**: os dados vivem em JSON versionados (schema com migrações: `migrateOwnership`, normalização de seções/esquemas) e com salvamento atômico em arquivo.
- **Deploy no Umbrel (servidor doméstico)**: o app roda dentro de um **container Docker** com Tailscale embutido — um `entrypoint` sobe o `tailscaled`, autentica com a auth key e ativa o *Funnel* na porta 3000 para o grupo acessar de fora da rede local.
- **Bug clássico de produção**: o frontend enviava `itemId` para a ação `setEquip`, mas o servidor esperava `entryId` — **equipar na UI nunca funcionou até o teste de regressão encontrar**. Foi corrigido e coberto por teste.
- **Estilo global vs. local**: telas novas (Estoque/Ficha) não tinham estilo porque componentes de modal/botão/campo estavam definidos *dentro* de outras telas (ex.: Usuarios/Config). Solução: kit de UI global em `app.css`.
- **Encoding (Windows)**: manipulação de JSON/UTF-8 via PowerShell `Set-Content` corrompe acentos (ex.: `Poção` → `PoÃ§Ã£o`). Todos os comandos que tocam arquivos precisam de cuidado com enconding.

---

## 4. Arquitetura

```
                    ┌──────────────────────────────────────────────┐
                    │             Browser (jogadores)              │
                    │  Svelte 5 SPA · socket.io-client            │
                    └──────────────────────┬───────────────────────┘
                                           │ HTTP (login/me) + Socket.IO
                                           ▼
        ┌───────────────────────────────────────────────────────────┐
        │  Node.js (um único bundle: server.js → deploy-app.js)     │
        │                                                            │
        │  express-session  →  cookie estoque.sid  →  io middleware │
        │                                                            │
        │  io.on('action')  →  apply(action, user)  ──►  mutate     │
        │                          │                                 │
        │                          ├── save()        (data.json)    │
        │                          ├── saveUsers()   (users.json)   │
        │                          └── broadcast()   → state p/ todos│
        └───────────────────────────────────────────────────────────┘
                             │
          ├───────────────────┼─────────────────────────┤
     data.json          users.json                runas.json
   (rpgs/chars/movs/  (contas bcrypt)         (runas do sistema)
    catalog/settings)
```

Princípios:

1. **Servidor é a fonte da verdade** — o cliente nunca aplica ação antes de validar; tudo passa pelo `apply()`.
2. **Estado único e difundido** — após cada ação, todos os sockets recebem `state` (com visão filtrada por perfil).
3. **Visão por usuário** — `stateFor(user)` inclui a lista de usuários apenas para quem pode gerenciar; jogadores não veem contas.
4. **Uma ação = persistir + transmitir** — nada de jobs em segundo plano; o arquivo é o banco.

### Stack e versões

| Camada | Tecnologia |
|---|---|
| Frontend | Svelte 5 · TypeScript · Vite 8 · `svelte-check` |
| Backend | Node.js ≥ 16 (container: 20-slim) · Express 4 · Socket.IO 4 |
| Segurança | bcryptjs · express-session · cookie |
| Build | esbuild (bundler único do servidor) |
| Infra | Docker + docker compose · Tailscale (funnel) · supervisor |
| Utilitário de deploy | PowerShell (Windows): `deploy-umbrel.ps1` |

---

## 5. Modelo de dados

Persistência em **JSON** (arquivos na raiz local; em produção: volume `app-data` em `/data`).

### `data.json`

```
settings    { systemName }
users       []          // espelho das contas (estado) — contas reais em users.json
rpgs        []          // mesas
characters  []          // fichas
movements   []          // auditoria de movimentação (cap 800)
```

#### `rpg` (mesa)
- `id`, `name`, `updatedAt`
- `catalog`: itens do estoque (`.id, .name, .category, .description, .weight, .value, .effect, .qty`)
- `schema`: `{ attrs[], skills[], classes[], sections[], rules{ subDivisor }, classLabel }`
- `settings/theme` (visual da mesa)
- `equipStars`: habilita o sistema de estrelas de acessórios na mesa (3 slots + limite de soma)

#### `character` (ficha)
- `id`, `rpgId`, `name`, `status`, `ownerId`, `updatedAt`
- `attrs`: mapa id → valor
- `skills`: mapa id → valor
- `classes`: mapa id → valor
- `custom`: campos livres (id → valor)
- `inventory[]`: `{ id, name, qty, src (id do catálogo), category, weight, value, effect, perSlot, note }`
- `equipment`: mapa slot → id do item da mochila (`mao1, mao2, acessorio, escudo, armadura`; com `equipStars`: `acessorio1..acessorio3`)
- `spells[]`: magias/técnicas
- `runes[]`: runas equipadas
- `notes`, `formulaBuffs` (buff temporário por fórmula), `history[]`
- `isMonster` + `monster{ desafio, tipo, habitat }`: ficha de monstro (acesso restrito a gestores)

### `users.json`
Contas com `username, name, role (admin|gestor|jogador), active, passHash`.

### Categorias de item
`consumivel, acessorio, material, combinacao, arma, armadura, cajado, grimorio, escudo, magico`.

---

## 6. Papéis e permissões

| Ação | admin | gestor | jogador |
|---|---|---|---|
| Ver mesas/fichas/movimentações | ✅ | ✅ | ✅ |
| Gerenciar catálogo de itens / estoque | ✅ | ✅ | ❌ |
| Criar/editar/excluir fichas de qualquer um | ✅ | ✅ | ❌ |
| Gerenciar **fichas de monstro** (aba Monstros) | ✅ | ✅ | ❌ |
| Editar **própria ficha** (inventário/equipar/magias/runas) | ✅ | ✅ | ✅ (prop.) |
| Mexer no item de outra pessoa da mochila | ✅ | ✅ (c/ permissão do dono) | ❌ |
| Gerenciar usuários | ✅ | ❌ | ❌ |
| Ajustes globais (tema/título) | ✅ | ❌ | ❌ |

Regras no código (`server.js`):
- `canManage(u)` = `admin || gestor`
- `canEditChar(u, c)` = `canManage(u) || c.ownerId === u.id`
- `canTouchItem(u, c, ownerId)` = `canEditChar` e, para não-menagers, só itens do próprio usuário.

---

## 7. Manual do usuário (telas)

A navegação é por **rotas internas** (`Dashboard, Mesa, Fichas, Ficha, Estoque, Config, Usuarios, Ajustes`). No mobile o topo vira **menu hambúrguer**.

### Login
Tela de entrada com usuário/senha. Sem sessão válida, o app não carrega nada.

### Dashboard (visão geral)
Lista as mesas com resumo; acesso a Mesa e Estoque de cada uma.

### Mesa (visão da mesa)
Visão geral da mesa: fichas, itens e movimentações recentes.

### Fichas (lista de fichas)
Lista os personagens da mesa; abre a ficha detalhada.

### Monstros (só gestores)
Lista as **fichas de monstro** da mesa em cartões (nome, tipo, habitat, **desafio**, status, contagem de itens/slots), com busca e botões de **criar/editar/remover**. Abrir um cartão carrega a mesma ficha usada para personagens — todo o schema da mesa vale (atributos, fórmulas, inventário, equipamento, magias/runas, anotações). Jogadores não enxergam a aba nem as movimentações de monstros (o servidor filtra).

### Ficha (a tela principal)
Duas colunas (em mobile, empilhadas), com seções configuráveis:
- **Atributos**: VIDA, MANA, ESFORÇO e atributos `level` (FORÇA, AGILIDADE, INTELIGÊNCIA…) com valores e subdivisões.
- **Perícias**: cada perícia mostra a **tipagem** (`(FOR & AGI)`, `(AGI)`, …) e valor numérico (máx. 5).
- **Fórmulas**: badges com valores calculados (Vida, Mana, Defesa, Esforço) somando **bônus de itens equipados** (chip dourado) e **Dano** quando há item de dano equipado.
- **Campos livres**: campos custom da ficha.
- **Inventário**: mochila do personagem; com permissão, botão **Adicionar** abre modal com duas abas:
  - *Catálogo*: escolhe item do estoque e quantidade (a ação `giveItem` valida disponibilidade);
  - *Item livre*: nome, quantidade e "por slot", sem vínculo com o catálogo.
- **Equipamento**: mãos, acessório, escudo, armadura — equipa/remove itens da mochila (a regra *escudo × arma secundária* é aplicada pelo servidor). Dica de regras ao lado.
- **Magias & técnicas**: lista com adicionar/editar/excluir via modal.
- **Runas**: idem (modal próprio).
- **Anotações**: texto livre com **autosave** conforme se digita (sem perder texto ao sair da página).
- **Histórico de itens**: movimentações da ficha.

### Estoque (catálogo + movimentações)
- Tabela do **catálogo** por categoria, com peso/valor/efeito e disponível (quantidade menos o que está nas mochilas).
- Gestores **adicionam/atualizam/removem itens** (modal com campos).
- Botão **Dar** por item abre modal: escolhe a ficha e a quantidade → `giveItem`.
- **Estrelas**: itens de acessório podem ter 1–3 estrelas (selo de estrela na lista) — só somam no limite quando a mesa usa `equipStars`.
- **Movimentações**: linha do tempo com tipo (entrada/saída/devolução/baixa/remoção/limpeza), quem fez, para quem e motivo.

### Configuração da ficha (por mesa)
Gestores definem o *schema* da ficha da mesa:
- **Atributos**: criar/editar/remover/reordenar; tipos: número, texto, nível, sim/não, seleção, contador, moeda, texto longo, vínculo; mín/máx; ativo/obrigatório.
- **Perícias**: nome, categoria, máximo, descrição (tipagem ex.: `(FOR & AGI)`).
- **Classes/Funções**: criar e descrever.
- **Fórmulas**: definir como derivar valores (ex.: Vida = f(VIDA) + bonificação do nível).
- **Regras**: divisor de subdivisão (`subDivisor`).
- **Seções**: quais seções de ficha aparecem e em qual coluna; seções custom.

### Usuários
Admins criam/editar/inativam contas e definem papel. Gerentes **não** acessam.

### Ajustes
Tema global (6 temas: Bordô, Pergaminho, Carvão, Verdigris, Noturno, Sangue) e nome do sistema.

---

## 8. Regras de jogo modeladas

### Atributos padrão de uma mesa nova
`VIDA, MANA, ESFORÇO` (núm.) e `FORÇA, AGILIDADE, INTELIGÊNCIA, RESISTÊNCIA` (nível 0–10).

### Perícias padrão (18) com tipagem
`Intimidação (FOR&SAB) · Luta (FOR&AGI) · Resistência (FOR&VIG) · Atletismo (VIG&AGI) · Movimentação (AGI&FOR) · Mecânica (FOR&INT) · Pontaria (AGI&INT) · Reflexo (AGI) · Comunicação (INF) · Sedução (INF) · Música (INF&SAB) · Vontade (VIG&INF) · Sanidade (VIG&SAB) · Conhecimento (SAB) · Magia (INT&SAB) · Conjuração (INT&SAB) · Percepção (INT&INF) · Sobrevivência (SAB&VIG)`

### Regras de equipamento
- Slots: **Mão Principal** (`mao1`), **Mão Secundária** (`mao2`), **Acessório**, **Escudo**, **Armadura**.
- `mao1`/`mao2` aceitam categorias `arma`, `cajado`, `grimorio`; `escudo` aceita só `escudo`; etc.
- **Conflito**: equipar arma no `mao2` remove o `escudo`; equipar `escudo` remove a arma do `mao2`. (servidor valida e aplica o desequipamento automático)
- **Acessórios com estrelas** (mesas com `equipStars`): 3 slots (`acessorio1`..`acessorio3`) e **somatório de estrelas limitado** (máx. 3); o servidor valida o limite no `setEquip`. Mesas sem a flag mantêm o slot único `acessorio`.

### Parser de efeitos de item
`parseItemBonuses` entende (exemplos reais do catálogo):
- `Defesa +1d10` → defesa += 5.5 (média)
- `Dano 1d6` → dano += 3.5
- `Recupera +7 de VIDA` → vida += 7
- `+5 de Espaço`, `+5 de Esforço`, `-1 em Desvio`, `+12 de Espaço`
- `ESTAMINA` é tratado como `ESFORÇO` (nome alternativo da regra).

### Runas elementares (referência do jogo)
Da documentação de regras: runas de 1º/2º círculo (Fogo, Água, Gelo, Raio, Terra, Madeira, Vento) com dano/mana/armação (ex.: Fogo 1d3/2/2 turnos; Barreira, Explosivo, Múltiplo…) e **combinações elementares** catalogadas como itens (`Água+Fogo`, `Vento+Madeira`, `Raio+Gelo`, …) com efeitos no catálogo — prontas para uso e consulta na mesa.

---

## 9. API (ações via Socket.IO, evento `action`)

Todas as mutações passam pelo evento `action: { type, ...payload }`; o servidor responde via `state` (a todos) ou `actionError`.

**Sistema/contas**: `updateSettings, changeOwnPassword, createUser, updateUser, deleteUser`

**Mesa/catálogo**: `createRpg, updateRpg, deleteRpg, setAttr, removeAttr, reorderAttr, setSkill, removeSkill, reorderSkill, setClass, removeClass, setFormula, removeFormula, setRpgRule, setSchemaLabel, setSections, addCatalogItem, updateCatalogItem, removeCatalogItem`

**Fichas**: `createCharacter, deleteCharacter, updateCharacter, setAttrVal, setFormulaBuff, setSkillVal, addCustomAttr, updateCustomAttr, removeCustomAttr, setCustomField`

**Inventário**: `giveItem, returnItem, addItem, updateItem, removeItem, clearCharHistory`

**Magias/Runas/Equipamento**: `addSpell, updateSpell, removeSpell, addRune, updateRune, removeRune, setEquip, unequip`

Exemplo de fluxo (teste de regressão faz isso de ponta a ponta):
```js
socket.emit('action', { type: 'giveItem', charId, itemId, qty: 1 })
socket.emit('action', { type: 'setEquip', charId, slot: 'mao1', entryId: espada.id })
```

### Rotas HTTP
- `POST /api/login` · `POST /api/logout` · `GET /api/me`
- `GET` estáticos (SPA e `login.html/login.js` legado)

---

## 10. Estrutura de arquivos

```
./
├── back\                # backend (Node.js/Express/Socket.IO)
│   ├── server.js          # fonte do servidor
│   ├── deploy-app.js      # bundle único gerado por esbuild (uso no Umbrel) — ignorado pelo git
│   ├── package.json       # deps do servidor + node_modules\ (junto)
│   ├── docker-compose.yml # compose do Umbrel (volume /data + tailscale + funnel)
│   ├── deploy-umbrel.ps1  # pipeline atual de deploy (Windows → Umbrel)
│   ├── data\              # dados locais (ignorados pelo git — nunca versionar)
│   ├── umbrel\
│   │   ├── Containerfile    # imagem: node 20-slim + tailscale + supervisor
│   │   ├── entrypoint.sh    # inicializa tailscaled/funnel e o supervisord
│   │   ├── supervisord.conf # roda `node server.js`
│   │   ├── setup-umbrel.sh  # bootstrap do Umbrel (.env → build → up)
│   │   └── .env.example
│   └── scripts\           # testes e ferramentas (rt-test, rt-equip-test, seed-users, ...)
├── front\                # frontend fonte (Svelte 5) — era `dev/`
│   ├── src\
│   │   ├── App.svelte · main.ts · app.css
│   │   ├── lib\AppShell.svelte · router.ts · stores.ts · socket.ts · api.ts
│   │   ├── lib\screens\  (Login, Dashboard, Mesa, Fichas, Ficha, Monstros, Estoque, Config, Usuarios, Ajustes)
│   │   └── lib\components\ (AttrControl, SkillControl, MovementRow, Tile, Toasts, Icon, Empty)
│   ├── fixtures\ · dist\ · node_modules\
│   └── vite.config.ts      # proxy /api e /socket.io → :3001
├── public\               # frontend compilado (servido pelo back; bind mount no Umbrel)
│   ├── index.html · favicon.svg · icons.svg
│   └── assets\*.js|*.css  (bundles versionados do Vite)
├── referencias\          # documentos de regras/fichas (PDF + TXT) do jogo
├── adicionado\           # conteúdo já importado para o sistema (armas/armaduras/cajados)
└── to-add\               # conteúdo pendente de importação
```

---

## 11. Como rodar localmente

Pré-requisito: Node.js ≥ 16 (recomendado 18+).

Backend (pasta `back/`):

```
cd back
npm install            # dependências do servidor
npm start              # sobe o servidor na porta 3000 (server.js)
```

Frontend em desenvolvimento (pasta `front/`):

```
cd front
npm install
npm run dev            # Vite dev server na porta 5173
npm run check          # svelte-check + tsc (tipos)
npm run build          # gera dist/ → copiar para public/
```

Dados: sem `data.json`/`users.json`, o servidor cria em branco na primeira execução (`loadState`). Para o jogo completo, use um `users.json` seedado (`back/scripts/seed-users.js`) e opcionalmente um `data.json` de campanha.

O `front/vite.config.ts` define proxy para `/api` e `/socket.io` (com `ws: true`) em direção a `http://localhost:3001` — ou seja, para desenvolvimento completo, rode o servidor na porta **3001** (`PORT=3001 node server.js` em `back/`) e o Vite em paralelo na porta 5173.

---

## 12. Deploy

### Atual — Umbrel (produção)
Pipeline: `back/deploy-umbrel.ps1` (do Windows) → scp de `back/deploy-app.js`, `public/` e arquivos do container → `docker compose build && up -d --force-recreate`.

- Container `estoque-rpg`: Node 20-slim + **Tailscale** + **supervisor**.
- `entrypoint.sh`: sobe `tailscaled`, autentica (`TS_AUTHKEY`), ativa **Funnel** na porta 3000 (acesso do grupo de fora da rede local).
- Volume `app-data:/data` guarda `data.json`/`users.json`/`runas.json` (dados sobrevivem a rebuild).
- Bind `./public:/app/public` → frontend = só `scp`; backend = rebuild do container.

Atualização rápida de frontend:
```
# build local + copy
npm run build (em front/) e copiar dist/* → public/
scp public/index.html e public/assets/* usuario@host-umbrel:/home/USER/estoque-rpg/public/
```
(atenção: assets ficam em `public/assets/`.)

### Legado — VPS (descontinuado)
Um pipeline antigo publicava o bundle via SFTP (Posh-SSH/Passenger) numa VPS; foi **removido do repositório** por conter credenciais hardcoded. A produção atual é o Umbrel.

---

## 13. Testes

- `node back/scripts/rt-test.cjs` — smoke test realtime: loga como admin, dispara ação e confere propagação de estado (esperado: `ACTION+RT OK`).
- `node back/scripts/rt-equip-test.cjs` — teste de regressão do módulo inventário/equipamento: cria catálogo e ficha, dá itens, equipa 2 armas + escudo + armadura, validando o conflito *escudo × mão secundária* (esperado: `EQUIP+ITEM OK`).
- `npm run check` (em `front/`) — checagem de tipos Svelte/TS.

> Ajuste `PORT`/caminhos nos scripts se necessário (testes usam instância isolada em pasta temporária).

---

## 14. Melhorias e próximos passos (roadmap)

Ideias detectadas no código e nas pastas de conteúdo:

- [ ] Importar o restante de `to-add/` (perícias complementares, bônus por nível de atributos).
- [ ] Aplicar **bônus por nível** (`to-add/bonus_por_nivel_atributos.json`): +Espaço, +HP, slots de runa, perícias extras conforme pontos.
- [ ] Slots de runa limitados por Inteligência/Sabedoria (referenciados nas regras).
- [ ] Visualização de "disponível" mais clara no Estoque (quantidade vs. atribuição).
- [ ] Exportar catalogo de itens em arquivo (backup/edição offline).
- [ ] Substituir `express-session` MemoryStore por persistência antes de subir para múltiplos processos.
- [ ] Migrar testes para um runner fixo (sem prints dinâmicos).

---

## 15. Changelog (resumo)

- **3.2.0 (atual)**
  - **Fichas de Monstros**: nova aba por mesa (só gestores) — ficha completa reutilizada, desafio/tipo/habitat no topo, e servidor filtra fichas/movimentações de monstros para jogadores.
  - **Acessórios com estrelas**: sistema opcional por mesa (`equipStars`) com 3 slots e limite de somatório de estrelas.
  - **Anotações com autosave**: debounce de ~500ms e salvamento imediato ao sair da caixa.
  - Limpeza para publicação: `.gitignore` raiz, remoção de scripts legados com credenciais, README atualizado.
- **3.0.0**
  - Kit de UI global (`app.css`) — corrige telas sem estilo (modais/botões/campos).
  - Menu hambúrguer mobile no shell do app.
  - Correção do bug de Usuários (métodos de ação) e do `setEquip` (`entryId`).
  - Regras de equipamento: mãos 1/2, escudo × arma secundária (validação no servidor).
  - Bônus de itens equipados nas fórmulas (parser de efeitos) + badge de Dano.
  - Adicionar item ao inventário via Estoque e Ficha (`giveItem`/`addItem`).
  - Magias & técnicas e Runas: adicionar/editar/excluir.
  - Perícias com tipagem visível.
  (Histórico anterior não versionado.)

---

*Documentação gerada a partir do código-fonte, documentos de regras e histórico de deploy. Última revisão: set/2026.*