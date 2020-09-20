<script lang="ts">
import Section from './Section.svelte';
/* import WaitingSpinner from './WaitingSpinner.svelte';

const today = new Date();
const thisMonth = today.getMonth() + 1;
const thisDate = today.getDate();

const fetchTodayTrivia = (async (): Promise<any> => {
  const response: Response = await fetch(`//numbersapi.com/${thisMonth}/${thisDate}/date?json`);
  return await response.json();
})(); */
</script>

<Section title="Trivia about Today" imgpath="./img/today.png" />
<div class="today-container">
  <!--{#await fetchTodayTrivia}
    <WaitingSpinner />
    <span>Waiting for a funny joke...</span>
  {:then data}
    <div class="trivia-date">{data.year}/{thisMonth}/{thisDate}</div>
    <div class="today-trivia">{data.text}</div>
  {:catch error}
    <span>Oops, Error occured... Today is not so vital in human history</span><br />
    <span>Failed to load because <a href="http://numbersapi.com/#42">Numbers API</a> doesn't support HTTPS connection. I
      send an email to developer of Numbers API, so please wait.</span>
  {/await}!-->
  <span>Oops, Error occured... Today is not so vital in human history</span><br />
  <span>Failed to load because <a href="http://numbersapi.com/#42">Numbers API</a> doesn't support HTTPS connection. I send
    an email to developer of Numbers API, so please wait.</span>
</div>

<style lang="scss">
@import '../assets/definition.scss';

.today-container {
  @extend %center;
  margin-bottom: 50px;
  .trivia-date {
    @extend %center;
    width: 300px;
    font-size: 30px;
    border-bottom: 3px $taco-red solid;
    margin-bottom: 10px;
  }
}
</style>
