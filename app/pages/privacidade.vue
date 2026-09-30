<template>
  <LegalLayout title="Política de Privacidade" :effective-date="EFFECTIVE_DATE" :updated-at="UPDATED_AT" :sections="sections">
    <!-- TEXTO JURÍDICO PENDENTE: revisão de advogado obrigatória antes de produção (PRD ux-critica §8.1) -->
    <!-- TODO(jurídico): substituir [[CNPJ]] e [[ENCARREGADO_LGPD]] pelos dados reais -->
    <p>
      Esta política explica quais dados pessoais o BAIGI trata, para quê, com quem compartilha e como você exerce
      seus direitos previstos na Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
    </p>

    <h2 id="controlador">1. Controlador e encarregado</h2>
    <p>
      O controlador dos dados é o BAIGI, inscrito no CNPJ <span class="placeholder">[[CNPJ]]</span>.
      O encarregado pelo tratamento de dados pessoais (DPO) é <span class="placeholder">[[ENCARREGADO_LGPD]]</span>,
      que pode ser contatado pelo e-mail <a href="mailto:privacidade@baigi.com.br">privacidade@baigi.com.br</a>.
    </p>

    <h2 id="dados">2. Dados que coletamos</h2>
    <ul>
      <li><strong>Cadastro:</strong> nome, e-mail, senha (armazenada apenas como hash) ou identificador da conta Google.</li>
      <li><strong>Conteúdo de estudo:</strong> cadernos, notas, flashcards, PDFs, áudios, imagens, provas e simulados que você cria ou envia.</li>
      <li><strong>Uso:</strong> revisões realizadas, avaliações, sequência de dias, preferências e registros técnicos (IP, navegador, data e hora).</li>
      <li><strong>Pagamento:</strong> processado pela Stripe. O BAIGI não armazena número de cartão; guardamos apenas o status da assinatura e o histórico de cobranças.</li>
      <li><strong>E-mail transacional:</strong> enviado pela Resend (verificação de conta, redefinição de senha, avisos da assinatura e exportação de dados).</li>
      <li><strong>Analytics:</strong> eventos de uso do produto via PostHog, somente com o seu consentimento. Os eventos usam um identificador interno da conta, sem nome, e-mail ou conteúdo de estudo, e o IP não é armazenado. Eventos de cobrança (início, cancelamento e fim da assinatura) são registrados mesmo sem consentimento, de forma pseudonimizada e sem perfil, para contabilidade.</li>
    </ul>

    <h2 id="finalidades">3. Finalidades e bases legais</h2>
    <ul>
      <li><strong>Execução de contrato</strong> (art. 7º, V): criar e manter sua conta, gerar materiais de estudo, agendar revisões e processar pagamentos.</li>
      <li><strong>Legítimo interesse</strong> (art. 7º, IX): segurança, prevenção a fraudes e abuso, métricas agregadas de cobrança e melhoria do serviço.</li>
      <li><strong>Consentimento</strong> (art. 7º, I): analytics de produto e comunicações de marketing. Você pode revogar a qualquer momento.</li>
      <li><strong>Cumprimento de obrigação legal</strong> (art. 7º, II): guarda de registros de acesso (Marco Civil da Internet) e dados fiscais.</li>
    </ul>

    <h2 id="compartilhamento">4. Compartilhamento e transferência internacional</h2>
    <p>Compartilhamos dados apenas com operadores necessários para prestar o serviço:</p>
    <ul>
      <li><strong>OpenAI</strong> e <strong>Google (Gemini)</strong>: processamento por IA do conteúdo que você pede para transformar (cards, notas, podcasts, simulados).</li>
      <li><strong>AWS</strong>: armazenamento de arquivos (PDFs, áudios, imagens).</li>
      <li><strong>Stripe</strong>: pagamentos. <strong>Resend</strong>: e-mails. <strong>PostHog</strong> (PostHog Inc., nuvem na União Europeia): operador de analytics de produto, com consentimento.</li>
      <li><strong>Vercel</strong> e <strong>Contabo</strong>: hospedagem do site e da API.</li>
    </ul>
    <p>
      Alguns desses operadores ficam fora do Brasil. A transferência internacional ocorre com base no art. 33 da LGPD,
      com cláusulas contratuais e garantias de segurança compatíveis. Não vendemos seus dados.
    </p>

    <h2 id="retencao">5. Retenção e exclusão</h2>
    <p>
      Mantemos seus dados enquanto a conta estiver ativa. Ao excluir a conta, apagamos conteúdo, arquivos e histórico de
      estudo. Registros de acesso são guardados por 6 meses (Marco Civil) e dados fiscais de cobrança permanecem na Stripe
      pelo prazo exigido em lei. Arquivos de exportação expiram em 7 dias.
    </p>

    <h2 id="direitos">6. Seus direitos e como exercê-los</h2>
    <p>Pelo art. 18 da LGPD, você pode, a qualquer momento:</p>
    <ul>
      <li>confirmar a existência de tratamento e acessar seus dados;</li>
      <li>corrigir dados incompletos ou desatualizados (em <NuxtLink to="/configuracoes#perfil">Configurações → Perfil</NuxtLink>);</li>
      <li>obter a portabilidade — <NuxtLink to="/configuracoes#seus-dados">Configurações → Seus dados → Exportar meus dados</NuxtLink>;</li>
      <li>eliminar seus dados — <NuxtLink to="/configuracoes#conta">Configurações → Conta → Excluir conta</NuxtLink>;</li>
      <li>revogar consentimentos e saber com quem seus dados são compartilhados.</li>
    </ul>
    <p>
      Se preferir, escreva para o encarregado em <a href="mailto:privacidade@baigi.com.br">privacidade@baigi.com.br</a>.
      Respondemos em até 15 dias.
    </p>

    <h2 id="cookies">7. Cookies</h2>
    <ul>
      <li><strong>Essenciais:</strong> cookie de sessão e proteção CSRF, necessários para você entrar e usar o app, e o cookie <code>baigi_consent</code>, que guarda a sua escolha por 12 meses. Não podem ser desativados.</li>
      <li><strong>Analytics (opcional):</strong> cookie e armazenamento local do PostHog (<code>ph_*</code>), criados apenas se você consentir no aviso de cookies. Você pode revogar a qualquer momento em <NuxtLink to="/configuracoes#privacidade">Configurações → Privacidade</NuxtLink>; a coleta para na hora.</li>
    </ul>

    <h2 id="seguranca">8. Segurança</h2>
    <p>
      Usamos conexão criptografada (HTTPS), senhas com hash, cookies de sessão HttpOnly, controle de acesso por usuário e
      arquivos privados com links temporários. Em caso de incidente relevante, comunicaremos você e a ANPD.
    </p>

    <h2 id="menores">9. Menores de idade</h2>
    <p>
      O BAIGI é destinado a maiores de 18 anos ou a adolescentes com autorização dos responsáveis, conforme o art. 14 da
      LGPD. Se identificarmos dados de menores sem essa autorização, eles serão excluídos.
    </p>

    <h2 id="alteracoes">10. Alterações e vigência</h2>
    <p>
      Podemos atualizar esta política. Mudanças relevantes serão avisadas por e-mail ou no app antes de entrarem em vigor.
      Esta versão vale a partir de {{ EFFECTIVE_DATE }}. Veja também os <NuxtLink to="/termos">Termos de Uso</NuxtLink>.
    </p>
  </LegalLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'landing' })

// TODO(jurídico): datas definitivas na publicação do texto revisado
const EFFECTIVE_DATE = '1º de outubro de 2026'
const UPDATED_AT = '29 de setembro de 2026'

const sections = [
  { id: 'controlador', title: 'Controlador e encarregado' },
  { id: 'dados', title: 'Dados que coletamos' },
  { id: 'finalidades', title: 'Finalidades e bases legais' },
  { id: 'compartilhamento', title: 'Compartilhamento' },
  { id: 'retencao', title: 'Retenção e exclusão' },
  { id: 'direitos', title: 'Seus direitos' },
  { id: 'cookies', title: 'Cookies' },
  { id: 'seguranca', title: 'Segurança' },
  { id: 'menores', title: 'Menores de idade' },
  { id: 'alteracoes', title: 'Alterações e vigência' },
]

useSeoMeta({
  title: 'Política de Privacidade — BAIGI',
  description: 'Como o BAIGI trata seus dados pessoais, com quem compartilha e como exercer seus direitos da LGPD.',
})
</script>
