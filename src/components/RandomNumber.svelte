<script lang='ts'>
import { each, fix_and_outro_and_destroy_block, text } from 'svelte/internal';

  import Section from './Section.svelte';
  import WaitingSpinner from './WaitingSpinner.svelte';

  type mathResults = {
    "text": string,
    "number": number,
    "found": boolean,
    "type": string
  }

  const sleep = (msec: number): Promise<any> => new Promise(resolve => setTimeout(resolve, msec));

  const fetchMath = (async (): Promise<mathResults[]> => {
    let resArray: mathResults[] = [];
    for(let i = 0; i < 10; i++) {
      const response: Response = await fetch('//numbersapi.com/random/math?json');
      resArray.push(await response.json());
      await sleep(500);
    }
    return resArray;
	})();
</script>

<Section title='Trivia about Math' imgpath='./img/rndnum.png' />
<div class='math-container'>
  {#await fetchMath}
  <WaitingSpinner />
  <span>Waiting for trivia about math...</span>
    {:then data}
    {#each data as {text, number, found, type}, i}
  <div class='math-trivia'><i class="fas fa-space-shuttle"></i> {text.replace(/\^\{th\}/gi, 'th')}</div>
    {/each}
    {:catch error}
  <span>Oops, Error occured... I hate math. Fuck math.</span><br>
  <span>Failed to load because <a href='http://numbersapi.com/#42'>Numbers API</a> doesn't support HTTPS connection. I send an email to developer of Numbers API, so please wait.</span>
  {/await}
</div>

<style lang="scss">
  @import '../assets/definition.scss';

  .math-container {
    @extend %center;
    width: 60vw;
    .math-trivia {
      text-align: left;
      margin-top: 20px;
      margin-bottom: 20px;
      font-size: 18px;
    }
  }

  @media screen and (max-width: 750px) {
    .math-container {
      width: 80vw !important;
    }
  }
</style>
