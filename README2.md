Fork пакета https://github.com/nolanlawson/optimize-js

В оригинальном пакете мотивация была в избегании двойного парсинга (избегали pre-parse).
На данный момент мотивация заключается в переносе компиляции на background тред.
В оригинальном пакете в скобки оборачивались только IIFE-like функции, в текущем оборачиваются абсолютно все функции.