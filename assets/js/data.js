/* ==========================================================================
   data.js  |  Supabase 연동 데이터 레이어
   ---------------------------------------------------------------------------
   접속 설정은 assets/js/supabase.config.js 에 있습니다.
   HTML 은 이 파일의 DATA_* 함수만 호출합니다. (콜백 방식 유지)

   [스크립트 로드 순서] — 이 순서가 어긋나면 동작하지 않습니다
     1. supabase-js CDN
     2. supabase.config.js
     3. site.config.js
     4. data.js
     5. layout.js

   [테이블]
     notices       공지사항
     gallery       갤러리 (사진 목록은 images jsonb 배열)
     applications  상담신청 (처리 메모는 memos jsonb 배열)

   [보안] 실제 권한은 Supabase RLS 정책이 막습니다.
     공지·갤러리    읽기 누구나 / 쓰기 로그인한 관리자만
     상담신청       접수 누구나 / 열람·수정·삭제 관리자만
     gallery 버킷   공개 (사진은 누구나 봐야 하므로)
     applications 버킷  비공개 (개인정보 → 관리자만 서명 URL 로 열람)
   ========================================================================== */

var APPLY_STATUS = ["접수", "상담중", "보류", "완료"];


/* ##########################################################################
   0. 공통 도우미
   ########################################################################## */

/* Supabase 연결이 없을 때 쓰는 공통 실패 응답 */
function DB_offline(cb, shape){
  var res = shape || {};
  res.ok = false;
  res.message = "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  setTimeout(function(){ cb(res); }, 0);
}

/* Supabase 오류를 사람이 읽을 수 있는 문장으로 */
function DB_err(e){
  if(!e){ return "알 수 없는 오류가 발생했습니다."; }
  var m = e.message || String(e);
  if(/JWT|not authenticated|Invalid Refresh/i.test(m)){
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  }
  if(/row-level security|violates row-level/i.test(m)){
    return "권한이 없습니다. 로그인 상태를 확인해 주세요.";
  }
  if(/Failed to fetch|NetworkError/i.test(m)){
    return "네트워크 연결을 확인해 주세요.";
  }
  return m;
}

/* 검색어에서 PostgREST 필터를 깨뜨리는 문자를 제거합니다 */
function DB_kw(s){
  return String(s || "").trim().replace(/[,()%*]/g, "");
}

/* "2026-09-01T05:23:11+00:00" → "2026-09-01 14:23" (사용자 시간대 기준) */
function DATA_dateTime(iso){
  if(!iso){ return ""; }
  var d = new Date(iso);
  if(isNaN(d.getTime())){ return String(iso).substring(0, 16).replace("T", " "); }
  return d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + ("0"+d.getDate()).slice(-2) +
         " " + ("0"+d.getHours()).slice(-2) + ":" + ("0"+d.getMinutes()).slice(-2);
}

/* 용량 표기 (1.6 MB / 842 KB) */
function DATA_fileSize(bytes){
  bytes = Number(bytes || 0);
  if(!bytes){ return ""; }
  if(bytes < 1024){ return bytes + " B"; }
  if(bytes < 1024*1024){ return Math.round(bytes/1024) + " KB"; }
  return (bytes/1024/1024).toFixed(1) + " MB";
}

