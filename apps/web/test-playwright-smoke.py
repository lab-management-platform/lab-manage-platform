from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def login(page, username: str, password: str) -> None:
    page.goto("http://127.0.0.1:5173", wait_until="networkidle")
    page.get_by_label("账号 / 学号 / 手机号").fill(username)
    page.get_by_label("密码").fill(password)
    page.get_by_role("button", name="登录").click()
    expect(page.get_by_text("实验室运营总览")).to_be_visible()


def main() -> None:
    output_dir = Path("playwright-artifacts")
    output_dir.mkdir(exist_ok=True)

    with sync_playwright() as p:
      browser = p.chromium.launch(headless=True)
      page = browser.new_page(viewport={"width": 1440, "height": 1000})

      login(page, "admin", "Admin@123456")
      expect(page.get_by_role("heading", name="欢迎回来，实验室管理员")).to_be_visible()
      page.get_by_role("button", name="项目管理").click()
      expect(page.get_by_text("项目目录")).to_be_visible()
      page.get_by_role("button", name="账户管理").click()
      expect(page.get_by_text("新增成员")).to_be_visible()
      page.screenshot(path=str(output_dir / "admin-dashboard.png"), full_page=True)

      page.get_by_role("button", name="退出").click()
      login(page, "student001", "Student@123456")
      page.get_by_role("button", name="账户管理").click()
      expect(page.get_by_text("账户概览")).to_be_visible()
      expect(page.get_by_text("新增成员")).to_have_count(0)
      expect(page.get_by_text("成员列表")).to_have_count(0)
      page.get_by_role("button", name="AI 助手").click()
      expect(page.get_by_text("AI 协作台")).to_be_visible()
      page.screenshot(path=str(output_dir / "student-dashboard.png"), full_page=True)

      browser.close()


if __name__ == "__main__":
    main()
