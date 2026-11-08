<template>
  <LegalLayout title="Termos de Uso" :effective-date="EFFECTIVE_DATE" :updated-at="UPDATED_AT" :sections="sections">
    <!-- TEXTO JURÍDICO PENDENTE: revisão de advogado obrigatória antes de produção (PRD ux-critica §8.1) -->
    <!-- TODO(jurídico): confirmar a política de reembolso com o advogado/contador (prd-pagamento-mercado-pago §8) -->
    <!-- Vendedor (Decreto 7.962/2013 art. 2): nome e CPF do catálogo (BILLING_SELLER_* da API); aqui e no checkout, nunca na landing -->
    <p data-testid="terms-seller">
      Estes termos regem o uso do BAIGI, serviço de estudo com repetição espaçada e inteligência artificial,
      oferecido por <template v-if="seller">{{ seller }}</template><span v-else class="placeholder">[[nome e CPF do responsável]]</span>,
      pessoa física responsável pelo BAIGI. Contato: <a :href="`mailto:${sellerEmail}`">{{ sellerEmail }}</a>.
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
      <li>O plano Grátis inclui uma prévia da IA, uma vez por conta e sem prazo, que pede o e-mail confirmado. O Intensivo tem cotas mensais de IA, conforme a página <NuxtLink to="/planos">Planos</NuxtLink>.</li>
      <!-- "Assinatura em breve" (checkout.available false): some quando o pagamento abrir -->
      <li v-if="!checkoutOpen">A assinatura do Intensivo ainda não está à venda, e nada é cobrado. Quando o pagamento abrir, valem as regras abaixo.</li>
      <li>Os pagamentos são processados pelo <strong>Mercado Pago</strong>. O BAIGI não recebe nem guarda o número do cartão. Na fatura, a compra aparece como <strong>{{ descriptor }}</strong>; no Pix, o app do banco mostra o nome do responsável pelo BAIGI.</li>
      <li><strong>Mensal no cartão:</strong> cobrado no cartão e renovado automaticamente a cada mês até você cancelar. Se uma cobrança não passar, o Mercado Pago tenta de novo por alguns dias; o Intensivo continua por até 3 dias depois da data da cobrança.</li>
      <li><strong>Mensal no Pix:</strong> pagamento único que vale por 30 dias, sem renovação automática. Avisamos por e-mail 3 dias antes e no dia do vencimento.</li>
      <li><strong>Anual:</strong> pagamento único que vale por 12 meses, sem renovação automática, no Pix (com desconto) ou no cartão em até 12 parcelas, com os juros do parcelamento pagos por quem compra e mostrados antes da confirmação. Avisamos por e-mail antes do vencimento.</li>
      <li>O cancelamento do mensal é feito a qualquer momento em Configurações, em dois cliques: o cartão deixa de ser cobrado na hora e o Intensivo vale até o fim do mês já pago, sem reembolso proporcional.</li>
      <li>Preços podem mudar; mudanças valem para a próxima renovação e são comunicadas com antecedência.</li>
    </ul>

    <h2 id="arrependimento">4. Direito de arrependimento</h2>
    <p>
      Nas contratações pela internet, você pode desistir em até 7 dias corridos a contar do pagamento (art. 49 do Código de
      Defesa do Consumidor) e receber de volta o valor total, sem precisar explicar o motivo. Vale para a primeira cobrança do
      mensal, para o Pix de 30 dias e para o anual. Peça em Configurações, em "Pedir reembolso", ou pelo suporte em
      <a :href="`mailto:${sellerEmail}`">{{ sellerEmail }}</a>. O acesso daquela compra termina na hora do pedido; o valor
      volta na fatura do cartão (o prazo depende do banco) ou na conta de onde saiu o Pix. Depois dos 7 dias, e nas renovações
      automáticas do mensal, o reembolso é avaliado pelo suporte, caso a caso. Uma contestação no cartão (chargeback)
      encerra o Intensivo daquela compra.
    </p>

    <h2 id="uso">5. Uso aceitável e conteúdo do usuário</h2>
    <ul>
      <li>O conteúdo que você envia continua sendo seu. Você nos concede uma licença limitada para armazená-lo e processá-lo (inclusive por IA) apenas para prestar o serviço a você.</li>
      <li>Não envie conteúdo ilegal, que viole direitos autorais de terceiros ou dados pessoais de outras pessoas sem base legal.</li>
      <li>É proibido tentar burlar limites, acessar dados de outros usuários, fazer engenharia reversa ou sobrecarregar o serviço.</li>
    </ul>

    <h2 id="uso-justo">6. Uso justo</h2>
    <ul>
      <li>As cotas de IA do Intensivo são mensais; as da prévia do Grátis valem uma vez por conta. Elas aparecem em <NuxtLink to="/planos">Planos</NuxtLink> e em Configurações, com o quanto você já usou.</li>
      <li>Criar várias contas para repetir a prévia grátis também é uso indevido.</li>
      <li>É proibido o uso automatizado (robôs, scripts), a revenda do acesso e o compartilhamento da conta com outras pessoas.</li>
      <li>Em caso de abuso, o BAIGI pode suspender a IA ou a conta, avisando por e-mail.</li>
    </ul>

    <h2 id="ia">7. Limitações da IA</h2>
    <p>
      Resumos, flashcards, podcasts, simulados e respostas gerados por IA <strong>podem conter erros</strong>. Revise o
      material antes de confiar nele para provas ou decisões. O BAIGI é uma ferramenta de estudo e não substitui fontes
      oficiais, professores ou orientação profissional.
    </p>

    <h2 id="disponibilidade">8. Disponibilidade</h2>
    <p>
      Buscamos manter o serviço disponível 24 horas por dia, mas podem ocorrer interrupções para manutenção ou por
      falhas de terceiros. Funcionalidades podem ser alteradas para melhorar o produto.
    </p>

    <h2 id="responsabilidade">9. Limitação de responsabilidade</h2>
    <p>
      Na extensão permitida pela lei, o BAIGI não responde por danos indiretos, lucros cessantes ou resultados em provas.
      Nada nestes termos limita direitos garantidos pelo Código de Defesa do Consumidor.
    </p>

    <h2 id="rescisao">10. Rescisão</h2>
    <p>
      Você pode encerrar a conta a qualquer momento. Podemos suspender ou encerrar contas que violem estes termos,
      com aviso sempre que possível.
    </p>

    <h2 id="foro">11. Foro e lei aplicável</h2>
    <p>
      Estes termos seguem as leis brasileiras. Fica eleito o foro do domicílio do consumidor para resolver eventuais
      conflitos.
    </p>
  </LegalLayout>