/* HTML 이스케이프 — 사용자가 입력한 값을 화면에 찍을 때 반드시 거치세요 */
function DATA_esc(s){
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

/* 저장 경로용 임의 파일명 : 2026/09/3f2a....jpg
   한글·공백 파일명은 Storage 경로에서 문제가 생길 수 있어 영문/숫자로만 만듭니다.
   원래 파일명은 DB 의 file_name 컬럼에 그대로 보관합니다.                 */
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

/* data:image/jpeg;base64,... → Blob (갤러리 사진 업로드용) */
function DB_dataUrlToBlob(url){
  var parts = String(url).split(",");
  var mime  = (parts[0].match(/:(.*?);/) || [])[1] || "image/jpeg";
  var bin   = atob(parts[1]);
  var n     = bin.length;
  var arr   = new Uint8Array(n);
  while(n--){ arr[n] = bin.charCodeAt(n); }
  return new Blob([arr], { type: mime });
}


/* ##########################################################################
   1. 관리자 인증  (Supabase Auth)
   ########################################################################## */

/* 이메일 + 비밀번호 로그인 */
function DATA_login(email, pw, cb){
  if(!SB_ready()){ return DB_offline(cb); }
  SB.auth.signInWithPassword({ email: String(email).trim(), password: pw })
    .then(function(res){
      if(res.error){
        var m = res.error.message || "";
        cb({ ok:false, message: /Invalid login credentials/i.test(m)
              ? "이메일 또는 비밀번호가 올바르지 않습니다."
              : (/Email not confirmed/i.test(m)
                  ? "이메일 인증이 완료되지 않은 계정입니다."
                  : DB_err(res.error)) });
        return;
      }
      cb({ ok:true, message:"" });
    })
    ["catch"](function(e){ cb({ ok:false, message: DB_err(e) }); });
}

/* 로그인 여부 확인 (비동기) */
function DATA_isAdmin(cb){
  if(!SB_ready()){ return setTimeout(function(){ cb(false); }, 0); }
  SB.auth.getSession()
    .then(function(res){ cb(!!(res.data && res.data.session)); })
    ["catch"](function(){ cb(false); });
}

function DATA_logout(cb){
  if(!SB_ready()){ return cb && cb(); }
  SB.auth.signOut()
    .then(function(){ cb && cb(); })
    ["catch"](function(){ cb && cb(); });
}

/* 관리자 페이지 진입 가드
   로그인했으면 onOk() 실행, 아니면 로그인 화면으로 보냅니다.
   사용법 : DATA_requireAdmin(start);  function start(){ ... }        */
function DATA_requireAdmin(onOk){
  DATA_isAdmin(function(ok){
    if(ok){ onOk(); }
    else{ window.location.replace("admin-login.html"); }
  });
}

/* 로그인한 관리자 이메일 (화면 표시용) */
function DATA_adminEmail(cb){
  if(!SB_ready()){ return cb(""); }
  SB.auth.getUser()
    .then(function(res){ cb((res.data && res.data.user && res.data.user.email) || ""); })
    ["catch"](function(){ cb(""); });
}


/* ##########################################################################
   2. 공지사항
   ########################################################################## */

/* 목록 : opt { page, size, keyword }
   반환 : { total, rows }   rows 의 _no 는 화면에 표시할 글 번호입니다.
   상단고정(공지) 글은 번호에서 제외하므로, 고정 글 수를 따로 세어 계산합니다. */
function DATA_getNotices(opt, cb){
  if(!SB_ready()){ return DB_offline(cb, { total:0, rows:[] }); }

  var page = opt.page || 1;
  var size = opt.size || 10;
  var kw   = DB_kw(opt.keyword);
  var from = (page-1) * size;

  function base(){
    var q = SB.from("notices");
    return q;
  }

  var listQ = base().select("*", { count:"exact" });
  var topQ  = base().select("id", { count:"exact", head:true }).eq("is_top", true);

  if(kw){
    var f = "title.ilike.%" + kw + "%,content.ilike.%" + kw + "%";
    listQ = listQ.or(f);
    topQ  = topQ.or(f);
  }

  listQ = listQ
    .order("is_top",     { ascending:false })
    .order("created_at", { ascending:false })
    .order("id",         { ascending:false })
    .range(from, from + size - 1);

  Promise.all([listQ, topQ]).then(function(r){
    var list = r[0], top = r[1];
    if(list.error){ throw list.error; }

    var total    = list.count || 0;
    var topTotal = top.error ? 0 : (top.count || 0);
    var normal   = total - topTotal;
    var rows     = list.data || [];
    var i, gi;

    for(i=0;i<rows.length;i++){
      gi = from + i;                       /* 전체 목록에서의 순번(0부터) */
      rows[i]._no = rows[i].is_top ? 0 : (normal - (gi - topTotal));
    }
    cb({ total: total, rows: rows });
  })["catch"](function(e){
    if(window.console){ console.error(e); }
    cb({ total:0, rows:[], ok:false, message: DB_err(e) });
  });
}

/* 단건 + 이전/다음 글 + 조회수 증가
   이전/다음은 제목만 가벼운 목록으로 받아 앞뒤를 찾습니다. */
function DATA_getNotice(id, cb){
  if(!SB_ready()){ return DB_offline(cb, { row:null, prev:null, next:null }); }

  Promise.all([
    SB.from("notices").select("*").eq("id", id).maybeSingle(),
    SB.from("notices").select("id,title,created_at")
      .order("created_at", { ascending:false })
      .order("id",         { ascending:false })
  ]).then(function(r){
    var one = r[0], all = r[1];
    if(one.error){ throw one.error; }
    if(!one.data){ return cb({ row:null, prev:null, next:null }); }

    var rows = (all.data || []), i, idx = -1;
    for(i=0;i<rows.length;i++){
      if(String(rows[i].id) === String(id)){ idx = i; }
    }

    /* 조회수 증가 : 방문자는 notices 를 수정할 수 없으므로 RPC 함수로 올립니다.
       ※ supabase-js 의 쿼리 객체는 .then() 만 있고 .catch() 가 없습니다.
         .catch() 를 쓰면 여기서 예외가 나서 아래 cb() 가 실행되지 않습니다.
         실패해도 본문 표시에는 영향이 없도록 then 의 두 번째 인자로 받습니다. */
    SB.rpc("increment_notice_views", { nid: Number(id) }).then(function(){}, function(){});

    cb({
      row:  one.data,
      prev: idx > 0 ? rows[idx-1] : null,
      next: (idx > -1 && idx < rows.length-1) ? rows[idx+1] : null
    });
  })["catch"](function(e){
    if(window.console){ console.error(e); }
    cb({ row:null, prev:null, next:null, ok:false, message: DB_err(e) });
  });
}

/* 저장 : row.id 가 있으면 수정, 없으면 새 글 */
function DATA_saveNotice(row, cb){
  if(!SB_ready()){ return DB_offline(cb); }

  var body = {
    title:   row.title,
    content: row.content,
    writer:  row.writer || "관리자",
    is_top:  !!row.is_top
  };
  var q = row.id
    ? SB.from("notices").update(body).eq("id", row.id).select("id").maybeSingle()
    : SB.from("notices").insert([body]).select("id").single();

  q.then(function(res){
    if(res.error){ throw res.error; }
    cb({ ok:true, id: res.data ? res.data.id : row.id });
  })["catch"](function(e){
    if(window.console){ console.error(e); }
    cb({ ok:false, message: DB_err(e) });
  });
}

function DATA_deleteNotice(id, cb){
  if(!SB_ready()){ return DB_offline(cb); }
  SB.from("notices").delete().eq("id", id).then(function(res){
    if(res.error){ throw res.error; }
    cb({ ok:true });
  })["catch"](function(e){ cb({ ok:false, message: DB_err(e) }); });
}


/* ##########################################################################
   3. 갤러리
   ---------------------------------------------------------------------------
   images 컬럼(jsonb) 구조
     [ { url, path, thumb_url, thumb_path }, ... ]
   목록·상세 화면이 쓰는 thumb_url / image_url 은 첫 번째 사진에서 만들어 줍니다.
   ########################################################################## */

function DB_galleryShape(r){
  var imgs = r.images || [];
  r.images    = imgs;
  r.thumb_url = imgs.length ? (imgs[0].thumb_url || imgs[0].url) : "";
  r.image_url = imgs.length ? imgs[0].url : "";
  /* 상세 화면은 {full, thumb} 형태를 기대하므로 맞춰 줍니다 */
  r.images = imgs.map(function(x){
    return {
      full:       x.url,
      thumb:      x.thumb_url || x.url,
      path:       x.path,
      thumb_path: x.thumb_path,
      url:        x.url,
      thumb_url:  x.thumb_url
    };
  });
  return r;
}

/* 목록 : opt { page, size, sort:"latest"|"oldest"|"title", keyword } */
function DATA_getGallery(opt, cb){
  if(!SB_ready()){ return DB_offline(cb, { total:0, rows:[] }); }

  var page = opt.page || 1;
  var size = opt.size || 12;
  var kw   = DB_kw(opt.keyword);
  var from = (page-1) * size;

  var q = SB.from("gallery").select("*", { count:"exact" });
  if(kw){ q = q.ilike("title", "%" + kw + "%"); }

  if(opt.sort === "oldest"){
    q = q.order("created_at", { ascending:true }).order("id", { ascending:true });
  }else if(opt.sort === "title"){
    q = q.order("title", { ascending:true });
  }else{
    q = q.order("created_at", { ascending:false }).order("id", { ascending:false });
  }

  q.range(from, from + size - 1).then(function(res){
    if(res.error){ throw res.error; }
    cb({ total: res.count || 0, rows: (res.data || []).map(DB_galleryShape) });
  })["catch"](function(e){
    if(window.console){ console.error(e); }
    cb({ total:0, rows:[], ok:false, message: DB_err(e) });
  });
}

function DATA_getGalleryItem(id, cb){
  if(!SB_ready()){ return DB_offline(cb, { row:null }); }
  SB.from("gallery").select("*").eq("id", id).maybeSingle().then(function(res){
    if(res.error){ throw res.error; }
    cb({ row: res.data ? DB_galleryShape(res.data) : null });
  })["catch"](function(e){
    cb({ row:null, ok:false, message: DB_err(e) });
  });
}

/* 저장 : 새로 추가된 사진만 Storage 에 올리고, 기존 사진은 그대로 둡니다.
   row.images 원소
     이미 올라간 사진 : { url, path, thumb_url, thumb_path }
     새로 고른 사진   : { full:"data:image/...", thumb:"data:image/..." }
   onProgress(현재, 전체) 는 선택 인자입니다.                              */
function DATA_saveGallery(row, cb, onProgress){
  if(!SB_ready()){ return DB_offline(cb); }

  var imgs  = row.images || [];
  var store = SB.storage.from(SB_BUCKET_GALLERY);
  var out   = [];
  var todo  = 0, done = 0, i;

  for(i=0;i<imgs.length;i++){ if(!imgs[i].url){ todo++; } }

  /* 사진 1장을 올리고 공개 URL 을 돌려줍니다 */
  function upload(dataUrl){
    var f    = DATA_safeFileName("photo.jpg");
    var path = f.folder + "/" + f.key;
    return store.upload(path, DB_dataUrlToBlob(dataUrl), {
      contentType: "image/jpeg",
      upsert: false
    }).then(function(r){
      if(r.error){ throw r.error; }
      return { path: path, url: store.getPublicUrl(path).data.publicUrl };
    });
  }

  /* 순서를 지켜야 하므로 하나씩 차례로 올립니다 */
  var chain = Promise.resolve();
  imgs.forEach(function(img, idx){
    chain = chain.then(function(){
      if(img.url){                       /* 기존 사진은 그대로 유지 */
        out[idx] = {
          url:        img.url,
          path:       img.path,
          thumb_url:  img.thumb_url || img.url,
          thumb_path: img.thumb_path || img.path
        };
        return;
      }
      return upload(img.full).then(function(full){
        return upload(img.thumb || img.full).then(function(thumb){
          out[idx] = {
            url:        full.url,
            path:       full.path,
            thumb_url:  thumb.url,
            thumb_path: thumb.path
          };
          done++;
          if(onProgress){ onProgress(done, todo); }
        });
      });
    });
  });

  chain.then(function(){
    var body = {
      title:       row.title,
      description: row.description || "",
      images:      out
    };
    return row.id
      ? SB.from("gallery").update(body).eq("id", row.id).select("id").maybeSingle()
      : SB.from("gallery").insert([body]).select("id").single();
  }).then(function(res){
    if(res.error){ throw res.error; }
    cb({ ok:true, id: res.data ? res.data.id : row.id });
  })["catch"](function(e){
    if(window.console){ console.error(e); }
    cb({ ok:false, message: DB_err(e) });
  });
}

/* 삭제 : Storage 의 사진 파일까지 함께 지웁니다 */
function DATA_deleteGallery(id, cb){
  if(!SB_ready()){ return DB_offline(cb); }

  SB.from("gallery").select("images").eq("id", id).maybeSingle().then(function(res){
    var imgs = (res.data && res.data.images) || [];
    var paths = [], i;
    for(i=0;i<imgs.length;i++){
      if(imgs[i].path){ paths.push(imgs[i].path); }
      if(imgs[i].thumb_path && imgs[i].thumb_path !== imgs[i].path){ paths.push(imgs[i].thumb_path); }
    }
    /* 파일 삭제가 실패해도 글은 지웁니다 (고아 파일은 나중에 정리) */
    if(paths.length){
      return SB.storage.from(SB_BUCKET_GALLERY).remove(paths)["catch"](function(){});
    }
  }).then(function(){
    return SB.from("gallery").delete().eq("id", id);
  }).then(function(res){
    if(res && res.error){ throw res.error; }
    cb({ ok:true });
  })["catch"](function(e){
    if(window.console){ console.error(e); }
    cb({ ok:false, message: DB_err(e) });
  });
}


/* ##########################################################################
   4. 상담 신청
   ########################################################################## */

/* 접수 : 첨부파일을 비공개 버킷에 올린 뒤 본문을 저장합니다.
   form : { field, name, phone, email, prefer_date, message, agree }
   file : File 1개 또는 null (2개 이상은 apply.html 이 zip 으로 묶어 넘김)  */
function DATA_submitApplication(form, file, cb){
  if(!SB_ready()){ return DB_offline(cb); }

  var row = {
    status:      "접수",
    field:       form.field,
    name:        form.name,
    phone:       form.phone,
    email:       form.email || "",
    prefer_date: form.prefer_date || null,   /* 빈 문자열은 date 컬럼에 못 들어갑니다 */
    message:     form.message,
    file_path:   null,
    file_name:   null,
    file_size:   null,
    memos:       []
  };

  var step = Promise.resolve();

  if(file){
    var f    = DATA_safeFileName(file.name);
    var path = f.folder + "/" + f.key;
    step = SB.storage.from(SB_BUCKET_APPLY).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    }).then(function(r){
      if(r.error){ throw r.error; }
      row.file_path = path;
      row.file_name = file.name;   /* 원래 한글 파일명은 DB 에 보관 */
      row.file_size = file.size;
    });
  }

  step.then(function(){
    /* ※ .select() 를 붙이면 INSERT ... RETURNING 이 되어 SELECT 권한을 요구합니다.
      상담신청은 "접수는 누구나, 열람은 관리자만" 정책이므로 방문자는 되돌려 받을 수
      없습니다. 접수 번호는 화면에서 쓰지 않으므로 그냥 넣기만 합니다. */
    return SB.from("applications").insert([row]);
  }).then(function(res){
    if(res.error){ throw res.error; }
    cb({ ok:true });
  })["catch"](function(e){
    if(window.console){ console.error(e); }
    /* 파일은 올라갔는데 저장이 실패하면 되돌리기를 시도합니다.
      다만 방문자에게는 삭제 권한이 없어 대개 실패합니다. (권한을 열면 남의 파일도
      지울 수 있게 되므로 열지 않습니다.) 남은 파일은 대시보드에서 가끔 정리하세요. */
    if(row.file_path){
      SB.storage.from(SB_BUCKET_APPLY).remove([row.file_path])["catch"](function(){});
    }
    cb({ ok:false, message: DB_err(e) });
  });
}

