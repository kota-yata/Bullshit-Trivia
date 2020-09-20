<script lang='ts'>
  export let title: string;
  export let imgpath: string;
</script>

<div class='section-container'>
  <span><img alt='' src='{imgpath}' /> {title}</span>
</div>

<style lang='scss'>
  @import '../assets/definition.scss';

  .section-container {
    @extend %center;
    margin-top: 20px;
    margin-bottom: 10px;
    span {
      img {
        width: 40px;
        vertical-align: middle;
      }
      font-size: 25px;
      color: $taco-red;
    }
  }

  @media screen and (max-width: 750px) {
    span {
      img {
        width: 30px !important;
      }
      font-size: 20px !important;
    }
  }
</style>
