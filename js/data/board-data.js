/* ═══════════════════════════════════════════════════════════════
   BOARD DATA — used by game logic (rent tables, prices, groups)
   تعديل هذا الملف يغير أسعار الإيجارات وقيم اللعبة
═══════════════════════════════════════════════════════════════ */
'use strict';

// Full game logic data per square
// rent[]: [أرض, 1 منزل, 2, 3, 4, فندق]
const BOARD_DATA = [
  {id:0,  type:'go'},
  {id:1,  type:'prop', n:'نُزل الغريب',    col:'#5C3010', price:60,  rent:[2,10,30,90,160,250],   hCost:50,  mg:30,  grp:'brown'},
  {id:2,  type:'lant', n:'الفانوس السحري', icon:'🪔'},
  {id:3,  type:'prop', n:'مربط الخيل',     col:'#5C3010', price:60,  rent:[4,20,60,180,320,450],   hCost:50,  mg:30,  grp:'brown'},
  {id:4,  type:'tax',  n:'كمين الطريق',    icon:'⚔️',    amount:200},
  {id:5,  type:'gate', n:'بوابة النصر',    price:200, mg:100},
  {id:6,  type:'prop', n:'ساقية الوادي',   col:'#1A7A9A', price:100, rent:[6,30,90,270,400,550],   hCost:50,  mg:50,  grp:'cyan'},
  {id:7,  type:'firm', n:'فرمان الوالي',   icon:'📜'},
  {id:8,  type:'prop', n:'عين الحياة',     col:'#1A7A9A', price:100, rent:[6,30,90,270,400,550],   hCost:50,  mg:50,  grp:'cyan'},
  {id:9,  type:'prop', n:'بحيرة الأمنيات', col:'#1A7A9A', price:120, rent:[8,40,100,300,450,600],  hCost:50,  mg:60,  grp:'cyan'},
  {id:10, type:'jail'},
  {id:11, type:'prop', n:'سوق النحاسين',   col:'#6B2FA0', price:140, rent:[10,50,150,450,625,750], hCost:100, mg:70,  grp:'purple'},
  {id:12, type:'util', n:'آبار المياه',    icon:'🪣'},
  {id:13, type:'prop', n:'حارة السجاد',    col:'#6B2FA0', price:140, rent:[10,50,150,450,625,750], hCost:100, mg:70,  grp:'purple'},
  {id:14, type:'prop', n:'مصبغة الألوان',  col:'#6B2FA0', price:160, rent:[12,60,180,500,700,900], hCost:100, mg:80,  grp:'purple'},
  {id:15, type:'gate', n:'بوابة الشرق',    price:200, mg:100},
  {id:16, type:'prop', n:'دار السكة',      col:'#CC5500', price:180, rent:[14,70,200,550,750,950], hCost:100, mg:90,  grp:'orange'},
  {id:17, type:'lant', n:'الفانوس السحري', icon:'🪔'},
  {id:18, type:'prop', n:'مخزن السبائك',   col:'#CC5500', price:180, rent:[14,70,200,550,750,950], hCost:100, mg:90,  grp:'orange'},
  {id:19, type:'prop', n:'خزنة الوالي',    col:'#CC5500', price:200, rent:[16,80,220,600,800,1000],hCost:100, mg:100, grp:'orange'},
  {id:20, type:'free'},
  {id:21, type:'prop', n:'ثكنة الحرس',     col:'#8B1010', price:220, rent:[18,90,250,700,875,1050],hCost:150, mg:110, grp:'red'},
  {id:22, type:'firm', n:'فرمان الوالي',   icon:'📜'},
  {id:23, type:'prop', n:'برج المراقبة',   col:'#8B1010', price:220, rent:[18,90,250,700,875,1050],hCost:150, mg:110, grp:'red'},
  {id:24, type:'prop', n:'حصن المدينة',    col:'#8B1010', price:240, rent:[20,100,300,750,925,1100],hCost:150,mg:120, grp:'red'},
  {id:25, type:'gate', n:'بوابة القلعة',   price:200, mg:100},
  {id:26, type:'prop', n:'سوق الحرير',     col:'#B8920A', price:260, rent:[22,110,330,800,975,1150],hCost:150,mg:130, grp:'yellow'},
  {id:27, type:'prop', n:'ديوان التجارة',  col:'#B8920A', price:260, rent:[22,110,330,800,975,1150],hCost:150,mg:130, grp:'yellow'},
  {id:28, type:'util', n:'مشاعل الزيت',   icon:'🔦'},
  {id:29, type:'prop', n:'البورصة',         col:'#B8920A', price:280, rent:[24,120,360,850,1025,1200],hCost:150,mg:140,grp:'yellow'},
  {id:30, type:'gojail'},
  {id:31, type:'prop', n:'حي الوزراء',     col:'#1A5C2A', price:300, rent:[26,130,390,900,1100,1275],hCost:200,mg:150,grp:'green'},
  {id:32, type:'prop', n:'ساحة الفرسان',   col:'#1A5C2A', price:300, rent:[26,130,390,900,1100,1275],hCost:200,mg:150,grp:'green'},
  {id:33, type:'lant', n:'الفانوس السحري', icon:'🪔'},
  {id:34, type:'prop', n:'حدائق السلطان',  col:'#1A5C2A', price:320, rent:[28,150,450,1000,1200,1400],hCost:200,mg:160,grp:'green'},
  {id:35, type:'gate', n:'البوابة العالية', price:200, mg:100},
  {id:36, type:'firm', n:'فرمان الوالي',   icon:'📜'},
  {id:37, type:'prop', n:'مدينة الذهب',    col:'#0A1F6B', price:350, rent:[35,175,500,1100,1300,1500],hCost:200,mg:175,grp:'navy'},
  {id:38, type:'tax',  n:'إتاوة الفرسان',  icon:'🗡',     amount:100},
  {id:39, type:'prop', n:'قصر الخلافة',    col:'#0A1F6B', price:400, rent:[50,200,600,1400,1700,2000],hCost:200,mg:200,grp:'navy'},
];

