import asyncio
import httpx

async def test():
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(
            'http://localhost:8000/analyze',
            json={'analysis_type': 'summary'}
        )
        print('Status:', r.status_code)
        print('Response:', r.text[:1000])

asyncio.run(test())
