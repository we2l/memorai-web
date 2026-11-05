<template>
  <!-- The flat lilac panel behind the app: the only lilac block of the first screen (no glow, no gradient) -->
  <div class="mx-auto mt-8 max-w-page rounded-card bg-tinted px-4 py-6 sm:px-8 lg:mt-14 lg:px-10 lg:py-12">
    <div class="grid items-center gap-5 lg:grid-cols-3 lg:gap-10">
      <!-- The app itself, in a phone -->
      <div class="relative order-2 mx-auto w-72 lg:w-80">
        <div class="rounded-device bg-raised p-2 shadow-float ring-1 ring-line-strong">
          <div class="overflow-hidden rounded-screen">
            <div v-for="v in HERO_VARIANTS" :key="v.key" :data-m-variant="v.key">
              <LandingShot :name="v.shot" :priority="v.key === 'padrao'" bare />
            </div>
          </div>
        </div>
        <picture class="absolute -bottom-3 -left-4 block lg:-bottom-4 lg:-left-14">
          <source srcset="~/assets/mascots/mascot-baigi.avif" type="image/avif">
          <img src="~/assets/mascots/mascot-baigi.webp" alt="" width="80" height="80" decoding="async" class="size-16 object-contain lg:size-20">
        </picture>
      </div>

      <!-- What the screen proves, around it (as Knowt annotates its phone) -->
      <div class="order-1 flex flex-col gap-4">
        <div class="rounded-card bg-raised p-5 text-left shadow-raised ring-1 ring-line" data-testid="landing-numbers">
          <p class="text-meta font-semibold text-fg-strong">Quanto você vai lembrar na prova</p>
          <div class="mt-3 flex gap-8">
            <p class="flex flex-col">
              <span class="text-stat tabular-nums text-fg-strong">{{ demo.keep_pace }}%</span>
              <span class="mt-1 text-meta text-fg-muted">mantendo o ritmo</span>
            </p>
            <p class="flex flex-col">
              <span class="text-stat tabular-nums text-fg-strong">{{ demo.stop_today }}%</span>
              <span class="mt-1 text-meta text-fg-muted">se parar hoje</span>
            </p>
          </div>
          <p class="mt-3 text-label text-fg-muted">{{ demo.exam }} em {{ demo.days }} dias, na conta de demonstração da tela.</p>
        </div>
        <LandingNote :note="ANNOTATIONS[0]" class="max-lg:hidden" />
      </div>
      <div class="order-3 flex flex-col gap-4">
        <LandingNote :note="ANNOTATIONS[0]" class="lg:hidden" />
        <LandingNote :note="ANNOTATIONS[1]" />
        <LandingNote :note="ANNOTATIONS[2]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// The real app of the hero (prd-landing-v4 RF-L2): the Hoje of the demo account in a phone, and around it what the
// screen proves. The two numbers in large type come from the same account at capture time (demo.json, written by
// e2e/landing/shots.ts), so the text never disagrees with the screen.
import demo from '~/assets/landing/demo.json'
import { ANNOTATIONS, HERO_VARIANTS } from '~/utils/landing'
</script>
