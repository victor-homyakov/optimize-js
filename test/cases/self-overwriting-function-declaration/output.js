const fn1 = (function (e) {
  var c=(function   () {
    e.exports = c = (function () {
      return 'result'
    })
    return c()
  });

  e.exports = c
});

const fn2 = (function (e) {
  var cde=(function() {
    e.exports = cde = (function () {
      return 'result'
    })
    return cde()
  });

  e.exports = cde
});

const mod = {}
fn1(mod)
console.log(mod, mod.exports())
fn2(mod)
console.log(mod, mod.exports())
