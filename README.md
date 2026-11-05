# JobFlow

Sistema pessoal e open source para gerenciamento e acompanhamento de candidaturas a vagas de emprego, com interface moderna e minimalista inspirada no Linear e sincronização com **Supabase**.

## 🚀 Funcionalidades

- **Dashboard Executivo:** Métricas em tempo real (taxa de resposta, entrevistas agendadas, total de candidaturas e distribuição de status).
- **Quadro Kanban:** Visualização em esteira com drag-and-drop e filtros rápidos.
- **Gestão de Candidaturas:** Histórico completo de eventos, anotações, tecnologias, faixas salariais e links de vagas.
- **Agenda & Calendário:** Acompanhamento de entrevistas, testes técnicos e lembretes com links diretos para videochamadas.
- **Versões de Currículo:** Controle de quais versões de currículo foram enviadas para cada vaga.
- **Command Palette (`Ctrl+K` / `⌘K`):** Navegação ágil e execução rápida de ações pelo teclado.
- **Sincronização com Supabase + Backup JSON/CSV:** Persistência em nuvem via Supabase PostgreSQL, com exportação/importação em JSON e CSV.

## 🛠️ Tecnologias

- **React 19** + **TypeScript**
- **Vite**
- **Tailwind CSS v4**
- **Supabase (`@supabase/supabase-js`)**
- **Lucide Icons**

## 💻 Como Clonar e Rodar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Crie as tabelas no seu projeto **Supabase**:
   - Abra o **SQL Editor** no painel do Supabase e execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).

3. Configure as variáveis de ambiente copiando `.env.example` para `.env`:
   ```env
   VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
   VITE_SUPABASE_ANON_KEY="sua-chave-anon-publica"
   VITE_GOOGLE_CLIENT_ID="123456789-aaabbbcccdddeee.apps.googleusercontent.com"
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

5. Acesse no navegador:
   `http://localhost:3000`

## 📄 Licença

Este projeto é open source sob a licença MIT.
