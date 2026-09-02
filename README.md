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
   ├─ js/   site.config.js / layout.js / data.js
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

## Supabase 연동 지점

`assets/js/data.js` 안의 아래 5개 함수 내부만 교체하면 됩니다. (HTML 수정 불필요)

- `DATA_getNotices()` 공지 목록 (검색·페이징)
- `DATA_getNotice()` 공지 상세 + 이전/다음 글
- `DATA_getGallery()` 갤러리 목록 (정렬 latest/oldest/title · 페이징)
- `DATA_getGalleryItem()` 갤러리 상세
- `DATA_submitApplication(form, file, cb)` 상담신청 저장 (file 인자 있음)
- `DATA_saveNotice(row, cb)` / `DATA_deleteNotice(id, cb)` 공지 저장·삭제
- `DATA_saveGallery(row, cb)` / `DATA_deleteGallery(id, cb)` 갤러리 저장·삭제
- `DATA_login(id, pw, cb)` / `DATA_isAdmin()` / `DATA_logout()` 관리자 인증
- `DATA_getApplications(opt, cb)` 상담신청 목록 (상태 필터 · 상태별 건수)
- `DATA_updateApplication(id, patch, cb)` 상태 변경 / 메모 추가 / 메모 삭제
- `DATA_deleteApplication(id, cb)` 상담신청 삭제

`data.js` 안의 **"1. 임시 저장소"** 블록은 Supabase 연동 시 통째로 삭제하면 됩니다.

권장 테이블 구조와 Storage 업로드 예시 코드는 `data.js` 상단·중간 주석에 적어 두었습니다.
`DATA_safeFileName()` 은 한글 파일명을 안전한 저장 경로로 바꿔 주는 도우미입니다.

### 연동 시 주의
- **Storage 버킷은 반드시 Private 으로** 만드세요. 계약서·등기부등본은 개인정보라
  Public 버킷이면 URL 을 아는 누구나 열람할 수 있습니다. 관리자 화면에서는
  `createSignedUrl()` 로 열람합니다.
- 저장 경로는 영문/숫자로만 만들고, 원래 한글 파일명은 `file_name` 컬럼에 따로 보관합니다.
- Storage 업로드 → DB insert 순서이므로, insert 실패 시 고아 파일 정리가 필요합니다.

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

### ⚠ 지금의 로그인은 보안 기능이 아닙니다

정적 사이트(GitHub Pages)에서는 비밀번호가 소스 보기로 그대로 노출됩니다.
개발자도구로 값을 바꾸면 관리자 화면도 열립니다.

**실제 보안은 Supabase Auth + RLS 정책이 담당해야 합니다.**
RLS 에서 "로그인한 관리자만 INSERT/UPDATE/DELETE" 를 걸어두면,
관리자 화면을 억지로 열어도 저장 자체가 서버에서 거부됩니다.
실제 데이터를 넣기 전에 반드시 Supabase 연동을 끝내세요.

### 지금의 저장 방식 — 브라우저 임시 저장

작성한 글은 `localStorage` 에 저장됩니다. 시안 확인용입니다.

- 글을 **쓴 그 브라우저에서만** 보입니다. 다른 PC·시크릿창·방문자에게는 안 보입니다.
- 저장소 용량은 **약 5MB** 입니다. 관리자 화면 하단에 사용량 막대가 있습니다.
- 갤러리 사진은 브라우저에서 자동으로 크기를 줄여 저장합니다.
  (상세용 긴 변 1200px / 썸네일 480px, JPEG) — `admin-write.html` 상단 `IMG_*` 값으로 조정합니다.
- 가득 차면 저장이 실패하고 안내 문구가 뜹니다. Supabase 연동 후에는 사라지는 제약입니다.
- 저장된 내용을 초기화하려면 브라우저 개발자도구 → Application → Local Storage 에서
  `awl_notices_v1`, `awl_gallery_v1`, `awl_applications_v1` 을 삭제하면 샘플 데이터로 되돌아갑니다.

### 상담신청 접수내역 (관리자 전용)

`admin.html` → **상담신청** 탭에서 폼으로 들어온 신청을 확인하고 메모할 수 있습니다.
공개 페이지에는 어디에도 노출되지 않습니다.

- 카드 한 장에 신청자 · 분야 · 연락처 · 이메일 · 희망일 · 첨부 · 상담 내용이 모두 보입니다.
- 연락처는 눌러서 바로 전화, 이메일은 눌러서 바로 메일 작성으로 이어집니다.
- **상태** : 접수 / 상담중 / 보류 / 완료. 상단 필터로 상태별로 걸러 볼 수 있고 건수도 표시됩니다.
- **처리 메모** : 한 건에 여러 개를 시간 순으로 쌓습니다. 입력 후 Enter 로도 추가되고, 개별 삭제됩니다.
- 상태 목록을 바꾸려면 `data.js` 의 `APPLY_STATUS` 배열을 수정하세요.
  뱃지 색은 `admin.css` 의 `.ad-badge[data-s="..."]` 에 있습니다.

> **첨부파일은 이름·용량만 기록됩니다.**
> 10MB zip 을 브라우저 저장소에 넣으면 용량이 즉시 초과되기 때문입니다.
> 실제 내려받기는 Supabase Storage 연동 후 `file_path` 로 열립니다
> (Private 버킷 + `createSignedUrl()`).

### 갤러리 사진 여러 장
- 첫 번째 사진이 목록 대표 이미지가 됩니다. ← → 버튼으로 순서를 바꿀 수 있습니다.
- 목록 썸네일에는 2장 이상일 때 장수 뱃지가 표시됩니다.
- 상세 화면에는 모든 사진이 위에서 아래로 나열됩니다.
- Supabase 연동 시에는 `gallery_images` 1:N 테이블로 옮기면 됩니다 (`data.js` 주석 참고).

## 아직 안 되어 있는 것
- Supabase 연동 (관리자 인증 · 게시판 저장 · 상담신청 접수)
- favicon, 404.html, robots.txt, sitemap.xml, OG 태그
- `assets/img/` 실제 이미지
- 사업자등록번호가 `000-00-00000` 더미값
- about / contact 의 연혁·버스 노선 등은 예시 문구