/* 목록 (관리자 전용) : opt { status, keyword }
   반환 : { total, rows, counts, all }                                     */
function DATA_getApplications(opt, cb){
  if(!SB_ready()){ return DB_offline(cb, { total:0, rows:[], counts:{}, all:0 }); }
  opt = opt || {};

  SB.from("applications").select("*")
    .order("created_at", { ascending:false })
    .order("id",         { ascending:false })
    .then(function(res){
      if(res.error){ throw res.error; }

      var all = res.data || [], i, counts = {};
      for(i=0;i<APPLY_STATUS.length;i++){ counts[APPLY_STATUS[i]] = 0; }
      for(i=0;i<all.length;i++){
        var st = all[i].status || "접수";
        if(counts[st] === undefined){ counts[st] = 0; }
        counts[st]++;
      }

      var rows = all.slice(0);
      if(opt.status && opt.status !== "전체"){
        rows = rows.filter(function(r){ return (r.status || "접수") === opt.status; });
      }
      var kw = String(opt.keyword || "").trim();
      if(kw){
        rows = rows.filter(function(r){
          return String(r.name).indexOf(kw) > -1 ||
                 String(r.phone).indexOf(kw) > -1 ||
                 String(r.field).indexOf(kw) > -1 ||
                 String(r.message || "").indexOf(kw) > -1;
        });
      }
      cb({ total: rows.length, rows: rows, counts: counts, all: all.length });
    })["catch"](function(e){
      if(window.console){ console.error(e); }
      cb({ total:0, rows:[], counts:{}, all:0, ok:false, message: DB_err(e) });
    });
}