// Group membership map — which square IDs belong to each color group
// تعديل هذا يغير شروط البناء وحساب الإيجار
const GROUPS = {
  brown:  ['1','3'],
  cyan:   ['6','8','9'],
  purple: ['11','13','14'],
  orange: ['16','18','19'],
  red:    ['21','23','24'],
  yellow: ['26','27','29'],
  green:  ['31','32','34'],
  navy:   ['37','39'],
  gate:   ['5','15','25','35'],
};

// Token center positions (for animation) — computed from board geometry
// Board: 660×660, corner=96, side-cell=(660-192)/9
const SQ_CENTERS_GAME = [];
(()=>{
  const _B=660, _C=96, _S=(_B-2*_C)/9;
  // Bottom row (sq 0–10, right to left)
  for(let i=0;i<=10;i++){
    const ic=i===0||i===10, w=ic?_C:_S;
    const x=i===0?_B-_C : i===10?0 : _B-_C-i*_S;
    SQ_CENTERS_GAME[i]={x:x+w/2, y:_B-_C+_C/2};
  }
  // Left column (sq 11–19)
  for(let i=0;i<9;i++) SQ_CENTERS_GAME[11+i]={x:_C/2, y:_B-_C-(i+.5)*_S};
  // Top row (sq 20–30, left to right)
  for(let i=0;i<=10;i++){
    const ic=i===0||i===10, w=ic?_C:_S;
    const x=i===0?0 : i===10?_B-_C : _C+(i-1)*_S;
    SQ_CENTERS_GAME[20+i]={x:x+w/2, y:_C/2};
  }
  // Right column (sq 31–39)
  for(let i=0;i<9;i++) SQ_CENTERS_GAME[31+i]={x:_B-_C+_C/2, y:_C+(i+.5)*_S};
})();
