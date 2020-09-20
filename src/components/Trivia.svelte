<script lang='ts'>
  import Section from './Section.svelte';
  import WaitingSpinner from './WaitingSpinner.svelte';
  import { scale } from 'svelte/transition';

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
  })();
  
  let isAnswer: boolean[] = [];
  let isShowBtn: boolean[] = [];
  for(let i = 0; i < 10; i++) {
    isAnswer.push(false);
    isShowBtn.push(true);
  }

  const clickHandler = (id: number):void => {
    isAnswer[id] = true;
    isShowBtn[id] = false;
  }
</script>

<Section title='10 Trivia Quizzes of this session' imgpath='./img/quiz.png' />
<div class='trivia-container'>
  {#await fetchTrivia}
  <WaitingSpinner />
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
    {#if isShowBtn[i]}
    <button class='trivia-checkbtn' on:click = {() => clickHandler(i)}>Check the answer</button>
    {/if}
    {#if isAnswer[i]}
    <div class='trivia-answer' transition:scale={{duration: 500}}>{correct_answer.replace(/&quot;/gi, '\"').replace(/&#039;/gi, '\'')} </div>
    {/if}
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
    margin-bottom: 50px;
    .trivia-card {
      @extend %center;
      position: relative;
      width: 80vw;
      background: $trivia-card;
      padding: 20px;
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
        cursor: pointer;
        appearance: none;
        margin-top: 20px;
        background: $taco-red;
        color: $white;
        border-radius: 10px;
        border: none;
        &:hover {
          opacity: 0.8;
        }
        &:active {
          opacity: 0.6;
        }
      }
      .trivia-answer {
        margin-top: 20px;
        font-size: 30px;
        color: $taco-red;
      }
    }
  }
</style>
