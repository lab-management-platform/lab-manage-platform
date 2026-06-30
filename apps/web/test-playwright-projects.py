from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def login(page, username: str, password: str) -> None:
    page.goto("http://127.0.0.1:5173", wait_until="networkidle")
    page.get_by_label("账号 / 学号 / 手机号").fill(username)
    page.get_by_label("密码").fill(password)
    page.get_by_role("button", name="登录").click()
    expect(page.get_by_text("实验室运营总览")).to_be_visible()


def open_projects(page) -> None:
    page.get_by_role("button", name="项目管理").click()
    expect(page.get_by_text("项目树进度卡")).to_be_visible()


def main() -> None:
    output_dir = Path("playwright-artifacts")
    output_dir.mkdir(exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1600, "height": 1100})

        login(page, "student001", "Student@123456")
        open_projects(page)
        expect(page.get_by_text("按姓名与学号/工号添加成员")).to_have_count(0)
        page.get_by_role("button", name="查看层状树").click()
        page.wait_for_timeout(700)
        expect(page.get_by_text("背面：层状树预览")).to_be_visible()
        expect(page.locator(".tree-node-meta span").first).to_be_visible()
        page.screenshot(path=str(output_dir / "projects-student-tree-flip.png"), full_page=True)

        page.get_by_role("button", name="退出").click()
        login(page, "professor", "Professor@123456")
        open_projects(page)
        expect(page.get_by_placeholder("输入成员姓名")).to_be_visible()
        expect(page.get_by_placeholder("输入学号或工号")).to_be_visible()
        expect(page.get_by_text("按姓名与学号/工号添加成员")).to_be_visible()
        page.get_by_role("button", name="进入树工作台").first.click()
        expect(page.get_by_text("项目树工作台")).to_be_visible()
        expect(page.get_by_role("button", name="生成快照")).to_be_visible()
        expect(page.get_by_text("快照历史")).to_be_visible()
        page.screenshot(path=str(output_dir / "projects-professor-member-form.png"), full_page=True)

        page.get_by_role("button", name="退出").click()
        login(page, "admin", "Admin@123456")
        page.get_by_role("button", name="项目管理").click()
        expect(page.get_by_text("支持按姓名、学号或账号检索")).to_be_visible()
        page.get_by_role("button", name="文件资料").click()
        expect(page.get_by_text("提交新版本")).to_be_visible()
        expect(page.locator(".file-checklist-card").first).to_be_visible()
        expect(page.get_by_text("点击选择文件或直接拖拽到这里")).to_be_visible()
        page.screenshot(path=str(output_dir / "files-admin-version-form.png"), full_page=True)

        browser.close()


if __name__ == "__main__":
    main()
