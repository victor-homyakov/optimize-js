var doIt=(function(fun) {
  fun()
});
doIt(2, (function () {
  console.log('heya')
}))
