from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"file://{os.path.abspath('index.html')}")
        page.wait_for_selector('#planetCanvas', state='attached')

        # Start waiting for the download before clicking the button
        with page.expect_download() as download_info:
            page.click('#download-heightmap')

        download = download_info.value
        download.save_as('jules-scratch/verification/heightmap.r16')

        # Take a screenshot to show the button exists
        page.screenshot(path="jules-scratch/verification/verification.png")

        browser.close()

if __name__ == "__main__":
    run()