// Locale resolution tests for functions/_locale.ts.
//
//   deno run --allow-read scripts/locale-test.ts
//
// There is no test runner in this project, and this one function does not
// warrant adding one — but it decides which language every first-time visitor
// sees, and the interaction between cookie, Accept-Language and IP country has
// enough corners to be worth pinning down.

import { pickLocale, isCrawler } from "../functions/_locale.ts";

function req(country: string | null, accept: string | null, cookie?: string, ua?: string): Request {
    const h = new Headers();
    if (country) h.set("cf-ipcountry", country);
    if (accept) h.set("accept-language", accept);
    if (cookie) h.set("cookie", `lustimacy-locale=${cookie}`);
    if (ua) h.set("user-agent", ua);
    return new Request("https://lustimacy.com/", { headers: h });
}

type Case = [string, string | null, string | null, string | undefined, string];

const cases: Case[] = [
    ["FR ip, English browser -> fr (the whole point)", "FR", "en-US,en;q=0.9", undefined, "fr"],
    ["FR ip, French browser  -> fr", "FR", "fr-FR,fr;q=0.9", undefined, "fr"],
    ["DE ip, English browser -> de", "DE", "en-GB,en;q=0.9", undefined, "de"],
    ["NL ip, English browser -> nl", "NL", "en-US,en;q=0.9", undefined, "nl"],
    ["AT ip                  -> de", "AT", "en", undefined, "de"],
    ["BE ip, Dutch browser   -> nl", "BE", "nl-BE,nl;q=0.9", undefined, "nl"],
    ["BE ip, French browser  -> fr", "BE", "fr-BE,fr;q=0.9", undefined, "fr"],
    ["BE ip, English browser -> nl (larger group)", "BE", "en", undefined, "nl"],
    ["CH ip, French browser  -> fr", "CH", "fr-CH", undefined, "fr"],
    ["CH ip, Italian browser -> de (we have no it)", "CH", "it-CH,it;q=0.9", undefined, "de"],
    ["NL ip, French speaker  -> fr (person over place)", "NL", "fr-FR,fr;q=0.9", undefined, "fr"],
    ["DE ip, Dutch speaker   -> nl (person over place)", "DE", "nl-NL,nl;q=0.9", undefined, "nl"],
    ["US ip, English browser -> en", "US", "en-US", undefined, "en"],
    ["US ip, French browser  -> fr", "US", "fr-FR", undefined, "fr"],
    ["NG ip, English browser -> en", "NG", "en-NG,en;q=0.9", undefined, "en"],
    ["GB ip, no header       -> en", "GB", null, undefined, "en"],
    ["no country, no header  -> en", null, null, undefined, "en"],
    ["no country, de browser -> de", null, "de-DE,de;q=0.9", undefined, "de"],
    ["Tor exit T1, fr browser -> fr", "T1", "fr-FR", undefined, "fr"],
    ["Tor exit T1, en browser -> en", "T1", "en-US", undefined, "en"],
    ["XX unknown, en browser -> en", "XX", "en-US", undefined, "en"],
    ["cookie beats everything", "FR", "fr-FR", "en", "en"],
    ["cookie nl over FR ip", "FR", "en-US", "nl", "nl"],
    ["q-values respected", "US", "de;q=0.3,fr;q=0.9", undefined, "fr"],
    ["unsupported language, FR ip -> fr", "FR", "es-ES,es;q=0.9", undefined, "fr"],
    ["unsupported language, ES ip -> en", "ES", "es-ES,es;q=0.9", undefined, "en"],
];

let pass = 0;
let fail = 0;

for (const [name, country, accept, cookie, want] of cases) {
    const got = pickLocale(req(country, accept, cookie));
    const ok = got === want;
    ok ? pass++ : fail++;
    console.log(`${ok ? "  ok " : "FAIL "} ${name.padEnd(50)} got=${got} want=${want}`);
}

// Crawlers are held on the English root regardless of where they appear from.
for (const ua of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "facebookexternalhit/1.1",
]) {
    const ok = isCrawler(req("FR", "fr-FR", undefined, ua));
    ok ? pass++ : fail++;
    console.log(`${ok ? "  ok " : "FAIL "} crawler detected: ${ua.slice(0, 44)}`);
}
const human = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
const humanOk = !isCrawler(req("FR", "fr-FR", undefined, human));
humanOk ? pass++ : fail++;
console.log(`${humanOk ? "  ok " : "FAIL "} iPhone Safari is not a crawler`);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) Deno.exit(1);
