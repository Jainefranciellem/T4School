# Templates do WhatsApp (Cloud API)

Mensagens ativas (lembretes e avisos) só podem ser enviadas por template aprovado
pela Meta. Crie os 4 abaixo no **WhatsApp Manager → Modelos de mensagem**.

- Categoria: **Utilidade**
- Idioma: **Português (BR)** (`pt_BR`)
- Nome: exatamente como abaixo (minúsculas, com underscore)
- Os exemplos de variáveis podem ser qualquer valor (a Meta pede só para revisar)

| Nome | Corpo |
|---|---|
| `lembrete_aula` | `Olá {{1}}! Lembrete da sua aula em {{2}} às {{3}}, em {{4}}, com {{5}}.` |
| `aula_confirmada` | `Olá {{1}}! Sua aula de {{2}} às {{3}} está confirmada. Te esperamos!` |
| `aula_cancelada` | `Olá {{1}}! Sua aula de {{2}} às {{3}} foi cancelada. Fale com a gente para remarcar.` |
| `aula_remarcada` | `Olá {{1}}! Sua aula foi remarcada para {{2}} às {{3}}, em {{4}}, com {{5}}.` |

Ordem das variáveis (definida em `backend/src/lib/whatsapp-templates.ts`):

- `lembrete_aula` e `aula_remarcada`: nome, data (dd/mm/aaaa), hora, local, instrutor
- `aula_confirmada` e `aula_cancelada`: nome, data (dd/mm/aaaa), hora

## Credenciais

Em **Configurações** do sistema, preencha:

- **Phone Number ID**: WhatsApp Manager → Configurações da API
- **Token**: use um token de **usuário do sistema** (permanente). O token temporário
  de teste expira em 24h.

O número precisa estar registrado na Cloud API. Se continuar usando o app
WhatsApp Business no celular ao mesmo tempo, ative a **coexistência** ao
conectar o número.

Se um template não estiver aprovado ou o nome divergir, o envio falha, o erro
aparece no log do backend e o push continua funcionando.
