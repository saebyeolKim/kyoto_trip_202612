# 가족여행 사이트

- `index.html` : GitHub Pages로 올라가는 화면(PIN 입력창만 있음, 일정 내용 없음)
- `worker/` : Cloudflare Worker. PIN이 맞으면 KV의 일정 HTML을 내려줍니다.
- `private/trip.html` : 실제 일정 내용. **저장소에 올라가지 않고**(.gitignore) KV에만 올립니다.

## 배포
```bash
wrangler login
cd worker
wrangler kv namespace create TRIP     # 출력된 id를 wrangler.toml의 id에 붙여넣기
wrangler secret put PIN               # PIN 입력
wrangler kv key put trip --path ../private/trip.html --binding TRIP --remote
wrangler deploy                       # 출력된 workers.dev 주소를 index.html의 API 값에 넣기
```
일정 수정 후에는 `kv key put` 명령만 다시 실행하면 됩니다.
