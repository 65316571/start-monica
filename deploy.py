# -*- coding: utf-8 -*-
import os
import shutil
import subprocess
import sys

PROJECT_DIR = r"C:\Data\Project\Local\start-monica"
OUTPUT_DIR  = r"C:\Data\Project\Local\start-monica\deploy"

print("========================================")
print("    start-monica 一键打包脚本")
print("========================================\n")

# 第1步：进入项目目录
print("[1/4] 进入项目目录...")
if not os.path.exists(PROJECT_DIR):
    print(f"错误：找不到目录 {PROJECT_DIR}")
    input("按回车退出")
    sys.exit(1)
os.chdir(PROJECT_DIR)
print("成功\n")

# 第2步：打包
print("[2/4] 开始打包，请等待...\n")
result = subprocess.run("npm run build", shell=True)
if result.returncode != 0:
    print("\n打包失败，请把上面的错误信息截图发给我")
    input("按回车退出")
    sys.exit(1)
print("\n打包成功\n")

# 第3步：复制文件
print("[3/4] 复制文件到 deploy 文件夹...")
if os.path.exists(OUTPUT_DIR):
    print("清理旧的 deploy 文件夹...")
    shutil.rmtree(OUTPUT_DIR)

os.makedirs(OUTPUT_DIR)

shutil.copytree(os.path.join(PROJECT_DIR, "dist"),       os.path.join(OUTPUT_DIR, "dist"))
shutil.copytree(os.path.join(PROJECT_DIR, "web", "dist"), os.path.join(OUTPUT_DIR, "web", "dist"))
shutil.copy(os.path.join(PROJECT_DIR, "package.json"),   os.path.join(OUTPUT_DIR, "package.json"))
print("dist\\、web\\dist\\、package.json 已复制")

env_file = os.path.join(PROJECT_DIR, ".env")
if os.path.exists(env_file):
    shutil.copy(env_file, os.path.join(OUTPUT_DIR, ".env"))
    print(".env 已复制")
else:
    print("警告：未找到 .env 文件，请手动添加")

# 第4步：完成
print("\n[4/4] 完成！")
print("========================================")
print(f"  部署文件位置：{OUTPUT_DIR}")
print("========================================")
print("\n把 deploy 文件夹内容上传到服务器即可\n")
input("按回车退出")
