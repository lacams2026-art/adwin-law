/* ==========================================================================
   supabase.config.js  |  Supabase 접속 설정
   ★ 프로젝트를 옮기면 이 파일의 두 값만 바꾸면 됩니다.

   [이 키는 공개돼도 됩니다]
   publishable 키는 브라우저에 노출되는 것을 전제로 만들어진 키입니다.
   실제 방어는 Supabase 의 RLS(Row Level Security) 정책이 담당합니다.
   → 공지·갤러리 : 누구나 읽기 / 로그인한 관리자만 쓰기
   → 상담신청     : 누구나 접수만 가능 / 열람·수정·삭제는 관리자만

   [절대 넣지 마세요]
   sb_secret_... 또는 service_role 키는 RLS 를 통째로 무시합니다.
   저장소가 Public 이므로 넣는 순간 DB 전체가 열립니다.
   ========================================================================== */

var SUPABASE_URL = "https://siklggdytfzecugjapcb.supabase.co";
var SUPABASE_KEY = "sb_publishable_C2ljo1DSYjnX5eLGn-hduQ_yZC2FK3H";

/* 스토리지 버킷 이름 (SQL 에서 만든 것과 같아야 합니다) */
var SB_BUCKET_GALLERY = "gallery";       /* 공개  : 갤러리 사진 */
var SB_BUCKET_APPLY   = "applications";  /* 비공개: 상담 첨부파일 */

/* 클라이언트 생성 -----------------------------------------------------------
   CDN 스크립트가 window.supabase 를 만들고, 여기서 접속 객체 SB 를 만듭니다.
   CDN 로딩이 실패해도 페이지가 통째로 죽지 않도록 방어해 둡니다.          */
var SB = null;

(function(){
  if(window.supabase && window.supabase.createClient){
    SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession:   true,   /* 새로고침해도 로그인 유지 */
        autoRefreshToken: true,
        storageKey:       "awl-auth"
      }
    });
  }else if(window.console){
    console.error("[Supabase] 라이브러리를 불러오지 못했습니다. 인터넷 연결 또는 CDN 차단 여부를 확인하세요.");
  }
})();

/* 연결이 준비됐는지 확인 — data.js 의 모든 함수가 이걸 먼저 봅니다 */
function SB_ready(){ return !!SB; }
