/* ==========================================================================
   data.js  |  게시판 · 갤러리 · 신청폼 · 관리자 데이터 레이어

   ★ 현재는 브라우저 저장소(localStorage)에 임시 저장합니다.
     Supabase 연동 시 [SUPABASE] 표시된 함수 내부만 교체하면 됩니다.
     (HTML 은 수정할 필요 없습니다)

   ┌─ 임시 저장 방식의 한계 ─────────────────────────────────────────────┐
   │ · 글은 "글을 쓴 그 브라우저에만" 저장됩니다.                          │
   │   다른 PC·다른 브라우저·시크릿창에서는 보이지 않습니다.               │
   │ · 브라우저 저장소 용량은 약 5MB 입니다. 갤러리 이미지를 많이 넣으면    │
   │   금방 가득 찹니다. (저장 실패 시 화면에 안내가 뜹니다)               │
   │ · 방문자에게 실제로 보여주려면 반드시 Supabase 연동이 필요합니다.      │
   └──────────────────────────────────────────────────────────────────────┘

   -- Supabase 연동 준비 ---------------------------------------------------
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   var db = supabase.createClient("PROJECT_URL", "ANON_KEY");

   테이블 설계(권장)
   notices  : id(int8, pk) | title(text) | content(text) | writer(text)
              | is_top(bool) | views(int4) | created_at(timestamptz)
   gallery  : id(int8, pk) | title(text) | description(text)
              | thumb_url(text) | image_url(text) | sort_no(int4)
              | created_at(timestamptz)
   gallery_images :                      ← 사진 여러 장을 쓰므로 1:N 테이블
              id(int8, pk) | gallery_id(int8, fk) | url(text)
              | thumb_url(text) | sort_no(int4)
   applications :
              id(int8, pk) | field(text) | name(text) | phone(text) | email(text)
              | prefer_date(date) | message(text) | agree(bool)
              | file_path(text) | file_name(text) | file_size(int8)
              | created_at(timestamptz)

   ※ RLS(Row Level Security) 를 반드시 켜세요.
     읽기(SELECT)  : 누구나 허용
     쓰기(INSERT/UPDATE/DELETE) : 로그인한 관리자만 허용
     이 정책이 있어야 관리자 화면을 억지로 열어도 저장이 거부됩니다.
   ========================================================================== */


/* ##########################################################################
   0. 초기 샘플 데이터 (첫 실행 시 한 번만 저장소에 복사됩니다)
   ########################################################################## */
var NOTICE_SEED = [
  { id:8, title:"2026년 등기 수수료 및 등록면허세 변경 안내", writer:"관리자", is_top:true,  views:412, created_at:"2026-08-12", content:"2026년 하반기부터 적용되는 등기 관련 수수료 기준을 안내드립니다.\n방문 상담 전 필요 서류를 미리 확인하시면 처리 기간을 줄일 수 있습니다." },
  { id:7, title:"여름 휴가 기간(8/4~8/8) 상담 운영 안내",       writer:"관리자", is_top:true,  views:238, created_at:"2026-07-28", content:"휴가 기간 중에도 온라인 상담 신청은 정상 접수되며, 순차적으로 회신드립니다." },
  { id:6, title:"인터넷등기소 전자등기 신청 절차 간소화 안내",   writer:"관리자", is_top:false, views:190, created_at:"2026-07-10", content:"전자등기 이용 시 필요한 공동인증서 준비 사항을 정리했습니다." },
  { id:5, title:"법인 설립 등기 상담 예약제 시행 안내",          writer:"관리자", is_top:false, views:167, created_at:"2026-06-22", content:"보다 충실한 상담을 위해 법인 설립 관련 방문 상담은 예약제로 운영합니다." },
  { id:4, title:"개인회생·파산 무료 상담 진행 안내",             writer:"관리자", is_top:false, views:305, created_at:"2026-06-03", content:"채무 조정이 필요한 분들을 위한 1:1 무료 상담을 진행합니다." },
  { id:3, title:"사무소 이전 안내 (대륭테크노타운20차 1801호)",  writer:"관리자", is_top:false, views:521, created_at:"2026-05-18", content:"보다 넓은 상담 공간을 갖춘 새 사무소에서 인사드립니다." },
  { id:2, title:"부동산 매매 시 준비 서류 체크리스트 배포",      writer:"관리자", is_top:false, views:288, created_at:"2026-04-29", content:"매도인·매수인이 각각 준비해야 할 서류를 한 장으로 정리했습니다." },
  { id:1, title:"홈페이지를 새롭게 오픈했습니다",                writer:"관리자", is_top:false, views:143, created_at:"2026-04-01", content:"의뢰인 여러분께 더 빠르고 정확한 정보를 전하기 위해 홈페이지를 개편했습니다." }
];

