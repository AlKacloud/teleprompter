const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const code = html.slice(html.indexOf('/* ====== PURE-START'), html.indexOf('/* ====== PURE-END'));
const SFL = new Function(code + '; return SFL;')();
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FAIL ') + msg); if (!cond) fails++; };

// 1. Чистка: русские строки, эмодзи, номера, ёлочки
const raw = `1. Действие: нажми Play
🟢 «I'm moving my cursor to the left side of my Mac screen, where the Dock is located.»
(Перевод: Я перемещаю курсор.)
2. I click the green Play button.`;
const c = SFL.clean(raw);
console.log('clean ->', JSON.stringify(c));
ok(!/[а-я]/i.test(c), 'русские строки удалены');
ok(c.startsWith("I'm moving"), 'эмодзи и ёлочки убраны');
ok(c.includes('I click the green Play button.'), 'номер "2." убран');

// 2. Разбивка: ширина ~20 символов (как 96px на 11" iPad)
const measure = s => s.length * 44;  // ~44px на символ
const lines = SFL.split(c, 900, measure);
console.log('lines ->'); lines.forEach(l => console.log('   |' + l + '|  ' + l.length));
ok(lines.every(l => measure(l) <= 900 || !l.includes(' ')), 'каждая строка влезает в ширину');
ok(lines.join(' ').split(/\s+/).length === c.split(/\s+/).length, 'ни одно слово не потеряно');
ok(!lines.some(l => l.split(' ').length === 1 && l.length < 6), 'нет одиноких коротких хвостов');

// 3. Сверка речи
const words = lines.join(' ').split(' ');
const keys = words.map(SFL.norm);
const m = new SFL.Matcher(keys);
// частичные результаты растут, потом финал
m.feed("I'm", false); m.feed("I'm moving my", false); m.feed("I'm moving my cursor to the left", false);
console.log('gp после частичных:', m.gp, '=', words.slice(0, m.gp).join(' '));
ok(m.gp === 7, "частичные: дошли до left (7 слов)");
m.feed("I'm moving my cursor to the left side of my Mac screen", true);
ok(m.gp === 12, "финал: дошли до screen (12 слов), без двойного счёта: " + m.gp);
// ошибки распознавания: "were" вместо "where", "duck" вместо "Dock", пропуск "is"
m.feed("were the duck located", true);
console.log('gp после ошибок:', m.gp, '=', words.slice(0, m.gp).join(' '));
ok(words[m.gp - 1].startsWith('located'), 'ошибки распознавания пропущены, дошли до "located"');
// переписанный частичный результат (стал короче) не даёт двойного шага
const m2 = new SFL.Matcher(keys);
m2.feed("I'm moving my cursor", false); m2.feed("I'm moving", false); m2.feed("I'm moving my cursor to", false);
ok(m2.gp === 5, 'переписанный частичный не сбивает счёт: ' + m2.gp);
// пропуск куска текста: пересинхронизация по паре слов
const m3 = new SFL.Matcher(keys);
m3.feed("blah blah blah I click the green", true);
console.log('gp после пропуска:', m3.gp, '=', words.slice(0, m3.gp).join(' '));
ok(words[m3.gp - 1] === 'green', 'перескок вперёд по паре слов сработал');
// числа и синонимы
ok(SFL.norm('Hertz') === SFL.norm('Hz') && SFL.norm('four') === SFL.norm('4'), 'Hz/hertz и 4/four совпадают');

// 4. Перенос перевода: экспорт → вставка в другой версии
const tr = { "I'm moving my cursor": 'Я веду курсор', 'to the top': 'к верхней части' };
const out = SFL.pairsText(["I'm moving my cursor", 'to the top', 'of the Logic Pro'], tr);
console.log('export ->', JSON.stringify(out));
const back = SFL.parsePairs(out);
ok(back && back.length === 3, 'все 3 строки вернулись, заголовок пропущен');
ok(back[0][0] === "I'm moving my cursor" && back[0][1] === 'Я веду курсор', 'английский и русский на месте');
ok(back[2][1] === '', 'строка без перевода переносится пустой');
ok(SFL.parsePairs("I'm moving my cursor\nto the top") === null, 'обычный текст не принимается за текст с переводом');

// 5. Строки с готовым переводом не перерезаются даже на узком экране
const fixedSrc = "I'm moving my cursor to the top\nof the Logic Pro window";
const narrow = SFL.split(fixedSrc, 300, measure, new Set(["I'm moving my cursor to the top", 'of the Logic Pro window']));
ok(narrow.length === 2 && narrow[0] === "I'm moving my cursor to the top", 'строки с переводом остались целыми: ' + JSON.stringify(narrow));
ok(SFL.split(fixedSrc, 300, measure, null).length > 2, 'обычный текст на узком экране режется как раньше');

// 6. Переносы для чтения вслух: имена не рвутся, строка не кончается на артикль/предлог
const w22 = s => s.length * 44;   // ~20 символов в строке
const demo = SFL.split("I'm moving toward the middle section of the Dock and locating the Logic Pro icon. Now I'm clicking the icon to open Logic Pro.", 900, w22);
console.log('demo ->', JSON.stringify(demo));
ok(!demo.some((l, i) => i < demo.length - 1 && /\bLogic$/.test(l) && /^Pro\b/.test(demo[i + 1])), '«Logic Pro» не разорвано');
ok(!demo.some(l => /\b(the|my|to|of|a)$/i.test(l)), 'ни одна строка не кончается на the/my/to/of/a');
ok(demo.every(l => w22(l) <= 900), 'все строки по-прежнему влезают');
console.log(fails ? `\n${fails} проверок не прошло` : '\nВсе проверки прошли');
process.exit(fails ? 1 : 0);
