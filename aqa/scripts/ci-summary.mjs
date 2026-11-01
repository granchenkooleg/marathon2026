// Prints a Markdown summary of reports/results.json (Playwright JSON reporter) for $GITHUB_STEP_SUMMARY.
import { existsSync, readFileSync } from 'node:fs';

const file = new URL('../reports/results.json', import.meta.url);
if (!existsSync(file)) {
  console.log('### E2E results\n\nNo results file: the test run did not start (see the job log).');
  process.exit(0);
}

const report = JSON.parse(readFileSync(file, 'utf8'));
const walk = (suite) => [
  ...(suite.specs ?? []).flatMap((spec) => spec.tests.map((test) => ({ spec, test }))),
  ...(suite.suites ?? []).flatMap(walk),
];
const rows = report.suites.flatMap(walk);
const last = (test) => test.results.at(-1) ?? {};
const knownDefects = rows.filter(({ test }) => test.expectedStatus === 'failed' && last(test).status === 'failed');
const failed = rows.filter(({ test }) => test.status === 'unexpected');
const flaky = rows.filter(({ test }) => test.status === 'flaky');
const { expected, unexpected, skipped, duration } = report.stats;
const name = ({ spec }) => `${spec.file} › ${spec.title}`;

const lines = [
  '### E2E results',
  '',
  '| Passed | Known defects (expected failures) | Failed | Flaky (passed on retry) | Skipped | Duration |',
  '|---|---|---|---|---|---|',
  `| ${expected - knownDefects.length} | ${knownDefects.length} | ${unexpected} | ${flaky.length} | ${skipped} | ${Math.round(duration / 1000)} s |`,
  '',
];
if (failed.length) lines.push('**Failed**', '', ...failed.map((row) => `- ❌ ${name(row)}`), '');
if (flaky.length) lines.push('**Flaky**', '', ...flaky.map((row) => `- ⚠️ ${name(row)}`), '');
if (knownDefects.length) lines.push('<details><summary>Known defects</summary>', '', ...knownDefects.map((row) => `- ${name(row)}`), '', '</details>');
lines.push('', 'HTML report, traces, videos and screenshots: see the run artifacts.');
console.log(lines.join('\n'));
