<script lang='ts'>
  export let title: string;
</script>

<div class='section-container'>
  <h2>{title}</h2>
</div>

<style lang='scss'>
  @import '../assets/definition.scss';

  .section-container {
    @extend %center;
    margin-top: 20px;
    h2 {
      color: $taco-red;
    }
  }
</style>
