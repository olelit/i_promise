<script setup lang="ts">
defineProps<{ away: boolean; front?: boolean }>()
</script>

<template>
  <div class="room" :class="{ front }" aria-hidden="true">
    <svg class="scene" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice">
      <template v-if="!front">
        <rect x="0" y="0" width="400" height="700" fill="#f3e9dc" />
        <rect x="0" y="470" width="400" height="230" fill="#e2c49c" />
        <rect x="0" y="466" width="400" height="8" fill="#cfa87c" />
        <rect x="20" y="150" width="72" height="120" rx="10" fill="#bcd8e8" stroke="#cfa87c" stroke-width="8" />
        <line x1="56" y1="150" x2="56" y2="270" stroke="#cfa87c" stroke-width="6" />
        <line x1="20" y1="210" x2="92" y2="210" stroke="#cfa87c" stroke-width="6" />
        <rect x="130" y="180" width="140" height="300" rx="8" fill="#8c5a3b" />
        <rect x="142" y="192" width="116" height="288" fill="#5c4033" />
        <ellipse cx="200" cy="540" rx="150" ry="38" fill="#cfe6d4" />
      </template>
      <g v-else class="door front-door" :class="{ closed: away }">
        <rect x="142" y="192" width="116" height="288" rx="4" fill="#b07b52" />
        <circle cx="232" cy="350" r="6" fill="#f4d35e" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.room {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.room.front {
  z-index: 2;
}

.scene {
  width: 100%;
  height: 100%;
  display: block;
}

.door {
  transform-box: fill-box;
  transform-origin: left center;
}

.front-door {
  transform: scaleX(0.18);
  opacity: 0;
  transition: transform 0.5s ease;
}

.front-door.closed {
  transform: scaleX(1);
  opacity: 1;
  transition:
    transform 0.5s ease 0.7s,
    opacity 0.15s linear 0.7s;
}

@media (prefers-reduced-motion: reduce) {
  .front-door,
  .front-door.closed {
    transition: none;
  }
}
</style>
