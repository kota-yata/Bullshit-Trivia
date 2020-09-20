<script lang='ts'>
  import Section from './Section.svelte';
  import WaitingSpinner from './WaitingSpinner.svelte';

  const fetchBuzzword = (async (): Promise<any> => {
    const response: Response = await fetch('https://corporatebs-generator.sameerkumar.website/');
    return await response.json()
  })()

</script>

<Section title='Bullshit Buzzword' imgpath='./img/Buzz.png'>
</Section>
<div class='buzz-container'>
  {#await fetchBuzzword}
  <WaitingSpinner />
    <span>Waiting for a fucking Bullshit...</span>
    {:then data}
    <div class='buzz-phrase-container'>
      <span class='buzz-phrase'>"{data.phrase}"</span>
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
    .buzz-phrase {
      color: $black;
      font-size: 35px;
    }
  }
</style>
