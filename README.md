# 애드윈법무사사무소 홈페이지 (시안)

## 폴더 구조
```
adwin-law/
├─ index.html            메인
├─ about.html            사무소 소개
├─ biz-realestate.html   업무분야 - 부동산등기
├─ biz-corporate.html    업무분야 - 법인등기
├─ biz-auction.html      업무분야 - 경매·공매
├─ biz-rehab.html        업무분야 - 개인회생·파산
├─ biz-civil.html        업무분야 - 민사·가사 서류
├─ apply.html            온라인 상담신청
├─ gallery.html          갤러리 목록
├─ gallery-view.html     갤러리 상세
├─ notice.html           공지사항 목록
├─ notice-view.html      공지사항 상세
├─ contact.html          오시는 길
├─ admin-login.html      [관리자] 로그인
├─ admin.html            [관리자] 게시물 관리 (공지/갤러리 탭)
├─ admin-write.html      [관리자] 글쓰기 · 수정
└─ assets/
   ├─ css/  base.css / page.css / board.css / admin.css   (4개)
   ├─ js/   supabase.config.js / site.config.js / layout.js / data.js
   └─ img/  이미지
```

## CSS 구성

기존에 페이지마다 따로 있던 CSS 14개를 **3개로 합쳤습니다.**

| 파일 | 적용 대상 | 접두어 |
|---|---|---|
| `base.css` | **전 페이지 공통** — 색상 토큰, 헤더, 푸터, 서브비주얼, 버튼, 퀵버튼 | `awl-` |
| `page.css` | index / about / biz-* / apply / contact | `mn-` `ab-` `biz-` `ap-` `ct-` |
| `board.css` | notice / notice-view / gallery / gallery-view | `bd-` `nt-` `nv-` `gl-` `gv-` |
| `admin.css` | admin-login / admin / admin-write | `ad-` |

각 페이지는 `base.css` + (`page.css` 또는 `board.css`) 2개만 불러옵니다.

**업무분야 5개 페이지는 CSS가 완전히 동일**했기 때문에 접두어를 `biz-` 하나로 통합했습니다.
5개 중 특정 페이지만 다르게 하고 싶을 때는 아래처럼 예외를 추가하세요.

```css
body[data-page="biz-auction"] .biz-lead{ ... }
```

검색창·페이지네이션도 공지/갤러리가 같았기 때문에 `bd-` 로 합쳤습니다.
페이지네이션 클래스는 `data.js` 의 `DATA_pager(..., "bd-")` 인자와 짝을 이룹니다.

### 반응형 기준점
`1080px` / `900px` / `600px` **3개만** 사용합니다. (기존엔 1100·1080·1000·900·820·600·560 이 뒤섞여 있었습니다)
새 기준점을 추가하지 말고 이 3개 안에서 처리하세요.

### 색상·폰트 변경
`assets/css/base.css` 최상단 `:root` 변수만 수정하면 전 페이지에 반영됩니다.

## 푸터·회사 정보 수정
`assets/js/site.config.js` 파일 하나만 고치면 전 페이지 헤더·푸터에 반영됩니다.
메뉴 추가/순서 변경도 같은 파일의 `SITE_MENU` 배열에서 처리합니다.

> 참고 : 본문 안에 직접 적힌 전화번호·주소(about / contact / apply / biz-* / index)는
> 아직 `SITE` 값을 쓰지 않습니다. 번호가 바뀌면 해당 HTML 도 같이 고쳐야 합니다.

## 이미지 넣기
`<div class="awl-slot ..." data-size="...">` 가 이미지 자리입니다.
`assets/img/` 에 파일을 넣고 해당 div 를 `<img src="assets/img/파일명.jpg" alt="설명">` 으로 교체하세요.
서브페이지 상단 배경은 `<div class="awl-sv-bg" style="background-image:url('assets/img/sub-about.jpg')"></div>` 형태로 지정합니다.

## 상담신청 파일 첨부

`apply.html` 의 첨부 기능은 이미 동작합니다. Supabase 연결만 남았습니다.

