/* ═══════════════════════════════════════════════════════════════
   BOARD SQUARES DATA — used by board-builder.js to draw the SVG
   تعديل هذا الملف يغير شكل اللوحة فقط، لا منطق اللعبة
═══════════════════════════════════════════════════════════════ */
'use strict';

// Property color palette (SVG colors for color bands)
const PC = {
  brown:  '#5C3010',
  cyan:   '#1A7A9A',
  purple: '#6B2FA0',
  orange: '#CC5500',
  red:    '#8B1010',
  yellow: '#B8920A',
  green:  '#1A5C2A',
  navy:   '#0A1F6B',
};

// Board squares list — used only for SVG building
// Each entry drives the visual cell rendered on the board SVG
const SQ = [
  {id:0,  t:'go'},
  {id:1,  t:'prop', n:'نُزل الغريب',    c:PC.brown,  p:60},
  {id:2,  t:'lant', n:'الفانوس',        i:'🪔'},
  {id:3,  t:'prop', n:'مربط الخيل',     c:PC.brown,  p:60},
  {id:4,  t:'tax',  n:'كمين',           i:'⚔️', sub:200},
  {id:5,  t:'gate', n:'بوابة النصر',    i:'🏛'},
  {id:6,  t:'prop', n:'ساقية الوادي',   c:PC.cyan,   p:100},
  {id:7,  t:'firm', n:'فرمان',          i:'📜'},
  {id:8,  t:'prop', n:'عين الحياة',     c:PC.cyan,   p:100},
  {id:9,  t:'prop', n:'بحيرة الأمنيات', c:PC.cyan,   p:120},
  {id:10, t:'corn', n:'السجن',          i:'⛓',   bg:'#2A1000', s2:'زيارة'},
  {id:11, t:'prop', n:'سوق النحاسين',   c:PC.purple, p:140},
  {id:12, t:'util', n:'آبار المياه',    i:'🪣'},
  {id:13, t:'prop', n:'حارة السجاد',    c:PC.purple, p:140},
  {id:14, t:'prop', n:'مصبغة الألوان',  c:PC.purple, p:160},
  {id:15, t:'gate', n:'بوابة الشرق',    i:'🏛'},
  {id:16, t:'prop', n:'دار السكة',      c:PC.orange, p:180},
  {id:17, t:'lant', n:'الفانوس',        i:'🪔'},
  {id:18, t:'prop', n:'مخزن السبائك',   c:PC.orange, p:180},
  {id:19, t:'prop', n:'خزنة الوالي',    c:PC.orange, p:200},
  {id:20, t:'corn', n:'الاستراحة',      i:'☕',   bg:'#181830', s2:'قف واسترح'},
  {id:21, t:'prop', n:'ثكنة الحرس',     c:PC.red,    p:220},
  {id:22, t:'firm', n:'فرمان',          i:'📜'},
  {id:23, t:'prop', n:'برج المراقبة',   c:PC.red,    p:220},
  {id:24, t:'prop', n:'حصن المدينة',    c:PC.red,    p:240},
  {id:25, t:'gate', n:'بوابة القلعة',   i:'🏛'},
  {id:26, t:'prop', n:'سوق الحرير',     c:PC.yellow, p:260},
  {id:27, t:'prop', n:'ديوان التجارة',  c:PC.yellow, p:260},
  {id:28, t:'util', n:'مشاعل الزيت',   i:'🔦'},
  {id:29, t:'prop', n:'البورصة',         c:PC.yellow, p:280},
  {id:30, t:'corn', n:'اذهب للسجن',     i:'🔒',  bg:'#380808', s2:'مباشرةً!'},
  {id:31, t:'prop', n:'حي الوزراء',     c:PC.green,  p:300},
  {id:32, t:'prop', n:'ساحة الفرسان',   c:PC.green,  p:300},
  {id:33, t:'lant', n:'الفانوس',        i:'🪔'},
  {id:34, t:'prop', n:'حدائق السلطان',  c:PC.green,  p:320},
  {id:35, t:'gate', n:'البوابة العالية', i:'🏛'},
  {id:36, t:'firm', n:'فرمان',          i:'📜'},
  {id:37, t:'prop', n:'مدينة الذهب',    c:PC.navy,   p:350, ml:'navy'},
  {id:38, t:'tax',  n:'إتاوة الفرسان',  i:'🗡',  sub:100},
  {id:39, t:'prop', n:'قصر الخلافة',    c:PC.navy,   p:400, ml:'navy'},
];

// Quick lookup by id
const sqMap = {};
SQ.forEach(s => sqMap[s.id] = s);