/* 상태 변경 / 메모 추가 / 메모 삭제
   patch : { status:"완료" } | { addMemo:"내용" } | { delMemo:"m1" }        */
function DATA_updateApplication(id, patch, cb){
  if(!SB_ready()){ return DB_offline(cb); }

  var body = {};

  function run(){
    return SB.from("applications").update(body).eq("id", id);
  }

  if(patch.status){
    body.status = patch.status;
    run().then(function(res){
      if(res.error){ throw res.error; }
      cb({ ok:true });
    })["catch"](function(e){ cb({ ok:false, message: DB_err(e) }); });
    return;
  }

  /* 메모는 jsonb 배열이라 현재 값을 읽어 고친 뒤 통째로 다시 씁니다 */
  SB.from("applications").select("memos").eq("id", id).maybeSingle().then(function(res){
    if(res.error){ throw res.error; }
    if(!res.data){ throw new Error("해당 신청을 찾을 수 없습니다."); }

    var memos = res.data.memos || [];
    if(patch.addMemo){
      memos.push({
        id:   "m" + Date.now(),
        text: String(patch.addMemo),
        at:   DATA_dateTime(new Date().toISOString())
      });
    }
    if(patch.delMemo){
      memos = memos.filter(function(m){ return m.id !== patch.delMemo; });
    }
    body.memos = memos;
    return run();
  }).then(function(res){
    if(res.error){ throw res.error; }
    cb({ ok:true });
  })["catch"](function(e){
    if(window.console){ console.error(e); }
    cb({ ok:false, message: DB_err(e) });
  });
}

