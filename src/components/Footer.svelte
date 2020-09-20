<div class="footer">
  <div class="contribute">
    <a href="https://github.com/kota-yata/Bullshit-Trivia"><i class="fab fa-github"></i> Contribute to Bullshit</a>
  </div>
  <div class="copyright">© 2020 <a href="https://www.kota-yata.com">Kota Yatagai</a></div>
</div>

<style lang="scss">
@import '../assets/definition.scss';

.footer {
  @extend %center;
  margin-top: 50px;
  margin-bottom: 20px;
  border-top: 5px $taco-red double;
  a {
    color: $taco-red;
  }
  .contribute {
    margin-top: 20px;
  }
  .copyright {
    margin-top: 10px;
    color: $taco-red;
    font-size: 25px;
  }
}
</style>
