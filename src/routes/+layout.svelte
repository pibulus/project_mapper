<script lang="ts">
  import { onMount } from "svelte";
  import { initTheme } from "$lib/stores/themeStore";
  import "../app.css";

  onMount(() => {
    initTheme();
  });
</script>

<slot />

