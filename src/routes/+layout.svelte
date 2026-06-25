<script lang="ts">
  import '../app.css';
  import { getTheme } from '$lib/storage';
  import { onMount } from 'svelte';

  let { children } = $props();

  onMount(() => {
    const theme = getTheme();
    applyTheme(theme);
  });

  function applyTheme(theme: 'system' | 'light' | 'dark') {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }
</script>

{@render children()}
