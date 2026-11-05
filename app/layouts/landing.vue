<template>
  <div class="min-h-screen bg-page">
    <!-- The scope of components/landing/landing.css: toasts stay out of it, with the classes of the app -->
    <div class="landing-page"><slot /></div>
    <ShellToastHost />
  </div>
</template>