/* images : [{ full:"...", thumb:"..." }]  ─ 사진 여러 장을 담습니다.
   thumb_url / image_url 은 목록·상세에서 쓰는 대표 이미지(첫 장)입니다. */
var GALLERY_SEED = [
  { id:9, title:"상담실 전경",          images:[], thumb_url:"", image_url:"", sort_no:9, created_at:"2026-08-14", description:"편안한 상담을 위한 독립 상담실입니다." },
  { id:8, title:"등기 서류 검토 과정",   images:[], thumb_url:"", image_url:"", sort_no:8, created_at:"2026-08-02", description:"접수 전 서류를 2인 이상 교차 확인합니다." },
  { id:7, title:"사무소 입구",          images:[], thumb_url:"", image_url:"", sort_no:7, created_at:"2026-07-21", description:"대륭테크노타운20차 18층에 위치합니다." },
  { id:6, title:"법인 설립 세미나 현장", images:[], thumb_url:"", image_url:"", sort_no:6, created_at:"2026-07-05", description:"창업자를 위한 법인 설립 절차 설명회." },
  { id:5, title:"업무 회의",            images:[], thumb_url:"", image_url:"", sort_no:5, created_at:"2026-06-19", description:"사건별 진행 상황을 매주 점검합니다." },
  { id:4, title:"자료실",               images:[], thumb_url:"", image_url:"", sort_no:4, created_at:"2026-06-01", description:"등기·경매 관련 자료를 보관합니다." },
  { id:3, title:"온라인 상담 데스크",    images:[], thumb_url:"", image_url:"", sort_no:3, created_at:"2026-05-16", description:"전화·온라인 신청 건을 전담 관리합니다." },
  { id:2, title:"사무소 라운지",        images:[], thumb_url:"", image_url:"", sort_no:2, created_at:"2026-05-02", description:"대기 중 편히 쉬실 수 있는 공간입니다." },
  { id:1, title:"현판",                 images:[], thumb_url:"", image_url:"", sort_no:1, created_at:"2026-04-10", description:"애드윈법무사사무소 현판." }
];


/* ##########################################################################
   1. 임시 저장소  ★ Supabase 연동 시 이 블록 전체를 지우면 됩니다
   ########################################################################## */
var DB_KEY_NOTICE  = "awl_notices_v1";
var DB_KEY_GALLERY = "awl_gallery_v1";
var DB_KEY_AUTH    = "awl_admin_session";

function DB_load(key, seed){
  try{
    var raw = window.localStorage.getItem(key);
    if(raw === null){
      window.localStorage.setItem(key, JSON.stringify(seed));
      return JSON.parse(JSON.stringify(seed));
    }
    return JSON.parse(raw);
  }catch(e){
    return JSON.parse(JSON.stringify(seed));   /* 저장소를 못 쓰면 샘플만 표시 */
  }
}

/* 저장 성공 여부를 돌려줍니다. 용량이 가득 차면 false 입니다. */
function DB_save(key, rows){
  try{
    window.localStorage.setItem(key, JSON.stringify(rows));
    return true;
  }catch(e){
    return false;
  }
}

function DB_notices(){ return DB_load(DB_KEY_NOTICE,  NOTICE_SEED); }
function DB_gallery(){ return DB_load(DB_KEY_GALLERY, GALLERY_SEED); }

