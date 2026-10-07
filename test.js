// Run: node test.js
// Loads the CORE block out of index.html so the tests exercise the code that actually ships.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = /\/\* ===== CORE-START[\s\S]*?\*\/([\s\S]*?)\/\* ===== CORE-END/.exec(html);
if (!m) { console.error('Could not find CORE block in index.html'); process.exit(2); }
const ctx = {};
vm.createContext(ctx);
vm.runInContext(m[1] + '\nthis.computeDeadline = computeDeadline;', ctx);
const compute = ctx.computeDeadline;

// Expected values were derived by hand from the calendar (weekdays cross-checked with `date`).
const cases = [
  { name: '1. Ordinary weekday, no adjustment',
    in: { trigger: '2026-03-02', days: 14 }, want: '2026-03-16' },
  { name: '2. Lands on Saturday -> Monday',
    in: { trigger: '2026-03-04', days: 10 }, want: '2026-03-16' },
  { name: '3. Lands on Sunday -> Monday',
    in: { trigger: '2026-03-05', days: 10 }, want: '2026-03-16' },
  { name: '4. Lands on Juneteenth (Fri 2026-06-19) -> Monday',
    in: { trigger: '2026-06-05', days: 14 }, want: '2026-06-22' },
  { name: '5. Holiday weekend: Sat 5/23, Sun, Memorial Day Mon 5/25 -> Tue 5/26',
    in: { trigger: '2026-05-15', days: 8 }, want: '2026-05-26' },
  { name: "6. Spans New Year's; lands on Jan 1 (Fri) -> Mon 1/4",
    in: { trigger: '2026-12-18', days: 14 }, want: '2027-01-04' },
  { name: "7. Spans New Year's; 30 days lands on ordinary Tue 2027-01-19",
    in: { trigger: '2026-12-20', days: 30 }, want: '2027-01-19' },
  { name: '8. Thanksgiving (Thu 11/26) -> Friday 11/27 (day after is not a legal holiday)',
    in: { trigger: '2026-11-12', days: 14 }, want: '2026-11-27' },
  { name: '9. Columbus Day (2nd Mon Oct, 10/12) -> Tue 10/13',
    in: { trigger: '2026-09-28', days: 14 }, want: '2026-10-13' },
  { name: '10. Leap day lands on Tue 2028-02-29',
    in: { trigger: '2028-02-15', days: 14 }, want: '2028-02-29' },
  { name: '11. Juneteenth was not a holiday in 2020 (Fri 6/19/2020): no adjustment',
    in: { trigger: '2020-06-05', days: 14 }, want: '2020-06-19' },
  { name: '12. Extra holiday: Christmas Fri -> Mon 12/28, which is also declared -> Tue 12/29',
    in: { trigger: '2026-12-11', days: 14, extra: ['2026-12-28'] }, want: '2026-12-29' },
  { name: '13. Jan 1, 2028 is a Saturday; observed OFF -> Fri 12/31/2027 counts as a normal day',
    in: { trigger: '2027-12-17', days: 14 }, want: '2027-12-31' },
  { name: '14. Same, observed ON -> Fri 12/31 is a holiday; Sat, Sun, then Mon 1/3/2028',
    in: { trigger: '2027-12-17', days: 14, observed: true }, want: '2028-01-03' },
  { name: '15. BEFORE an event: 16 days before Mon 2026-07-20 = Sat 7/4 -> counts BACKWARD to Fri 7/3',
    in: { trigger: '2026-07-20', days: 16, direction: 'before' }, want: '2026-07-03' },
  { name: '16. BEFORE, observed ON: Fri 7/3 is observed holiday -> Thu 7/2',
    in: { trigger: '2026-07-20', days: 16, direction: 'before', observed: true }, want: '2026-07-02' },
  { name: '17. BEFORE an event, ordinary: 14 days before Mon 2026-07-06 = Mon 6/22',
    in: { trigger: '2026-07-06', days: 14, direction: 'before' }, want: '2026-06-22' },
  { name: '18. Trigger day excluded: 1 day after Fri 2026-03-06 = Sat -> Mon 3/9',
    in: { trigger: '2026-03-06', days: 1 }, want: '2026-03-09' },
  { name: '19. Invalid date rejected', in: { trigger: '2026-02-30', days: 5 }, throws: true },
  { name: '20. Zero days rejected', in: { trigger: '2026-03-02', days: 0 }, throws: true },
  { name: '21. Negative days rejected', in: { trigger: '2026-03-02', days: -3 }, throws: true },
  { name: '22. Fractional days rejected', in: { trigger: '2026-03-02', days: 1.5 }, throws: true },
];

let pass = 0, fail = 0;
for (const c of cases) {
  let got, err;
  try { got = compute(c.in).deadline; } catch (e) { err = e; }
  const ok = c.throws ? !!err : (!err && got === c.want);
  if (ok) pass++; else fail++;
  const detail = c.throws ? (err ? 'threw: ' + err.message : 'did NOT throw')
                          : (err ? 'threw: ' + err.message : 'got ' + got + ', want ' + c.want);
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + c.name + (ok ? '' : '\n        ' + detail));
}
console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + cases.length + ' total');
process.exit(fail ? 1 : 0);
