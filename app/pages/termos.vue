<template>
  <LegalLayout title="Termos de Uso" :effective-date="EFFECTIVE_DATE" :updated-at="UPDATED_AT" :sections="sections">
    <!-- TEXTO JURÍDICO PENDENTE: revisão de advogado obrigatória antes de produção (PRD ux-critica §8.1) -->
    <!-- TODO(jurídico): substituir [[CNPJ]] e confirmar a política de reembolso (PRD ux-critica §8.2) -->
    <p>
      Estes termos regem o uso do BAIGI, serviço de estudo com repetição espaçada e inteligência artificial,
      oferecido por BAIGI, CNPJ <span class="placeholder">[[CNPJ]]</span>.
    </p>

    <h2 id="aceitacao">1. Aceitação</h2>
    <p>
      Ao criar uma conta ou usar o BAIGI você declara que leu e aceita estes Termos e a
      <NuxtLink to="/privacidade">Política de Privacidade</NuxtLink>. Se não concordar, não use o serviço.
    </p>

    <h2 id="conta">2. Conta</h2>
    <ul>
      <li>Você é responsável pela veracidade dos dados e pelo sigilo da sua senha.</li>
      <li>A conta é pessoal e intransferível. Avise-nos em caso de uso não autorizado.</li>
      <li>Você pode exportar seus dados e excluir a conta a qualquer momento em Configurações.</li>
    </ul>

    <h2 id="planos">3. Planos, cobrança, renovação e cancelamento</h2>
    <ul>
      <li>O plano Grátis tem limites mensais de uso de IA. O Pro amplia esses limites, conforme a página <NuxtLink to="/planos">Planos</NuxtLink>.</li>
      <li><strong>Mensal:</strong> cobrado no cartão e renovado automaticamente a cada mês até você cancelar.</li>
      <li><strong>Anual (Pix ou cartão):</strong> pagamento único que vale por 12 meses, sem renovação automática. Avisamos por e-mail antes do vencimento.</li>
      <li>O cancelamento do mensal pode ser feito a qualquer momento no portal de assinatura e vale até o fim do período já pago.</li>
      <li>Preços podem mudar; mudanças valem para a próxima renovação e são comunicadas com antecedência.</li>
    </ul>

    <h2 id="arrependimento">4. Direito de arrependimento</h2>
    <p>
      Nas contratações pela internet, você pode desistir em até 7 dias a contar da compra (art. 49 do Código de Defesa do
      Consumidor) e receber o valor pago de volta. Para exercer, fale com o suporte em
      <a href="mailto:contato@baigi.com.br">contato@baigi.com.br</a>.
    </p>

    <h2 id="uso">5. Uso aceitável e conteúdo do usuário</h2>
    <ul>
      <li>O conteúdo que você envia continua sendo seu. Você nos concede uma licença limitada para armazená-lo e processá-lo (inclusive por IA) apenas para prestar o serviço a você.</li>
      <li>Não envie conteúdo ilegal, que viole direitos autorais de terceiros ou dados pessoais de outras pessoas sem base legal.</li>
      <li>É proibido tentar burlar limites, acessar dados de outros usuários, fazer engenharia reversa ou sobrecarregar o serviço.</li>
    </ul>

    <h2 id="ia">6. Limitações da IA</h2>
    <p>
      Resumos, flashcards, podcasts, simulados e respostas gerados por IA <strong>podem conter erros</strong>. Revise o
      material antes de confiar nele para provas ou decisões. O BAIGI é uma ferramenta de estudo e não substitui fontes
      oficiais, professores ou orientação profissional.
    </p>

    <h2 id="disponibilidade">7. Disponibilidade</h2>
    <p>
      Buscamos manter o serviço disponível 24 horas por dia, mas podem ocorrer interrupções para manutenção ou por
      falhas de terceiros. Funcionalidades podem ser alteradas para melhorar o produto.
    </p>

    <h2 id="responsabilidade">8. Limitação de responsabilidade</h2>
    <p>
      Na extensão permitida pela lei, o BAIGI não responde por danos indiretos, lucros cessantes ou resultados em provas.
      Nada nestes termos limita direitos garantidos pelo Código de Defesa do Consumidor.
    </p>

    <h2 id="rescisao">9. Rescisão</h2>
    <p>
      Você pode encerrar a conta a qualquer momento. Podemos suspender ou encerrar contas que violem estes termos,
      com aviso sempre que possível.
    </p>

    <h2 id="foro">10. Foro e lei aplicável</h2>
    <p>
      Estes termos seguem as leis brasileiras. Fica eleito o foro do domicílio do consumidor para resolver eventuais
      conflitos.
    </p>
  </LegalLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'landing' })

// TODO(jurídico): datas definitivas na publicação do texto revisado
const EFFECTIVE_DATE = '1º de outubro de 2026'
const UPDATED_AT = '29 de setembro de 2026'

const sections = [
  { id: 'aceitacao', title: 'Aceitação' },
  { id: 'conta', title: 'Conta' },
  { id: 'planos', title: 'Planos e cobrança' },
  { id: 'arrependimento', title: 'Direito de arrependimento' },
  { id: 'uso', title: 'Uso aceitável e conteúdo' },
  { id: 'ia', title: 'Limitações da IA' },
  { id: 'disponibilidade', title: 'Disponibilidade' },
  { id: 'responsabilidade', title: 'Limitação de responsabilidade' },
  { id: 'rescisao', title: 'Rescisão' },
  { id: 'foro', title: 'Foro e lei aplicável' },
]

useSeoMeta({
  title: 'Termos de Uso — BAIGI',
  description: 'Regras de uso do BAIGI: conta, planos, cobrança, cancelamento, direito de arrependimento e limitações da IA.',
})
</script>