function DB_nextId(rows){
  var max = 0, i;
  for(i=0;i<rows.length;i++){ if(Number(rows[i].id) > max){ max = Number(rows[i].id); } }
  return max + 1;
}

function DB_today(){
  var d = new Date();
  return d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + ("0"+d.getDate()).slice(-2);
}

/* 현재 저장소 사용량(대략) — 관리자 화면에 표시합니다 */
function DATA_storageInfo(){
  var used = 0, k;
  try{
    for(k in window.localStorage){
      if(Object.prototype.hasOwnProperty.call(window.localStorage, k)){
        used += (window.localStorage.getItem(k) || "").length;
      }
    }
  }catch(e){ return { used:0, limit:5*1024*1024, percent:0 }; }
  var limit = 5 * 1024 * 1024;
  return { used:used, limit:limit, percent: Math.min(100, Math.round(used/limit*100)) };
}


/* ##########################################################################
   2. 관리자 인증
   ---------------------------------------------------------------------------
   ⚠ 아래 아이디/비밀번호는 임시입니다.
     정적 사이트(GitHub Pages)에서는 이 값이 소스 보기로 그대로 노출됩니다.
     실제 보안은 Supabase Auth + RLS 정책이 담당해야 합니다.

   [SUPABASE] 교체 예시
     function DATA_login(id, pw, cb){
       db.auth.signInWithPassword({ email:id, password:pw }).then(function(res){
         cb({ ok: !res.error, message: res.error ? "로그인 정보가 올바르지 않습니다." : "" });
       });
     }
     function DATA_isAdmin(cb){ db.auth.getSession().then(function(r){ cb(!!r.data.session); }); }
     function DATA_logout(cb){ db.auth.signOut().then(cb); }
   ########################################################################## */
var ADMIN_ID = "admin";
var ADMIN_PW = "adwin1234";

function DATA_login(id, pw, cb){
  var ok = (id === ADMIN_ID && pw === ADMIN_PW);
  if(ok){
    try{ window.sessionStorage.setItem(DB_KEY_AUTH, "1"); }catch(e){}
  }
  setTimeout(function(){
    cb({ ok:ok, message: ok ? "" : "아이디 또는 비밀번호가 올바르지 않습니다." });
  }, 250);
}

function DATA_isAdmin(){
  try{ return window.sessionStorage.getItem(DB_KEY_AUTH) === "1"; }
  catch(e){ return false; }
}

function DATA_logout(){
  try{ window.sessionStorage.removeItem(DB_KEY_AUTH); }catch(e){}
}

/* 관리자 페이지 상단에서 호출 — 로그인 안 했으면 로그인 화면으로 보냅니다 */
function DATA_requireAdmin(){
  if(DATA_isAdmin()){ return true; }
  window.location.replace("admin-login.html");
  return false;
}


/* ##########################################################################
   3. 공지사항
   ########################################################################## */

/* [SUPABASE] 목록
   → db.from("notices").select("*",{count:"exact"})
        .order("is_top",{ascending:false})
        .order("created_at",{ascending:false}).range(from,to) */
function DATA_getNotices(opt, cb){
  var kw = (opt.keyword || "").trim();
  var rows = DB_notices();
  var i, n;

  if(kw){
    rows = rows.filter(function(r){
      return String(r.title).indexOf(kw) > -1 || String(r.content || "").indexOf(kw) > -1;
    });
  }
  rows.sort(function(a,b){
    if(!!a.is_top !== !!b.is_top){ return a.is_top ? -1 : 1; }
    if(a.created_at !== b.created_at){ return a.created_at < b.created_at ? 1 : -1; }
    return Number(b.id) - Number(a.id);
  });

  /* 글 번호는 상단고정(공지) 글을 빼고 매깁니다.
     그래야 공지가 늘어나도 일반 글 번호가 어긋나지 않습니다. */
  n = 0;
  for(i=0;i<rows.length;i++){ if(!rows[i].is_top){ n++; } }
  for(i=0;i<rows.length;i++){
    if(rows[i].is_top){ rows[i]._no = 0; }
    else { rows[i]._no = n; n--; }
  }

  cb({ total: rows.length, rows: DATA_page(rows, opt.page, opt.size) });
}

