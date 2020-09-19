<script lang='ts'>
  import Section from './Section.svelte';
  import Spinner from '@sveltekit/ui/Spinner';

  type triviaResults = {
    'category': string,
    'type': string,
    'difficulty': string,
    'question': string,
    'correct_answer': string,
    'incorrect_answers':string[]
  }

  const fetchTrivia = (async (): Promise<any> => {
    const response: Response = await fetch('https://opentdb.com/api.php?amount=10');
    const jsonData = await response.json();
    const results: triviaResults[] = jsonData.results;
    return results;
	})()
</script>

<Section title='10 Trivia Quizzes of this session' />
<div class='trivia-container'>
  {#await fetchTrivia}
  <div class='spinner-container'><Spinner /></div>
  <span>Waiting for trivia...</span>
    {:then data}
    {#each data as { category, type, difficulty, question, correct_answer, incorrect_answer }, i}
  <div class='trivia-card'>
    <div class='trivia-question-container'>
      <span class='trivia-question'>{question.replace(/&quot;/gi, '\"').replace(/&#039;/gi, '\'')} <span class='trivia-type'>- ({type})</span></span>
    </div>
    {#if difficulty === 'easy'}
    <div class='trivia-difficulty easy'>{difficulty} <span class='trivia-category'> - {category}</span></div>
    {:else if difficulty === 'medium'}
    <div class='trivia-difficulty medium'>{difficulty} <span class='trivia-category'> - {category}</span></div>
    {:else if difficulty === 'hard'}
    <div class='trivia-difficulty hard'>{difficulty} <span class='trivia-category'> - {category}</span></div>
    {/if}
    <button class='trivia-checkbtn' on:click = ''>Checking the answer</button>
    <div class='trivia-answer'>{correct_answer} </div>
  </div>
    {/each}
    {:catch error}
  <span>Oops, Error occured... There's no trivia at all</span>
  {/await}
</div>

<style lang='scss'>
  @import '../assets/definition.scss';

  .trivia-container {
    @extend %center;
    .spinner-container {
      height: 30px;
    }
    .trivia-card {
      @extend %center;
      position: relative;
      width: 80vw;
      background: $trivia-card;
      padding: 20px 0px;
      margin-top: 40px;
      margin-bottom: 40px;
      .trivia-question {
        font-size: 26px;
        .trivia-type {
          font-size: 15px;
        }
      }
      .trivia-difficulty {
        position: absolute;
        font-size: 25px;
        top: -20px;
        left: 5px;
        .trivia-category {
          color: $black;
          font-size: 15px;
        }
      }
      .easy {
        color: $trivia-easy;
      }
      .medium {
        color: $trivia-medium;
      }
      .hard {
        color: $trivia-hard;
      }
      .trivia-checkbtn {
        appearance: none;
        margin-top: 10px;
        margin-bottom: 10px;
        background: $taco-red;
        border-radius: 10px;
      }
    }
  }
</style>
