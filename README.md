# 교토 가족여행 (2026.12.11–12.13)

아빠 · 남편 · 새별의 교토 2박 3일 여행 페이지. GitHub Pages로 호스팅되며 **PIN으로 잠겨 있습니다.**

- `index.html` : 잠금 화면 + 암호화된 일정 (AES-GCM, PIN에서 PBKDF2로 키 생성). 저장소에는 암호문만 올라갑니다.
- `lock.html` : 잠금 화면 템플릿
- `build.mjs` : 원본을 암호화해 `index.html`을 만드는 스크립트
- `private/trip.html` : 실제 일정 원본. **저장소에 올라가지 않습니다**(.gitignore).

## 일정 수정 후 다시 만들기
```bash
node build.mjs <PIN>
git add index.html && git commit -m "일정 업데이트" && git push
```
- 숙소 주소: `private/trip.html` 하단 `STAY` 객체의 `address`만 바꾸면 지도·길찾기에 자동 반영됩니다.