/* [SUPABASE] 단건 (조회수 증가는 RPC 함수로 처리하는 편이 안전합니다) */
function DATA_getNotice(id, cb){
  var rows = DB_notices();
  var i, row = null, idx = -1, changed = false;

  rows.sort(function(a,b){
    if(a.created_at !== b.created_at){ return a.created_at < b.created_at ? 1 : -1; }
    return Number(b.id) - Number(a.id);
  });
  for(i=0;i<rows.length;i++){
    if(String(rows[i].id) === String(id)){ row = rows[i]; idx = i; }
  }

  if(row){
    row.views = Number(row.views || 0) + 1;      /* 조회수 증가 */
    changed = true;
  }
  if(changed){
    var all = DB_notices();
    for(i=0;i<all.length;i++){
      if(String(all[i].id) === String(id)){ all[i].views = row.views; }
    }
    DB_save(DB_KEY_NOTICE, all);
  }

  cb({
    row:  row,
    prev: idx > 0 ? rows[idx-1] : null,
    next: idx > -1 && idx < rows.length-1 ? rows[idx+1] : null
  });
}

/* [SUPABASE] 저장 (id 가 있으면 수정, 없으면 새 글)
   → 새 글  : db.from("notices").insert([row])
   → 수정   : db.from("notices").update(row).eq("id", row.id) */
function DATA_saveNotice(row, cb){
  var rows = DB_notices(), i, found = false;

  for(i=0;i<rows.length;i++){
    if(row.id && String(rows[i].id) === String(row.id)){
      rows[i].title   = row.title;
      rows[i].content = row.content;
      rows[i].writer  = row.writer;
      rows[i].is_top  = !!row.is_top;
      found = true;
    }
  }
  if(!found){
    row.id         = DB_nextId(rows);
    row.views      = 0;
    row.created_at = DB_today();
    row.is_top     = !!row.is_top;
    rows.push(row);
  }

  var ok = DB_save(DB_KEY_NOTICE, rows);
  setTimeout(function(){ cb({ ok:ok, id:row.id, reason: ok ? "" : "quota" }); }, 200);
}

/* [SUPABASE] 삭제 → db.from("notices").delete().eq("id", id) */
function DATA_deleteNotice(id, cb){
  var rows = DB_notices().filter(function(r){ return String(r.id) !== String(id); });
  var ok = DB_save(DB_KEY_NOTICE, rows);
  setTimeout(function(){ cb({ ok:ok }); }, 200);
}


/* ##########################################################################
   4. 갤러리
   ########################################################################## */

/* [SUPABASE] 목록 : sort = latest | oldest | title */
function DATA_getGallery(opt, cb){
  var rows = DB_gallery();
  var kw = (opt.keyword || "").trim();

  if(kw){ rows = rows.filter(function(r){ return String(r.title).indexOf(kw) > -1; }); }

  if(opt.sort === "oldest"){
    rows.sort(function(a,b){ return a.created_at > b.created_at ? 1 : -1; });
  }else if(opt.sort === "title"){
    rows.sort(function(a,b){ return a.title > b.title ? 1 : -1; });
  }else{
    rows.sort(function(a,b){
      if(a.created_at !== b.created_at){ return a.created_at < b.created_at ? 1 : -1; }
      return Number(b.id) - Number(a.id);
    });
  }
  cb({ total: rows.length, rows: DATA_page(rows, opt.page, opt.size) });
}

/* [SUPABASE] 단건 (사진 여러 장은 gallery_images 를 조인해서 가져옵니다) */
function DATA_getGalleryItem(id, cb){
  var rows = DB_gallery(), i, row = null;
  for(i=0;i<rows.length;i++){
    if(String(rows[i].id) === String(id)){ row = rows[i]; }
  }
  cb({ row: row });
}

