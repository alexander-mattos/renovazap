# RenovaZap - Sistema de Gestão de Apólices de Seguro

Sistema completo para gerenciamento de apólices de seguro com notificações automáticas via WhatsApp.

## 🚀 Funcionalidades

- ✅ **Gestão de Apólices**: CRUD completo de apólices de seguro
- ✅ **Upload de PDFs**: Extração automática de dados de apólices
- ✅ **Notificações WhatsApp**: Lembretes automáticos de vencimento
- ✅ **Dashboard**: Visualização de métricas e apólices próximas ao vencimento
- ✅ **Gestão de Seguradoras**: Cadastro e manutenção de seguradoras
- ✅ **Tipos de Seguro**: Configuração de diferentes tipos de seguro
- ✅ **Templates de Mensagem**: Personalização de mensagens de notificação
- ✅ **Autenticação JWT**: Sistema seguro com roles (admin/user)

## 🛠️ Tecnologias

### Frontend
- **React 18** com TypeScript
- **Next.js 13+** (App Router)
- **Tailwind CSS** para estilização
- **Lucide React** para ícones
- **Axios** para requisições HTTP
- **React Hook Form** para formulários
- **Date-fns** para manipulação de datas

### Backend
- **Node.js** com Express
- **TypeScript** para type safety
- **Prisma ORM** para banco de dados
- **MySQL** como banco de dados
- **JWT** para autenticação
- **Multer** para upload de arquivos
- **node-cron** para tarefas agendadas
- **WAHA (WhatsApp HTTP API)** como provedor de integração WhatsApp

## 📋 Pré-requisitos

- Node.js 18+ 
- MySQL 8+
- NPM ou Yarn
- Git

## 🔧 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/renovazap.git
cd renovazap
```

### 2. Configure o Backend

```bash
cd server
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações:
# DATABASE_URL="mysql://user:password@localhost:3306/renovazap"
# JWT_SECRET="sua-chave-secreta"
# PORT=3001

# Execute as migrations
npx prisma migrate dev

# (Opcional) Popular o banco com dados iniciais
npm run seed
```

### 3. Configure o Frontend

```bash
cd ../frontend
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 🚀 Execução

### Desenvolvimento

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Acesse: http://localhost:3000

### Produção

**Backend:**
```bash
cd server
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

## 📱 Configuração do WhatsApp

Antes de utilizar, configure o arquivo `.env` com as variáveis `WAHA_BASE_URL` e `WAHA_API_KEY`, apontando para o servidor WAHA responsável pela sessão "default".

1. Acesse a página de configuração do WhatsApp no sistema
2. Clique em **Iniciar sessão** para gerar o QR Code a partir do WAHA
3. Escaneie o QR Code ou solicite um código de pareamento diretamente na página
4. Após a autenticação, o status mudará para **Conectado** e os envios automáticos estarão disponíveis

## 👤 Usuário Padrão

Se você executou o seed, use:
- **Email**: admin@renovazap.com
- **Senha**: admin123

## 📊 Estrutura do Banco de Dados

### Principais Tabelas
- **users**: Usuários do sistema
- **policies**: Apólices de seguro
- **insurance_providers**: Seguradoras
- **insurance_types**: Tipos de seguro
- **notifications**: Notificações enviadas
- **message_templates**: Templates de mensagem
- **whatsapp_sessions**: Sessões do WhatsApp

## 🔒 Segurança

- Autenticação JWT em todas as rotas protegidas
- Senhas criptografadas com bcrypt
- Validação de roles (admin/user)
- Sanitização de inputs
- CORS configurado

## 📝 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro

### Apólices
- `GET /api/policies` - Listar apólices
- `GET /api/policies/:id` - Buscar apólice
- `POST /api/policies` - Criar apólice
- `PUT /api/policies/:id` - Atualizar apólice
- `DELETE /api/policies/:id` - Excluir apólice
- `GET /api/policies/expiring/:days` - Apólices próximas ao vencimento

### Seguradoras
- `GET /api/insurance-providers` - Listar seguradoras
- `POST /api/insurance-providers` - Criar seguradora (admin)
- `PUT /api/insurance-providers/:id` - Atualizar (admin)
- `DELETE /api/insurance-providers/:id` - Excluir (admin)

### Tipos de Seguro
- `GET /api/insurance-types` - Listar tipos
- `POST /api/insurance-types` - Criar tipo (admin)
- `PUT /api/insurance-types/:id` - Atualizar (admin)
- `DELETE /api/insurance-types/:id` - Excluir (admin)

## 🐛 Troubleshooting

### Erro de conexão com banco
- Verifique se o MySQL está rodando
- Confirme as credenciais no `.env`
- Execute `npx prisma generate`

### WhatsApp não conecta
- Verifique conexão com internet
- Limpe a sessão e escaneie novamente
- Verifique logs do servidor

### Upload de PDF falha
- Verifique tamanho máximo (10MB)
- Confirme que é um PDF válido
- Verifique permissões da pasta uploads/

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👥 Autores

- **Alexander Mattos** - *Desenvolvimento inicial* - [alexander-mattos](https://github.com/alexander-mattos)

## 🙏 Agradecimentos

- Equipe do WAHA (WhatsApp HTTP API)
- Comunidade Prisma pelo excelente ORM
- Vercel pelo Next.js