</template>

<script setup lang="ts">
import { sellerLine } from '~/utils/checkoutState'

definePageMeta({ layout: 'public' })

// Seller and checkout state from the catalog, read after hydration (the page is prerendered)
const { plans, fetchPlans } = usePlans()
const seller = computed(() => sellerLine(plans.value))
const sellerEmail = computed(() => plans.value?.checkout?.seller?.email || 'contato@baigi.com.br')
const descriptor = computed(() => plans.value?.checkout?.statement_descriptor || 'BAIGI')
const checkoutOpen = computed(() => checkoutAvailable(plans.value))
onMounted(() => { void fetchPlans() })

// TODO(jurídico): datas definitivas na publicação do texto revisado
const EFFECTIVE_DATE = '1º de outubro de 2026'
const UPDATED_AT = '8 de novembro de 2026'

const sections = [
  { id: 'aceitacao', title: 'Aceitação' },
  { id: 'conta', title: 'Conta' },
  { id: 'planos', title: 'Planos e cobrança' },
  { id: 'arrependimento', title: 'Direito de arrependimento' },
  { id: 'uso', title: 'Uso aceitável e conteúdo' },
  { id: 'uso-justo', title: 'Uso justo' },
  { id: 'ia', title: 'Limitações da IA' },
  { id: 'disponibilidade', title: 'Disponibilidade' },
  { id: 'responsabilidade', title: 'Limitação de responsabilidade' },
  { id: 'rescisao', title: 'Rescisão' },
  { id: 'foro', title: 'Foro e lei aplicável' },
]

useSeoMeta({
  title: 'Termos de Uso — BAIGI',
  description: 'Regras de uso do BAIGI: conta, planos, cobrança, cancelamento, direito de arrependimento, uso justo e limitações da IA.',
})
</script>