/* [SUPABASE] 저장
   1) 사진을 Storage 에 업로드해 URL 을 받고
   2) gallery 에 본문 insert/update
   3) gallery_images 에 사진 목록을 다시 기록  (기존 것 삭제 후 재등록이 간단합니다) */
function DATA_saveGallery(row, cb){
  var rows = DB_gallery(), i, found = false;
  var imgs = row.images || [];

  /* 대표 이미지는 항상 첫 번째 사진입니다 */
  row.thumb_url = imgs.length ? imgs[0].thumb : "";
  row.image_url = imgs.length ? imgs[0].full  : "";

  for(i=0;i<rows.length;i++){
    if(row.id && String(rows[i].id) === String(row.id)){
      rows[i].title       = row.title;
      rows[i].description = row.description;
      rows[i].images      = imgs;
      rows[i].thumb_url   = row.thumb_url;
      rows[i].image_url   = row.image_url;
      found = true;
    }
  }
  if(!found){
    row.id         = DB_nextId(rows);
    row.sort_no    = row.id;
    row.created_at = DB_today();
    rows.push(row);
  }

  var ok = DB_save(DB_KEY_GALLERY, rows);
  setTimeout(function(){ cb({ ok:ok, id:row.id, reason: ok ? "" : "quota" }); }, 200);
}

/* [SUPABASE] 삭제 (Storage 의 사진 파일도 함께 지워야 합니다) */
function DATA_deleteGallery(id, cb){
  var rows = DB_gallery().filter(function(r){ return String(r.id) !== String(id); });
  var ok = DB_save(DB_KEY_GALLERY, rows);
  setTimeout(function(){ cb({ ok:ok }); }, 200);
}


/* ##########################################################################
   5. 상담 신청 (접수 · 조회 · 상태 · 메모)
   ---------------------------------------------------------------------------
   form : { field, name, phone, email, prefer_date, message, agree }
   file : File 객체 1개 또는 null  (2개 이상 첨부 시 apply.html 이 zip 으로 묶음)

   ⚠ 첨부파일 실물은 지금 저장하지 않습니다.
     10MB zip 을 브라우저 저장소에 넣으면 용량이 즉시 초과되기 때문에
     파일명 · 용량 · 형식만 기록합니다.
     Supabase Storage 연동 후 file_path 로 실제 다운로드가 열립니다.
   ########################################################################## */
var DB_KEY_APPLY  = "awl_applications_v1";
var APPLY_STATUS  = ["접수", "상담중", "보류", "완료"];

var APPLY_SEED = [
  { id:3, status:"접수", field:"부동산등기", name:"김민수", phone:"010-2345-6789",
    email:"minsu.kim@example.com", prefer_date:"2026-09-05",
    message:"아파트 매매 잔금이 3주 뒤입니다. 소유권이전등기 비용과 준비 서류를 알고 싶습니다.\n매도인이 지방에 거주 중이라 대리 처리가 가능한지도 궁금합니다.",
    file_name:"매매계약서.pdf", file_size:842000, file_path:null,
    created_at:"2026-08-30 10:14", memos:[] },
  { id:2, status:"상담중", field:"개인회생·파산", name:"이지현", phone:"010-8765-4321",
    email:"", prefer_date:"",
    message:"카드 대금과 대출이 겹쳐 상환이 어렵습니다. 개인회생 신청 요건을 상담받고 싶습니다.",
    file_name:"", file_size:0, file_path:null,
    created_at:"2026-08-28 16:40",
    memos:[ { id:"m1", text:"1차 통화 완료. 소득증빙 서류 요청함.", at:"2026-08-29 09:20" } ] },
  { id:1, status:"완료", field:"법인등기", name:"박서준", phone:"010-1111-2222",
    email:"sjpark@example.com", prefer_date:"2026-08-20",
    message:"스타트업 법인 설립 등기를 문의드립니다. 자본금 5천만원 예정입니다.",
    file_name:"상담첨부_박서준_20260818.zip", file_size:1650000, file_path:null,
    created_at:"2026-08-18 11:05",
    memos:[
      { id:"m1", text:"8/19 방문 상담 진행.", at:"2026-08-19 15:30" },
      { id:"m2", text:"설립 등기 접수 완료. 등기부 발급 후 전달함.", at:"2026-08-25 10:02" }
    ] }
];