/* 삭제 : 첨부파일까지 함께 지웁니다 */
function DATA_deleteApplication(id, cb){
  if(!SB_ready()){ return DB_offline(cb); }

  SB.from("applications").select("file_path").eq("id", id).maybeSingle().then(function(res){
    var p = res.data && res.data.file_path;
    if(p){ return SB.storage.from(SB_BUCKET_APPLY).remove([p])["catch"](function(){}); }
  }).then(function(){
    return SB.from("applications").delete().eq("id", id);
  }).then(function(res){
    if(res && res.error){ throw res.error; }
    cb({ ok:true });
  })["catch"](function(e){
    if(window.console){ console.error(e); }
    cb({ ok:false, message: DB_err(e) });
  });
}

/* 첨부파일 내려받기 주소 (관리자 전용)
   버킷이 비공개이므로 60초짜리 임시 서명 URL 을 발급받습니다.
   주소가 유출돼도 1분 뒤에는 열리지 않습니다.                              */
function DATA_getFileUrl(path, cb){
  if(!SB_ready()){ return cb({ ok:false, message:"서버에 연결할 수 없습니다." }); }
  SB.storage.from(SB_BUCKET_APPLY).createSignedUrl(path, 60).then(function(res){
    if(res.error){ throw res.error; }
    cb({ ok:true, url: res.data.signedUrl });
  })["catch"](function(e){
    cb({ ok:false, message: DB_err(e) });
  });
}


/* ##########################################################################
   5. 내부 유틸 (기존 호환)
   ########################################################################## */
function DATA_page(rows, page, size){
  var p = page || 1, s = size || 10;
  return rows.slice((p-1)*s, (p-1)*s + s);
}

/* 페이지네이션 HTML — prefix 는 board.css 의 클래스 접두어 ("bd-") */
function DATA_pager(total, page, size, prefix){
  var last = Math.ceil(total / size) || 1, i, h = "";
  h += "<button type=\"button\" class=\"" + prefix + "pg-arw\" data-go=\"" + Math.max(1, page-1) + "\">이전</button>";
  for(i=1;i<=last;i++){
    h += "<button type=\"button\" class=\"" + prefix + "pg-num" + (i===page ? " is-on" : "") + "\" data-go=\"" + i + "\">" + i + "</button>";
  }
  h += "<button type=\"button\" class=\"" + prefix + "pg-arw\" data-go=\"" + Math.min(last, page+1) + "\">다음</button>";
  return h;
}
