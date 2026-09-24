# Tamagotchi Stage 8: Doorway Alignment and Exit Behind the Door — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Remove the hint text, anchor the character to the room floor in the doorway, and make the character shrink into the doorway with the door closing in front of it.

**Architecture:** `.pet-wrap` becomes viewport-anchored (`bottom: 32.5vh`) to match the room's floor line; the room's doorway grows and the door leaf moves to a second `RoomScene` layer rendered in front of the content (`front` prop) with delayed closing; the character's exit transform shrinks into the doorway.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9.

## Global Constraints

- Commit messages MUST be written in English only.
- Telegram access via `src/telegram.ts`; persistence via `src/storage.ts`; no backend/network.
- `<script setup lang="ts">`, strict TS.
- 2D transforms only; fixed room and character palettes.
- No test suite: verification per task is `npm run typecheck` + `npm run build` plus listed browser checks.

---

### Task 1: Hint removal, floor anchoring, taller doorway

**Files:**
- Modify: `src/components/MoodControls.vue`, `src/App.vue`, `src/components/RoomScene.vue`

**Interfaces:**
- Consumes: `MoodIndicator`, `RoomScene`.
- Produces: no hint; character anchored to the floor line; taller doorway.

- [ ] **Step 1: Remove the hint from `MoodControls.vue`**

Delete the `<p class="hint">…</p>` paragraph and the `.hint` style rule, and put
the `v-else` directly on the feed wrapper:

```html
  <section class="controls">
    <p v-if="remainingMs !== null" class="away">
      Он ушёл. Вернётся через {{ formatRemaining(remainingMs) }}
    </p>
    <div v-else class="feed-wrap" @click="handleWrapClick">
      <button class="feed" type="button" :disabled="blockReason !== null" @click.stop="handleFeed">
        {{ feedLabel }}
      </button>
    </div>
  </section>
```

- [ ] **Step 2: Anchor the character in `src/App.vue`**

Replace the `.pet-wrap` rule:

```css
.pet-wrap {
  position: fixed;
  left: 50%;
  bottom: 32.5vh;
  transform: translateX(-50%);
}
```

(The previous `position: relative; margin-top: 60px;` goes away. The speech
bubble still anchors to `.pet-wrap` because fixed elements are positioned.)

- [ ] **Step 3: Taller doorway in `src/components/RoomScene.vue`**

Frame and opening grow upward (the leaf stays in this layer for now):

```html
      <rect x="130" y="180" width="140" height="300" rx="8" fill="#8c5a3b" />
      <rect x="142" y="192" width="116" height="288" fill="#5c4033" />
      <g class="door" :class="{ closed: away }">
        <rect x="142" y="192" width="116" height="288" rx="4" fill="#b07b52" />
        <circle cx="232" cy="350" r="6" fill="#f4d35e" />
      </g>
```

- [ ] **Step 4: Verify and commit**

`npm run typecheck`, `npm run build` → exit 0.
Headless at 390×780: no `.hint`; the character's feet (`.scene` bottom rect)
match the room floor line within ~6px (floor screen y = `470 / 700 * viewport
height` on portrait); screenshot /tmp/doorway-present.png.

```bash
git add src/components/MoodControls.vue src/App.vue src/components/RoomScene.vue
git commit -m "Align the character with the doorway and drop the hint"
```

---

### Task 2: Exit behind the door

**Files:**
- Modify: `src/components/RoomScene.vue`, `src/App.vue`, `src/components/Tamagotchi.vue`, `README.MD`

**Interfaces:**
- Consumes: `RoomScene` (new `front` prop), the character's `away` prop.
- Produces: a front door layer that closes in front of the leaving character.

- [ ] **Step 1: `RoomScene.vue` front layer**

Add the prop and split the template:

```ts
defineProps<{ away: boolean; front?: boolean }>()
```

```html
    <svg class="scene" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice">
      <template v-if="!front">
        <!-- wall, floor, window, frame, opening, rug (the leaf is removed) -->
      </template>
      <g v-else class="door front-door" :class="{ closed: away }">
        <rect x="142" y="192" width="116" height="288" rx="4" fill="#b07b52" />
        <circle cx="232" cy="350" r="6" fill="#f4d35e" />
      </g>
    </svg>
```

Remove the back-layer leaf group (the frame and dark opening stay). Styles:

```css
.room.front {
  z-index: 2;
}

.front-door {
  transform: scaleX(0.18);
  opacity: 0;
  transition: transform 0.5s ease;
}

.front-door.closed {
  transform: scaleX(1);
  opacity: 1;
  transition: transform 0.5s ease 0.7s;
}
```

(keep the existing `.door { transform-box: fill-box; transform-origin: left center; }`
rule shared by both leaves)

- [ ] **Step 2: Render the front layer in `src/App.vue`**

After `<main class="content">…</main>` add:

```html
    <RoomScene :away="away" front />
```

- [ ] **Step 3: `Tamagotchi.vue` exit animation**

```ts
const exitStyle = computed(() => ({
  transform: props.away ? 'translateY(-26px) scale(0.32)' : 'translateY(0) scale(1)',
}))
```

Template: the exit wrapper gets the class binding:

```html
    <div class="exit" :class="{ away }" :style="exitStyle">
```

Styles (replace the `.exit` transition):

```css
.exit {
  transform-origin: bottom center;
  transition: transform 0.8s ease 0.45s;
}

.exit.away {
  transition: transform 0.8s ease;
}
```

- [ ] **Step 4: README**

Update the room paragraph: the character leaves into the doorway and the door
closes behind it.

- [ ] **Step 5: Verify and commit**

`npm run typecheck`, `npm run build` → exit 0.
Headless: with an away state the front leaf has `opacity: 1` and, after ~1.4s,
transform `matrix(1, 0, 0, 1, 0, 0)`; the character's exit wrapper transform
contains `0.32`; on return the leaf is `opacity: 0` and the character's
transform returns to identity after the delay. Screenshots: mid-exit and closed
door (/tmp/doorway-exit.png, /tmp/doorway-closed.png).

```bash
git add src/components/RoomScene.vue src/App.vue src/components/Tamagotchi.vue README.MD
git commit -m "Send the character through the door and close it behind"
```
