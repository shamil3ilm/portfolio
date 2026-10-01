(function () {
  function setResult(node, text, tone) {
    node.textContent = text;
    node.dataset.tone = tone || '';
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand('copy');
      field.remove();
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  function flash(button, text) {
    const original = button.dataset.label || button.textContent;
    button.dataset.label = original;
    button.textContent = text;
    setTimeout(function () { button.textContent = original; }, 1600);
  }

  /* US routing number checker (ABA check digit) */

  (function routingTool() {
    const input = document.querySelector('[data-routing="input"]');
    if (!input) return;
    const result = document.querySelector('[data-routing="result"]');
    const DISTRICTS = ['', 'Boston', 'New York', 'Philadelphia', 'Cleveland', 'Richmond', 'Atlanta',
      'Chicago', 'St. Louis', 'Minneapolis', 'Kansas City', 'Dallas', 'San Francisco'];
    const WEIGHTS = [3, 7, 1, 3, 7, 1, 3, 7, 1];

    function describePrefix(prefix) {
      if (prefix === 0) return 'issued for US government use';
      if (prefix >= 1 && prefix <= 12) return 'a bank in the Federal Reserve ' + DISTRICTS[prefix] + ' district';
      if (prefix >= 21 && prefix <= 32) return 'a savings institution in the ' + DISTRICTS[prefix - 20] + ' district';
      if (prefix >= 61 && prefix <= 72) return 'electronic payments in the ' + DISTRICTS[prefix - 60] + ' district';
      if (prefix === 80) return "traveler's checks";
      return null;
    }

    function check() {
      const digits = input.value.replace(/\D/g, '').slice(0, 9);
      input.value = digits;
      if (!digits) {
        setResult(result, 'Type a 9-digit routing number.', '');
        return;
      }
      if (digits.length < 9) {
        setResult(result, 'Keep typing: ' + digits.length + ' of 9 digits.', '');
        return;
      }
      const prefix = parseInt(digits.slice(0, 2), 10);
      const meaning = describePrefix(prefix);
      if (!meaning) {
        setResult(result, '✕ Not valid: US routing numbers never start with ' + digits.slice(0, 2) + '.', 'bad');
        return;
      }
      const sum = WEIGHTS.reduce(function (total, weight, i) { return total + weight * Number(digits[i]); }, 0);
      if (sum % 10 !== 0) {
        setResult(result, "✕ Not valid: the check digit doesn't match. It's probably a typo.", 'bad');
        return;
      }
      setResult(result, '✓ Valid format. The first two digits point to ' + meaning + '.', 'ok');
    }

    input.addEventListener('input', check);
    check();
  })();

  /* Check amount in words */

  (function wordsTool() {
    const input = document.querySelector('[data-words="input"]');
    if (!input) return;
    const result = document.querySelector('[data-words="result"]');
    const copyButton = document.querySelector('[data-words="copy"]');
    const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const MAX = 999999999.99;

    function underThousand(n) {
      const parts = [];
      if (n >= 100) {
        parts.push(ONES[Math.floor(n / 100)] + ' hundred');
        n %= 100;
      }
      if (n >= 20) {
        parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''));
      } else if (n > 0) {
        parts.push(ONES[n]);
      }
      return parts.join(' ');
    }

    function toWords(n) {
      if (n === 0) return 'zero';
      const groups = [[1000000, 'million'], [1000, 'thousand']];
      const parts = [];
      groups.forEach(function (g) {
        if (n >= g[0]) {
          parts.push(underThousand(Math.floor(n / g[0])) + ' ' + g[1]);
          n %= g[0];
        }
      });
      if (n > 0) parts.push(underThousand(n));
      return parts.join(' ');
    }

    // Live thousands separators with up to 2 decimals.
    function formatInput() {
      let cleaned = input.value.replace(/[^\d.]/g, '');
      const dot = cleaned.indexOf('.');
      if (dot !== -1) cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
      const parts = cleaned.split('.');
      const whole = (parts[0] || '').replace(/^0+(?=\d)/, '').slice(0, 9);
      input.value = (whole ? Number(whole).toLocaleString('en-US') : parts.length > 1 ? '0' : '') + (parts.length > 1 ? '.' + parts[1] : '');
    }

    function render() {
      const value = parseFloat(input.value.replace(/,/g, ''));
      if (!isFinite(value)) {
        result.textContent = 'Type an amount, like 1,250.75';
        copyButton.disabled = true;
        return;
      }
      const amount = Math.min(value, MAX);
      const dollars = Math.floor(amount);
      const cents = Math.round((amount - dollars) * 100);
      const words = toWords(dollars);
      result.textContent = words.charAt(0).toUpperCase() + words.slice(1) + ' and ' + String(cents).padStart(2, '0') + '/100 dollars';
      copyButton.disabled = false;
    }

    input.addEventListener('input', function () {
      const caretFromEnd = input.value.length - (input.selectionStart === null ? input.value.length : input.selectionStart);
      formatInput();
      const position = Math.max(0, input.value.length - caretFromEnd);
      input.setSelectionRange(position, position);
      render();
    });
    copyButton.addEventListener('click', function () {
      copyText(result.textContent).then(function () { flash(copyButton, 'Copied ✓'); }, function () { flash(copyButton, 'Copy failed'); });
    });
    render();
  })();
})();
