<template>
  <div class="auth-page">
    <slot />
    <ShellToastHost />
  </div>
</template>

<script setup lang="ts">
// Layout of /entrar, /criar-conta, /esqueci-senha and /redefinir-senha (visual of the landing, owner's call of 17/11):
// only the scope and its CSS; the split screen and the band are components/auth/Split.vue, filled by each page.
// The CSS goes out as this layout's own chunk (_nuxt/auth-split.*.css), out of entry.css and of the precache. The
// pages of the onboarding (/comecar/areas, /comecar/pronto, the logged-in /comecar) keep layouts/auth.vue.
import '~/components/auth/auth-split.css'
</script>
