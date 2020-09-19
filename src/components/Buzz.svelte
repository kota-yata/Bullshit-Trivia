<script lang='ts'>
  import Spinner from '@sveltekit/ui/Spinner';
  import Section from './Section.svelte';

  const fetchBuzzword = (async (): Promise<any> => {
    const response: Response = await fetch('https://corporatebs-generator.sameerkumar.website/');
    return await response.json()
  })()

</script>

<Section title='Bullshit Buzzword'>
</Section>
<div class='buzz-container'>
  {#await fetchBuzzword}
  <div class='spinner-container'><Spinner /></div>
    <span>Waiting for a fucking Bullshit...</span>
    {:then data}
    <div class='buzz-phrase-container'>
      <span class='buzz-phrase'>'{data.phrase}'</span>
    </div>
  {:catch error}
  <span>Oops, Error occured... I don't know any buzzword at all...</span>
  {/await}
</div>

<style lang='scss'>
  @import '../assets/definition.scss';

  .buzz-container {
    @extend %center;
    margin-bottom: 50px;
    .spinner-container {
      height: 30px;
    }
    .buzz-phrase {
      color: $joke-punchline;
      font-size: 35px;
    }
  }
</style>
