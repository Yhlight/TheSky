
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:8000")

        # 1. 验证长按锁定加速
        await page.keyboard.down('KeyD')
        await page.wait_for_timeout(3500) # 按下超过3秒

        # 2. 验证在锁定状态下，鼠标点击不会取消加速
        await page.mouse.down()
        await page.mouse.up()
        await page.wait_for_timeout(1000)

        # 3. 释放按键，检查是否仍然在加速（因为已锁定）
        await page.keyboard.up('KeyD')
        await page.wait_for_timeout(2000)

        # 4. 再次按下 'D' 以取消锁定
        await page.keyboard.down('KeyD')
        await page.wait_for_timeout(100)
        await page.keyboard.up('KeyD')

        # 5. 验证基本的飞行控制
        await page.keyboard.down('KeyD') # 上升
        await page.wait_for_timeout(500)
        await page.keyboard.up('KeyD') # 下降
        await page.wait_for_timeout(500)

        await page.screenshot(path="flight_fix_verify.png")
        await browser.close()

asyncio.run(main())