function DB_applies(){ return DB_load(DB_KEY_APPLY, APPLY_SEED); }

function DB_now(){
  var d = new Date();
  return d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + ("0"+d.getDate()).slice(-2) +
         " " + ("0"+d.getHours()).slice(-2) + ":" + ("0"+d.getMinutes()).slice(-2);
}

/* [SUPABASE] 접수 저장
     var row = { field:form.field, name:form.name, phone:form.phone, email:form.email,
                 prefer_date:form.prefer_date || null, message:form.message, agree:true,
                 status:"접수", file_path:null, file_name:null, file_size:null };
     var step = Promise.resolve();
     if(file){
       var safe = DATA_safeFileName(file.name);
       var path = safe.folder + "/" + safe.key;
       step = db.storage.from("applications")            // ※ Private 버킷
                .upload(path, file, { contentType: file.type || "application/octet-stream" })
                .then(function(up){
                  if(up.error){ throw up.error; }
                  row.file_path = path;                  // 관리자는 createSignedUrl 로 열람
                  row.file_name = file.name;
                  row.file_size = file.size;
                });
     }
     step.then(function(){ return db.from("applications").insert([row]).select("id").single(); })
         .then(function(res){ if(res.error){ throw res.error; } cb({ ok:true, id:res.data.id }); })
         ["catch"](function(){ cb({ ok:false }); });                                          */
function DATA_submitApplication(form, file, cb){
  var rows = DB_applies();
  var row = {
    id:          DB_nextId(rows),
    status:      "접수",
    field:       form.field,
    name:        form.name,
    phone:       form.phone,
    email:       form.email || "",
    prefer_date: form.prefer_date || "",
    message:     form.message,
    /* 파일은 이름·용량만 기록합니다 (실물은 Supabase Storage 연동 후) */
    file_name:   file ? file.name : "",
    file_size:   file ? file.size : 0,
    file_path:   null,
    created_at:  DB_now(),
    memos:       []
  };
  rows.push(row);
  var ok = DB_save(DB_KEY_APPLY, rows);
  setTimeout(function(){ cb({ ok:ok, id:row.id }); }, 500);
}

/* [SUPABASE] 목록
   → db.from("applications").select("*").order("created_at",{ascending:false})
   opt : { status:"전체"|"접수"|..., keyword:"" }
   반환 : { total, rows, counts:{접수:n, 상담중:n, ...}, all:전체건수 }        */
function DATA_getApplications(opt, cb){
  opt = opt || {};
  var all = DB_applies();
  var kw  = (opt.keyword || "").trim();
  var i, counts = {}, rows;

  for(i=0;i<APPLY_STATUS.length;i++){ counts[APPLY_STATUS[i]] = 0; }
  for(i=0;i<all.length;i++){
    var st = all[i].status || "접수";
    if(counts[st] === undefined){ counts[st] = 0; }
    counts[st]++;
  }

  rows = all.slice(0);
  if(opt.status && opt.status !== "전체"){
    rows = rows.filter(function(r){ return (r.status || "접수") === opt.status; });
  }
  if(kw){
    rows = rows.filter(function(r){
      return String(r.name).indexOf(kw) > -1 ||
             String(r.phone).indexOf(kw) > -1 ||
             String(r.field).indexOf(kw) > -1 ||
             String(r.message || "").indexOf(kw) > -1;
    });
  }
  rows.sort(function(a,b){
    if(a.created_at !== b.created_at){ return a.created_at < b.created_at ? 1 : -1; }
    return Number(b.id) - Number(a.id);
  });

  cb({ total: rows.length, rows: rows, counts: counts, all: all.length });
}

/* [SUPABASE] 상태 변경 / 메모 추가 / 메모 삭제
   patch : { status:"완료" } | { addMemo:"내용" } | { delMemo:"m1" }
   → 메모는 별도 테이블(application_memos)로 빼는 편이 관리하기 좋습니다.      */
