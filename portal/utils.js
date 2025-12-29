// portal/utils.js

function numberToWords(num) {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const transform = function(n) { let str = ''; let rem; if (n < 20) { str = a[n]; } else { rem = n % 10; str = b[Math.floor(n / 10)] + (rem > 0 ? '-' : '') + a[rem]; } return str; };
    const inWords = function(num) { if (num === 0) return 'zero'; let str = ''; const crore = Math.floor(num / 10000000); num %= 10000000; const lakh = Math.floor(num / 100000); num %= 100000; const thousand = Math.floor(num / 1000); num %= 1000; const hundred = Math.floor(num / 100); num %= 100; if (crore > 0) str += transform(crore) + 'crore '; if (lakh > 0) str += transform(lakh) + 'lakh '; if (thousand > 0) str += transform(thousand) + 'thousand '; if (hundred > 0) str += transform(hundred) + 'hundred '; if (num > 0) str += 'and ' + transform(num); return str.trim(); };
    return inWords(num);
};