<template>
  <div class="sr-only" role="status">Abrindo as provas em Progresso…</div>
</template>

<script setup lang="ts">
// The agenda lives in Progresso (prd-4f-progresso-v3 RF-F12): /provas is a 301 on the edge (routeRules) and this
// page covers the navigation inside the app; ?nova=1 opens the exam dialog there. /provas/resultado stays.
const route = useRoute()
const nova = route.query.nova === '1'
await navigateTo({ path: '/progresso', query: nova ? { nova_prova: '1' } : {}, hash: '#provas' }, { replace: true })
</script>