function DATA_updateApplication(id, patch, cb){
  var rows = DB_applies(), i, hit = null;
  for(i=0;i<rows.length;i++){
    if(String(rows[i].id) === String(id)){ hit = rows[i]; }
  }
  if(!hit){ return setTimeout(function(){ cb({ ok:false }); }, 100); }

  if(patch.status){ hit.status = patch.status; }

  if(patch.addMemo){
    if(!hit.memos){ hit.memos = []; }
    hit.memos.push({
      id:   "m" + Date.now(),
      text: String(patch.addMemo),
      at:   DB_now()
    });
  }
  if(patch.delMemo){
    hit.memos = (hit.memos || []).filter(function(m){ return m.id !== patch.delMemo; });
  }

  var ok = DB_save(DB_KEY_APPLY, rows);
  setTimeout(function(){ cb({ ok:ok }); }, 150);
}

/* [SUPABASE] 삭제 (Storage 의 첨부파일도 함께 지워야 합니다) */
function DATA_deleteApplication(id, cb){
  var rows = DB_applies().filter(function(r){ return String(r.id) !== String(id); });
  var ok = DB_save(DB_KEY_APPLY, rows);
  setTimeout(function(){ cb({ ok:ok }); }, 150);
}

/* 용량 표기 (1.6 MB / 842 KB) */
function DATA_fileSize(bytes){
  bytes = Number(bytes || 0);
  if(!bytes){ return ""; }
  if(bytes < 1024){ return bytes + " B"; }
  if(bytes < 1024*1024){ return Math.round(bytes/1024) + " KB"; }
  return (bytes/1024/1024).toFixed(1) + " MB";
}


/* --------------------------------------------------------------------------
   파일명 정규화
   Supabase Storage 는 한글·공백·특수문자가 섞인 경로에서 문제가 생길 수 있어
   저장 경로는 영문/숫자로만 만들고, 원래 파일명은 DB 컬럼에 따로 보관합니다.
   반환 : { folder:"2026/08", key:"3f2a1c...9b.zip", ext:"zip" }
   -------------------------------------------------------------------------- */
function DATA_safeFileName(name){
  var d   = new Date();
  var mm  = ("0" + (d.getMonth()+1)).slice(-2);
  var s   = String(name || "");
  var dot = s.lastIndexOf(".");
  var ext = dot > -1 ? s.substring(dot+1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  var chars = "0123456789abcdef", rnd = "", i;
  for(i=0;i<24;i++){ rnd += chars.charAt(Math.floor(Math.random()*16)); }
  return { folder: d.getFullYear() + "/" + mm, key: rnd + (ext ? "." + ext : ""), ext: ext };
}


/* ##########################################################################
   6. 내부 유틸
   ########################################################################## */
function DATA_page(rows, page, size){
  var p = page || 1, s = size || 10;
  return rows.slice((p-1)*s, (p-1)*s + s);
}

/* 페이지네이션 HTML 생성
   prefix 는 board.css 의 클래스 접두어와 짝을 이룹니다 (현재 "bd-") */
function DATA_pager(total, page, size, prefix){
  var last = Math.ceil(total / size) || 1, i, h = "";
  h += "<button type=\"button\" class=\"" + prefix + "pg-arw\" data-go=\"" + Math.max(1, page-1) + "\">이전</button>";
  for(i=1;i<=last;i++){
    h += "<button type=\"button\" class=\"" + prefix + "pg-num" + (i===page ? " is-on" : "") + "\" data-go=\"" + i + "\">" + i + "</button>";
  }
  h += "<button type=\"button\" class=\"" + prefix + "pg-arw\" data-go=\"" + Math.min(last, page+1) + "\">다음</button>";
  return h;
}

/* HTML 이스케이프 — 사용자가 입력한 값을 화면에 찍을 때 반드시 거치세요.
   (<script> 같은 태그가 그대로 실행되는 것을 막습니다) */
function DATA_esc(s){
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
