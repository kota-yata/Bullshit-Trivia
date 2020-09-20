<script lang="ts">
import WaitingSpinner from './WaitingSpinner.svelte';

const fetchJoke = (async (): Promise<any> => {
  const response: Response = await fetch('https://official-joke-api.appspot.com/jokes/random');
  return await response.json();
})();
</script>

<div class="joke-container">
  {#await fetchJoke}
    <WaitingSpinner />
    <span>Waiting for a funny joke...</span>
  {:then data}
    <div class="joke-setup">{data.setup}</div>
    <div class="joke-punchline">{data.punchline}</div>
  {:catch error}
    <span>Oops, Error occured... I'm not that funny</span>
  {/await}
</div>

<style lang="scss">
@import '../assets/definition.scss';

.joke-container {
  @extend %center;
  font-family: 'Playfair Display';
  background: $joke-background;
  padding: 20px;
  box-shadow: 0 5px 20px -8px $shadow inset, 0 -5px 20px -8px $shadow inset;
  .joke-setup {
    color: $joke-setup;
    font-size: 25px;
  }
  .joke-punchline {
    color: $joke-punchline;
    font-size: 35px;
    margin: 10px;
  }
}

@media screen and (max-width: 750px) {
  .joke-setup {
    font-size: 20px !important;
  }
  .joke-punchline {
    font-size: 25px !important;
  }
}
</style>
