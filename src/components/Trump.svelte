<script lang="ts">
import Section from './Section.svelte';
import WaitingSpinner from './WaitingSpinner.svelte';

const fetchTrump = (async (): Promise<any> => {
  const response: Response = await fetch('https://api.tronalddump.io/random/quote');
  return await response.json();
})();
</script>

<Section title="The Greatest Bullshit of America" imgpath="./img/donald.png" />
<div class="trump-container">
  {#await fetchTrump}
    <WaitingSpinner />
    <span>Waiting for a Trump...</span>
  {:then data}
    <div class="trump-url" id="trump_embed">
      <blockquote class="twitter-tweet tw-align-center" data-theme="dark">
        <p lang="en" dir="ltr">Fuck you</p><a href="{data._embedded.source[0].url}">Trump</a>
      </blockquote>
      <script async src="https://platform.twitter.com/widgets.js" charset="utf-8">
      </script>
    </div>
  {:catch error}
    <span>Oops, Error occured... Trump shuts down my server...</span>
  {/await}
</div>

<style lang="scss">
@import '../assets/definition.scss';

.trump-container {
  @extend %center;
  max-width: 90vw;
  margin-bottom: 50px;
}
</style>
