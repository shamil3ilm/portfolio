(function () {
  /* Fresh example data for every visit, so the demos never repeat the same names, amounts or numbers.
     Names are drawn without repeats per page, so two demos on one page never share a business. */

  const BUSINESSES = [
    'Cedar Street Bakery', 'Harbor Realty', 'Blue Ridge IT', 'Metro Office Supplies', 'Sunrise Dental Clinic',
    'Riverside Auto Repair', 'Oakwood Pharmacy', 'Lakeside Café', 'Summit Plumbing', 'Green Valley Nursery',
    'Northgate Books', 'Brightside Cleaning', 'Pine Hill Vet Clinic', 'Silver Spoon Catering', 'Coastal Print Shop',
    'Redwood Fitness', 'Maple Leaf Florist', 'Hillcrest Tutoring', 'Main Street Hardware', 'Bayview Laundry',
    'Copper Kettle Diner', 'Westside Pediatrics', 'Evergreen Landscaping', 'Parkside Physio',
  ];
  const PROVIDERS = [
    'Northwind Payroll', 'Pinecrest HR', 'Ledgerline Bookkeeping', 'Keystone Payroll', 'Clearbooks Accounting',
    'Brightpath Payroll', 'Tallyhouse Accounting', 'Crestline HR',
  ];
  const SELLERS = [
    'Al Noor Trading Co.', 'Al Waha Supplies', 'Najd Office Solutions', 'Al Bayan Electronics',
    'Riyadh Fresh Foods', 'Al Safwa Printing', 'Qasr Building Materials', 'Al Rawabi Stationery',
  ];
  const SCHEDULE_NAMES = [
    'Office rent', 'Parking', 'IT support', 'Office supplies', 'Cleaning service', 'Insurance',
    'Software licences', 'Van lease', 'Security monitoring', 'Accounting retainer',
  ];
  // First two digits of a US routing number: a Federal Reserve district.
  const ROUTING_PREFIXES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '21', '22', '26', '31', '32'];

  function int(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pick(list) {
    return list[int(0, list.length - 1)];
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i);
      const t = copy[i];
      copy[i] = copy[j];
      copy[j] = t;
    }
    return copy;
  }

  // Each pool hands out names without repeats; once used up it starts a fresh round.
  function drawer(pool) {
    let bag = [];
    return function (count) {
      const out = [];
      while (out.length < (count || 1)) {
        if (!bag.length) bag = shuffle(pool).filter(function (n) { return out.indexOf(n) === -1; });
        out.push(bag.pop());
      }
      return count ? out : out[0];
    };
  }

  function digits(n) {
    let s = String(int(1, 9));
    while (s.length < n) s += String(int(0, 9));
    return s;
  }

  // A 9-digit routing number with a valid check digit (weights 3, 7, 1).
  function routing() {
    const body = pick(ROUTING_PREFIXES) + digits(6).slice(0, 6);
    const w = [3, 7, 1, 3, 7, 1, 3, 7];
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += Number(body[i]) * w[i];
    return body + String((10 - (sum % 10)) % 10);
  }

  // A round-ish money amount between min and max.
  function amount(min, max, step) {
    const s = step || 50;
    return Math.round(int(min, max) / s) * s || s;
  }

  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }

  function shortDate(d) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function clockTime(h, m) {
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  window.Sample = {
    int: int,
    pick: pick,
    shuffle: shuffle,
    business: drawer(BUSINESSES),
    provider: drawer(PROVIDERS),
    seller: drawer(SELLERS),
    scheduleName: drawer(SCHEDULE_NAMES),
    routing: routing,
    account: function () { return digits(int(8, 12)); },
    last4: function () { return digits(4); },
    amount: amount,
    invoiceNumber: function () { return int(1000, 8999); },
    // Saudi VAT numbers are 15 digits that start and end with 3.
    vatNumber: function () { return '3' + digits(13) + '3'; },
    daysAgo: daysAgo,
    shortDate: shortDate,
    clockTime: clockTime,
  };
})();