- **여러 개를 골라도 서버로 올라가는 파일은 항상 1개입니다.**
  2개 이상 선택하면 브라우저에서 zip 1개로 묶어 전송합니다. (JSZip, 필요할 때만 CDN 로드)
  → DB 에 별도의 첨부 테이블(1:N)이 필요 없습니다.
- 1개만 고르면 압축하지 않고 원본 그대로 보냅니다.
- 드래그 앤 드롭 / 파일명·용량 표시 / 개별 삭제 / 중복 선택 방지 지원
- 확장자·용량·개수 검사, 스팸봇 차단(허니팟 + 최소 작성시간)

정책은 `apply.html` 하단 스크립트 상단 6줄로 조정합니다.

```js
var FILE_MAX_MB    = 10;   // 전체 합계 상한
var FILE_MAX_COUNT = 5;    // 선택 가능 개수
var FILE_EXT       = [...] // 허용 확장자
var MIN_FILL_MS    = 3000; // 이 시간 안에 제출되면 봇으로 간주
```

> zip 안의 한글 파일명은 UTF-8 로 저장됩니다.
> 최신 Windows 탐색기, 알집, 반디집에서 정상적으로 보입니다.

## data.js 함수 목록

HTML 은 아래 함수만 호출합니다. Supabase 쿼리는 전부 `data.js` 안에 있습니다.

| 함수 | 설명 |
|---|---|
| `DATA_getNotices(opt, cb)` | 공지 목록 (검색·페이징·글번호 계산) |
| `DATA_getNotice(id, cb)` | 공지 상세 + 이전/다음 글 + 조회수 증가 |
| `DATA_saveNotice(row, cb)` | 공지 저장 (id 있으면 수정) |
| `DATA_deleteNotice(id, cb)` | 공지 삭제 |
| `DATA_getGallery(opt, cb)` | 갤러리 목록 (정렬 latest/oldest/title) |
| `DATA_getGalleryItem(id, cb)` | 갤러리 상세 |
| `DATA_saveGallery(row, cb, onProgress)` | 사진 업로드 + 저장 |
| `DATA_deleteGallery(id, cb)` | 갤러리 삭제 (사진 파일까지) |
| `DATA_submitApplication(form, file, cb)` | 상담 접수 (첨부 업로드 포함) |
| `DATA_getApplications(opt, cb)` | 상담 목록 (상태 필터·건수) |
| `DATA_updateApplication(id, patch, cb)` | 상태 변경 / 메모 추가·삭제 |
| `DATA_deleteApplication(id, cb)` | 상담 삭제 (첨부까지) |
| `DATA_getFileUrl(path, cb)` | 첨부 임시 주소(60초) 발급 |
| `DATA_login / isAdmin / logout / requireAdmin` | 관리자 인증 |

모든 함수는 실패 시 `cb({ ok:false, message:"..." })` 로 사유를 돌려줍니다.

### 저장 순서와 되돌리기
- 상담 접수 : Storage 업로드 → DB insert. **insert 가 실패하면 방금 올린 파일을 지웁니다.**
- 갤러리 저장 : 새로 고른 사진만 업로드하고 기존 사진은 그대로 둡니다.
- 삭제 : Storage 파일을 먼저 지우고 DB 행을 지웁니다. 파일 삭제가 실패해도 글은 지웁니다.

`DATA_safeFileName()` 이 한글 파일명을 영문 저장 경로로 바꿔 줍니다.
원래 파일명은 `file_name` 컬럼에 그대로 보관합니다.

## 관리자 화면

푸터 저작권 문구 옆의 작은 **‘관리자’** 버튼 → `admin-login.html` 로 들어갑니다.

| 페이지 | 기능 |
|---|---|
| `admin-login.html` | 로그인 (임시 계정 : **admin / adwin1234**) |
| `admin.html` | 공지 / 갤러리 / **상담신청** 3개 탭, 저장소 사용량 표시 |
| `admin-write.html?type=notice` | 공지 작성 (제목·작성자·상단고정·내용) |
| `admin-write.html?type=gallery` | 갤러리 작성 (제목·설명·사진 여러 장) |

