<script lang="ts">
import { scale } from 'svelte/transition';
import { onMount } from 'svelte';

let isVisible: boolean = false;

onMount((): void => {
  isVisible = true;
});
</script>

{#if isVisible}
  <nav transition:scale="{{ duration: 2000 }}">
    <span id="nav-title"><img alt="taco" src="./img/cat.png" />Bullshit Trivia</span>
  </nav>
{/if}

<style lang="scss">
@import '../assets/definition.scss';

nav {
  @extend %center;
  padding: 10px 0px;
  #nav-title {
    font-size: 40px;
    color: $taco-red;
    img {
      margin-right: 20px;
      width: 60px;
      vertical-align: middle;
    }
  }
}

@media screen and (max-width: 750px) {
  #nav-title {
    font-size: 30px !important;
    img {
      width: 40px !important;
    }
  }
}
</style>
