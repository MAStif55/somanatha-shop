// Script to generate Yandex Direct Commander CSV
// Limits: Title1=56, Title2=30, Text=81, DisplayLink=20 (path only, no domain)
// Forbidden in Title2: · (middle dot) — use dash or pipe instead
// Tab-separated, UTF-8 with BOM

const fs = require('fs');

const CAMPAIGN = 'Somanatha — Ведические Артефакты';

function adRow(group, title1, title2, text, link, displayLink) {
    // Validate lengths
    if (title1.length > 56) console.warn(`WARN title1 too long (${title1.length}): ${title1}`);
    if (title2.length > 30) console.warn(`WARN title2 too long (${title2.length}): ${title2}`);
    if (text.length > 81) console.warn(`WARN text too long (${text.length}): ${text}`);
    if (displayLink.length > 20) console.warn(`WARN displayLink too long (${displayLink.length}): ${displayLink}`);
    return [CAMPAIGN, group, '', title1, title2, text, link, displayLink, 'Россия'].join('\t');
}
function kwRow(group, keyword) {
    return [CAMPAIGN, group, keyword, '', '', '', '', '', 'Россия'].join('\t');
}

const header = ['Название кампании', 'Название группы', 'Фраза (с минус-словами)', 'Заголовок 1', 'Заголовок 2', 'Текст', 'Ссылка', 'Отображаемая ссылка', 'Регион'].join('\t');

const rows = [header];

// ── Group 1: Янтры — Общие (56 + 30 + 81)
const g1 = 'Янтры — Общие';
rows.push(adRow(g1,
    'Священные Янтры из Меди',          // 23 chars
    'Изготовлены в Мухурту',            // 21 chars
    'Ведические янтры из меди 0,8 мм. Изготовление в благоприятное время. От 1500 руб.', // 81 chars
    'https://somanatha.ru/catalog/yantras',
    'янтры'                              // path only, no domain
));
for (const kw of ['янтра', 'янтры', 'что такое янтра', 'янтра значение', 'священная янтра', 'янтра для медитации', 'ведическая янтра', 'янтра на медь', 'медная янтра', '"янтры купить"', '"янтра из меди"']) {
    rows.push(kwRow(g1, kw));
}

// ── Group 2: Янтры — Купить
const g2 = 'Янтры — Купить';
rows.push(adRow(g2,
    'Купить Янтру из Меди',             // 20 chars
    'От 1 500 руб - Отправка по РФ',    // 29 chars
    'Подлинные ведические янтры ручной работы. Медь, латунь, сталь. Надёжная упаковка.', // 81 chars
    'https://somanatha.ru/catalog/yantras',
    'купить-янтры'
));
for (const kw of ['купить янтру', 'купить янтры', 'янтра купить', 'янтра заказать', 'янтра интернет магазин', 'янтра из меди купить', 'медная янтра купить', 'купить янтру шива', 'купить янтру нарасимха', 'купить янтру шукра', '"купить янтру из меди"', '"купить ведическую янтру"', '"заказать янтру"']) {
    rows.push(kwRow(g2, kw));
}

// ── Group 3: Ведическая астрология / Васту
const g3 = 'Ведическая астрология и Васту';
rows.push(adRow(g3,
    'Ведический Магазин Somanatha',      // 28 chars
    'Янтры и Кавача и Амулеты',          // 24 chars (no · symbol)
    'Священные предметы для духовной практики и защиты. Отправка 1-3 раб. дня по РФ.',  // 79 chars
    'https://somanatha.ru/catalog',
    'каталог'
));
for (const kw of ['ведический магазин', 'ведические товары', 'ведические артефакты', 'васту янтра', 'васту для дома', 'васту коррекция', 'предметы для духовной практики', 'джйотиш янтра', 'ведический амулет', 'товары для медитации', '"ведический магазин купить"', '"васту янтра купить"']) {
    rows.push(kwRow(g3, kw));
}