수정은 `?type=notice&id=3` 처럼 id 를 붙이면 됩니다.
로그인하지 않고 관리자 주소로 접근하면 로그인 화면으로 되돌려 보냅니다.
로그인 상태는 `sessionStorage` 라서 **브라우저를 닫으면 자동 로그아웃**됩니다.

### 로그인

Supabase Auth(이메일 + 비밀번호)로 인증합니다.
계정 추가·비밀번호 변경은 **Supabase 대시보드 → Authentication → Users** 에서 합니다.

로그인 세션은 브라우저에 저장되어 새로고침해도 유지되고, 로그아웃하면 지워집니다.

> **Authentication → Sign In / Providers → Email 의 "Allow new users to sign up" 은 반드시 꺼두세요.**
> 켜져 있으면 누구나 가입해서 `authenticated` 권한을 얻고, 공지·갤러리를 쓰고
> 상담신청을 전부 열람할 수 있게 됩니다.

### 보안은 RLS 가 담당합니다

`admin.html` 은 주소만 알면 누구나 열 수 있습니다. 그래도 안전한 이유는
**실제 권한을 Supabase 의 RLS(Row Level Security) 정책이 막기 때문**입니다.

| 대상 | 읽기 | 쓰기·수정·삭제 |
|---|---|---|
| `notices` / `gallery` | 누구나 | 로그인한 관리자만 |
| `applications` | **관리자만** | 접수(INSERT)는 누구나, 나머지는 관리자만 |
| `gallery` 버킷 | 누구나 (공개) | 관리자만 |
| `applications` 버킷 | 관리자만 (비공개) | 업로드는 누구나 |

로그인하지 않고 관리자 화면을 열면 화면은 뜨더라도 서버가 데이터를 주지 않고,
저장을 시도해도 정책 위반으로 거부됩니다.

`assets/js/supabase.config.js` 의 publishable 키는 **공개돼도 되는 키**입니다.
반대로 `sb_secret_...` 나 `service_role` 키는 RLS 를 무시하므로 **절대 넣지 마세요.**
이 저장소는 Public 이라 넣는 순간 DB 전체가 열립니다.

### 상담 첨부파일

비공개 버킷에 저장되고, 관리자 화면에서 파일명을 누르면 **60초짜리 임시 주소**를
발급받아 새 창으로 엽니다. 주소가 유출돼도 1분 뒤에는 열리지 않습니다.

### 갤러리 사진 여러 장
- 첫 번째 사진이 목록 대표 이미지가 됩니다. ← → 버튼으로 순서를 바꿀 수 있습니다.
- 목록 썸네일에는 2장 이상일 때 장수 뱃지가 표시됩니다.
- 상세 화면에는 모든 사진이 위에서 아래로 나열됩니다.
- 업로드 전에 브라우저에서 크기를 줄입니다 (원본 1600px / 썸네일 600px).
  `admin-write.html` 상단의 `IMG_*` 값으로 조정합니다.
- Storage 의 `gallery` 버킷에 저장되고, 글을 지우면 사진 파일도 함께 지워집니다.

## Supabase 설정 요약

| 항목 | 값 |
|---|---|
| Project URL | `https://siklggdytfzecugjapcb.supabase.co` |
| 배포 주소 | `https://adwinkorea.github.io/adwin-law/` |
| 테이블 | `notices` / `gallery` / `applications` |
| 버킷 | `gallery` (공개) / `applications` (비공개) |
| RPC | `increment_notice_views(nid)` — 조회수 증가 |

프로젝트를 옮기면 `assets/js/supabase.config.js` 의 URL·키 두 줄만 고치면 됩니다.

## 아직 안 되어 있는 것
- favicon, 404.html, robots.txt, sitemap.xml, OG 태그
  (하위 경로 배포라 robots·sitemap 은 어차피 크롤러가 읽지 않습니다)
- 개인정보 수집 동의 여부를 DB 에 남기려면 아래 SQL 을 실행하고
  `data.js` 의 `DATA_submitApplication` 에 `agree: true` 를 추가하세요.
  ```sql
  alter table public.applications add column agree boolean not null default true;
  ```
- `assets/img/` 실제 이미지
- 사업자등록번호가 `000-00-00000` 더미값
- about / contact 의 연혁·버스 노선 등은 예시 문구
