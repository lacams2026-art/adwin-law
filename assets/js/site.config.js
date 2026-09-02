/* ==========================================================================
   site.config.js  |  회사 정보 · 메뉴 설정  ★ 상호/주소/전화 변경은 이 파일만 수정
   ========================================================================== */
var SITE = {
  name:      "애드윈법무사사무소",
  nameKo1:   "애드윈",
  nameKo2:   "법무사사무소",
  nameEn:    "ADWIN LAW OFFICE",
  logo:      "assets/img/logo.png",        // 헤더용 (밝은 배경)
  logoWhite: "assets/img/logo_white.png",  // 푸터용 (어두운 배경)
  ceo:       "애드윈",
  address:   "서울특별시 금천구 가산디지털1로 5 (가산동, 대륭테크노타운20차) 1801호",
  tel:       "02-6925-5235",
  email:     "lacams2026@gmail.com",
  bizNo:     "000-00-00000",
  copyright: "Copyright(c) 애드윈법무사사무소. All Rights Reserved.",
  hours:     "평일 09:00 - 18:00 / 점심 12:30 - 13:30<br>토·일요일, 공휴일 휴무 (사전 예약 시 상담 가능)"
};

/* 메뉴 구조 : 순서 변경·추가 시 이 배열만 수정하면 PC/모바일 동시 반영 */
var SITE_MENU = [
  { id:"about",  label:"사무소 소개", href:"about.html" },
  { id:"biz",    label:"업무분야",   href:"biz-realestate.html", children:[
      { id:"biz-realestate", label:"부동산등기",      href:"biz-realestate.html" },
      { id:"biz-corporate",  label:"법인등기",        href:"biz-corporate.html" },
      { id:"biz-auction",    label:"경매·공매",       href:"biz-auction.html" },
      { id:"biz-rehab",      label:"개인회생·파산",   href:"biz-rehab.html" },
      { id:"biz-civil",      label:"민사·가사 서류",  href:"biz-civil.html" }
  ]},
  { id:"apply",   label:"상담신청",  href:"apply.html" },
  { id:"gallery", label:"갤러리",    href:"gallery.html" },
  { id:"notice",  label:"공지사항",  href:"notice.html" },
  { id:"contact", label:"오시는 길", href:"contact.html" }
];