// ── Group 4: Кавача / Амулеты
const g4 = 'Кавача и Амулеты';
rows.push(adRow(g4,
    'Кавача - Ведические Амулеты',       // 27 chars (dash, not em-dash)
    'Защита и Благополучие',             // 21 chars
    'Защитные амулеты и кулоны со священными мантрами. Ручная работа. Отправка по РФ.',  // 79 chars
    'https://somanatha.ru/catalog/kavacha',
    'кавача'
));
for (const kw of ['кавача', 'кавача амулет', 'кавача купить', 'ведический амулет купить', 'защитный амулет ведический', 'талисман для защиты', 'маха мритьюнджая кулон', 'дханвантари браслет', 'амулет для здоровья', 'оберег ведический', '"кавача купить"', '"ведический амулет"']) {
    rows.push(kwRow(g4, kw));
}

// ── Group 5: Планетарные Янтры
const g5 = 'Планетарные Янтры';
rows.push(adRow(g5,
    'Планетарные Янтры - Медь',          // 24 chars
    'Раху, Кету, Сатурн, Шукра',         // 25 chars (comma, not ·)
    'Янтры для гармонизации влияния планет. Медь 0,8 мм. Изготовление в Мухурту.',      // 74 chars
    'https://somanatha.ru/catalog/yantras',
    'планеты'
));
for (const kw of ['янтра раху', 'янтра кету', 'янтра сатурн', 'янтра юпитер', 'янтра венера', 'янтра шукра', 'планетарная янтра', 'янтра навахара', 'янтра для удачи', 'янтра для денег', 'янтра для здоровья', 'янтра для любви', '"янтра раху купить"', '"янтра для денег купить"']) {
    rows.push(kwRow(g5, kw));
}

// ── Group 6: Бренд Соманатха
const g6 = 'Бренд Соманатха';
rows.push(adRow(g6,
    'Соманатха - Ведический Магазин',     // 30 chars
    'Янтры и Кавача',                     // 14 chars
    'Официальный сайт. Янтры из меди и латуни. Кавача с мантрами. Отправка по РФ.',     // 75 chars
    'https://somanatha.ru',
    ''  // empty display link for brand
));
for (const kw of ['"соманатха"', '"somanatha"', '"somanatha.ru"', 'соманатха магазин', 'соманатха янтры', 'somanatha shop']) {
    rows.push(kwRow(g6, kw));
}

// ── Group 7: Конкурентные запросы
const g7 = 'Конкурентные запросы';
rows.push(adRow(g7,
    'Ведические Янтры и Кавача',          // 25 chars
    'Медь - Изготовлены в Мухурту',       // 28 chars
    'Подлинные ведические артефакты из меди. Отправка по РФ 1-3 раб. дня. somanatha.ru', // 80 chars
    'https://somanatha.ru/catalog',
    'каталог'
));
for (const kw of ['галерея лакшми янтры', 'laxmi.ru янтра', 'стоп карма кавача', 'stopkarma кавача', 'добрый магазин кавача', 'щедрый ганеша янтра', 'myindia янтра', 'kindao янтра', 'okguru янтра']) {
    rows.push(kwRow(g7, kw));
}

// Write with UTF-8 BOM
const BOM = '\uFEFF';
const content = BOM + rows.join('\n');
fs.writeFileSync('d:\\somanatha-shop\\yandex_direct_import.csv', content, 'utf8');

console.log(`Created with ${rows.length} rows (1 header + ${rows.length - 1} data rows)`);
console.log(`Groups: 7, Keywords: ${rows.filter(r => r.split('\t')[2] !== '' && r !== header).length}, Ads: ${rows.filter(r => r.split('\t')[3] !== '' && r !== header).length}`);

// Double check all texts
rows.slice(1).forEach((r, i) => {
    const cols = r.split('\t');
    if (cols[3]) { // ad row
        const t1 = cols[3], t2 = cols[4], txt = cols[5], dl = cols[7];
        if (t1.length > 56) console.error(`Row ${i+2} Title1 TOO LONG: ${t1.length} chars`);
        if (t2.length > 30) console.error(`Row ${i+2} Title2 TOO LONG: ${t2.length} chars`);
        if (txt.length > 81) console.error(`Row ${i+2} Text TOO LONG: ${txt.length} chars`);
        if (dl.length > 20) console.error(`Row ${i+2} DisplayLink TOO LONG: ${dl.length} chars`);
        if (t2.includes('·')) console.error(`Row ${i+2} Title2 has forbidden · char`);
        console.log(`  Ad "${cols[1]}": T1=${t1.length}, T2=${t2.length}, Txt=${txt.length}, DL=${dl.length}`);
    }
});
