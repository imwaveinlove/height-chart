# 캐릭터 키 비교 @whitecotchi

캐릭터를 실제 키 좌표 위에 배치해 비교하는 눈금자 차트.

## 편집은 `src/`, 결과물은 `index.html`

`index.html`은 **빌드 산출물입니다. 직접 고치지 마세요** — 다음 빌드에 덮어씌워집니다.

```bash
node build.js           # src/ → index.html
node build.js --check   # index.html이 최신인지만 확인 (CI용, 안 맞으면 실패)
```

의존성 없음. Node 12 이상이면 됩니다.

### 왜 한 파일로 합치나

페이지가 단일 자립 파일이어야 하는 이유가 두 가지 있습니다.

- **아티팩트 배포**는 HTML 파일 하나만 업로드합니다. 외부 CSS·JS는 로드되지 않습니다.
- **「HTML로 저장」**은 살아 있는 DOM을 복제해 단독 파일을 만듭니다. 스타일과 스크립트가 밖에 있으면 빈 껍데기가 나옵니다.

그래서 소스는 쪼개서 관리하고, 빌드가 다시 하나로 꿰맵니다.

## 구조

```
src/
  shell.html          <head> + 자리표시자 4개 (#icons #styles #body #scripts)
  body.html           마크업
  styles/
    themes.css        다섯 테마의 색 토큰
    shell.css         페이지 뼈대, 헤더, 타이포그래피
    toolbar.css
    field.css         차트 바닥과 모눈
    token.css         캐릭터 원, 라벨, cm 칩
    ruler.css
    panel.css         편집 서랍과 이미지 프레이머
  js/
    state.js          상수, 저장/복원, normalize
    color.js          테마별 키 색 램프
    layout.js         축 범위, 레인 배치, 좌표 계산
    render.js         DOM: 토큰, 리더선, 눈금자, 통계
    editor.js         편집 패널, 이미지 삽입과 프레이밍
    export-png.js     차트를 캔버스에 다시 그리기
    export-file.js    단독 HTML 생성과 파일 저장
    main.js           이벤트 연결과 부팅
build.js
icon-*.png            파비콘 원본. 빌드가 data URI로 인라인합니다
index.html            ← 생성물 (커밋함: 받아서 바로 열 수 있도록)
```

### 주의할 점

- **`js/`는 하나의 클로저로 이어 붙습니다.** ES 모듈이 아니라 단순 연결이라 `build.js`의 `SCRIPTS` 배열 순서가 곧 실행 순서입니다. `state.js`가 처음, `main.js`가 마지막이어야 합니다.
- 스크립트 소스에 `</script>` 문자열이 들어가면 태그가 일찍 닫힙니다. 빌드가 검사해서 막습니다.
- 파비콘을 바꾸려면 `icon-*.png`만 교체하면 됩니다. 빌드가 다시 인라인합니다.
- 줄바꿈은 LF입니다 (`.gitattributes`).

## 저장되는 데이터

캐릭터·테마·배율은 브라우저 `localStorage`에 들어갑니다. 「HTML로 저장」으로 뽑은 파일은 데이터를 자기 안에 굽고 **자기만의 저장 키**를 써서, 원본 페이지와 데이터가 섞이지 않습니다.

이미지는 긴 변 480px로 줄여 저장하며, 투명 배경이 있으면 PNG, 없으면 JPEG로 굽습니다. 프레이밍(`iz`/`ix`/`iy`)은 원 지름에 대한 비율이라 아바타 크기를 바꿔도 그대로 맞습니다.
