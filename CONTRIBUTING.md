## Contributing

### Local dev
1. `npm install`
2. `cp .env.example .env`
3. `npx prisma migrate dev`
4. `npm run dev`

### Providers
Implement real provider calls in:
- `src/lib/providers/market.ts`

Keep ToS compliance in mind (official APIs > scraping).
