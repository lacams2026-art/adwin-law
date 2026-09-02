/* ==========================================================================
   layout.js  |  헤더·푸터 자동 생성 / 모바일 메뉴 / 스크롤 등장
   ※ 각 페이지 <body data-page="about"> 값으로 현재 메뉴가 활성화됩니다.
   ========================================================================== */
(function(){
  "use strict";
  document.documentElement.className += " awl-js";

  var page = document.body.getAttribute("data-page") || "";
  var telHref = "tel:" + SITE.tel.split("-").join("");

  /* ---------- 헤더 ---------- */
  function buildGnb(){
    var h = "", i, j, m, c, on;
    for(i=0;i<SITE_MENU.length;i++){
      m = SITE_MENU[i];
      on = (page === m.id) ? " is-active" : "";
      if(m.children){
        for(j=0;j<m.children.length;j++){ if(m.children[j].id === page) on = " is-active"; }
      }
      h += 
        "<li class=\"" + on.replace(" ","") + "\"><a href=\"" + m.href + "\">" + m.label + "</a>";
      if(m.children){
        h += "<ul class=\"awl-sub\">";
        for(j=0;j<m.children.length;j++){
          c = m.children[j];
          h += "<li><a href=\"" + c.href + "\">" + c.label + "</a></li>";
        }
        h += "</ul>";
      }
      h += "</li>";
    }
    return h;
  }

  function buildMo(){
    var h = "", i, j, m, c;
    for(i=0;i<SITE_MENU.length;i++){
      m = SITE_MENU[i];
      h += "<li><a href=\"" + m.href + "\">" + m.label + "</a>";
      if(m.children){
        h += "<div class=\"awl-mo-sub\">";
        for(j=0;j<m.children.length;j++){
          c = m.children[j];
          h += "<a href=\"" + c.href + "\">- " + c.label + "</a>";
        }
        h += "</div>";
      }
      h += "</li>";
    }
    return h;
  }

  var hd = document.getElementById("awl-header");
  if(hd){
    hd.className = "awl-header";
    hd.innerHTML =
      "<div class=\"awl-hd-inner\">" +
      "<a class=\"awl-logo\" href=\"index.html\">" +
      "<img src=\"" + SITE.logo + "\" alt=\"" + SITE.name + "\">" +
    "</a>" +
        "<ul class=\"awl-gnb\">" + buildGnb() + "</ul>" +
        "<div class=\"awl-hd-util\">" +
          "<a class=\"awl-hd-tel\" href=\"" + telHref + "\">" + SITE.tel + "</a>" +
          "<a class=\"awl-btn awl-btn--seal\" href=\"apply.html\">상담 신청</a>" +
        "</div>" +
        "<button class=\"awl-ham\" type=\"button\" aria-label=\"메뉴 열기\"><i></i><i></i><i></i></button>" +
      "</div>";

    /* 모바일 메뉴는 body 직속에 붙입니다 (헤더의 backdrop-filter 영향 회피) */
    var mo = document.createElement("nav");
    mo.className = "awl-mo";
    mo.innerHTML = "<ul>" + buildMo() + "</ul>" +
      "<div class=\"awl-mo-foot\">" +
        "<a class=\"awl-hd-tel\" href=\"" + telHref + "\">" + SITE.tel + "</a>" +
        "<a class=\"awl-btn awl-btn--seal\" href=\"apply.html\">온라인 상담 신청</a>" +
      "</div>";
    document.body.appendChild(mo);

    var ham = hd.querySelector(".awl-ham");
    ham.addEventListener("click", function(){
      document.body.classList.toggle("awl-mo-open");
    });
  }

  /* ---------- 푸터 ---------- */
  var ft = document.getElementById("awl-footer");
  if(ft){
    ft.className = "awl-footer";
    ft.innerHTML =
      "<div class=\"awl-ft-top\"><div class=\"awl-wrap\">" +
        "<a href=\"about.html\">사무소 소개</a><a href=\"biz-realestate.html\">업무분야</a>" +
        "<a href=\"apply.html\">상담신청</a><a href=\"notice.html\">공지사항</a>" +
        "<a href=\"contact.html\">오시는 길</a>" +
      "</div></div>" +
      "<div class=\"awl-wrap awl-ft-main\">" +
        "<div>" +
        "<div class=\"awl-ft-logo\"><img src=\"" + SITE.logoWhite + "\" alt=\"" + SITE.name + "\"></div>" +
          "<div class=\"awl-ft-info\">" +
            "대표자 : <b>" + SITE.ceo + "</b><br>" +
            "주소 : <b>" + SITE.address + "</b><br>" +
            "전화 : <b>" + SITE.tel + "</b> &nbsp;|&nbsp; 메일 : <b>" + SITE.email + "</b><br>" +
            "사업자 등록번호 : <b>" + SITE.bizNo + "</b>" +
          "</div>" +
          "<div class=\"awl-ft-copy\">" + SITE.copyright +
            "<a class=\"awl-ft-admin\" href=\"admin-login.html\">관리자</a>" +
          "</div>" +
        "</div>" +
        "<div class=\"awl-ft-right\">" +
          "<a class=\"awl-ft-tel\" href=\"" + telHref + "\">" + SITE.tel + "</a>" +
          "<div class=\"awl-ft-hours\">" + SITE.hours + "</div>" +
        "</div>" +
      "</div>";
  }

  /* ---------- 퀵 버튼 ---------- */
  var q = document.createElement("div");
  q.className = "awl-quick";
  q.innerHTML =
    "<a href=\"" + telHref + "\" aria-label=\"전화 걸기\">전화</a>" +
    "<a href=\"apply.html\" aria-label=\"상담 신청\">상담</a>" +
    "<button class=\"awl-top\" type=\"button\" aria-label=\"맨 위로\">TOP</button>";
  document.body.appendChild(q);
  q.querySelector(".awl-top").addEventListener("click", function(){
    window.scrollTo({ top:0, behavior:"smooth" });
  });

  /* ---------- 스크롤 등장 ---------- */
  function reveal(){
    var els = document.querySelectorAll("[data-reveal]");
    if(!("IntersectionObserver" in window)){
      for(var k=0;k<els.length;k++){ els[k].classList.add("is-in"); }
      return;
    }
    var io = new IntersectionObserver(function(entries){
      for(var i=0;i<entries.length;i++){
        if(entries[i].isIntersecting){
          var el = entries[i].target;
          var d = el.getAttribute("data-delay") || 0;
          el.style.transitionDelay = (d/1000) + "s";
          el.classList.add("is-in");
          io.unobserve(el);
        }
      }
    }, { threshold:0.12, rootMargin:"0px 0px -8% 0px" });
    for(var n=0;n<els.length;n++){ io.observe(els[n]); }
  }
  reveal();

  /* ---------- 공용 유틸 ---------- */
  window.AWL = {
    query: function(key){
      var s = window.location.search.substring(1).split("&"), i, kv;
      for(i=0;i<s.length;i++){
        kv = s[i].split("=");
        if(decodeURIComponent(kv[0]) === key){ return decodeURIComponent(kv[1] || ""); }
      }
      return "";
    },
    date: function(str){ return str ? str.substring(0,10).split("-").join(".") : ""; }
  };
})();
