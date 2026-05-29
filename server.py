# 22408 例题集 - MySQL 后端 API
# 启动: python server.py
# 前端自动检测 localhost:5000，可用则使用 MySQL，否则回退浏览器存储

from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import json

app = Flask(__name__)
CORS(app)

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1475369',
    'database': 'exam22408',
    'charset': 'utf8mb4'
}

def get_db():
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

def init_db():
    """创建数据库和表"""
    conn = pymysql.connect(
        host='localhost', user='root', password='1475369',
        charset='utf8mb4'
    )
    with conn.cursor() as cur:
        cur.execute("CREATE DATABASE IF NOT EXISTS exam22408 CHARACTER SET utf8mb4")
        cur.execute("USE exam22408")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                storage_key VARCHAR(100) NOT NULL,
                item_id VARCHAR(50) NOT NULL,
                data JSON NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_storage_item (storage_key, item_id)
            ) ENGINE=InnoDB
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS images (
                id INT AUTO_INCREMENT PRIMARY KEY,
                img_key VARCHAR(200) NOT NULL UNIQUE,
                data_url MEDIUMTEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        """)
    conn.commit()
    conn.close()
    print("✅ 数据库 exam22408 初始化完成")

# ============================================================
#  API 路由
# ============================================================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'db': 'mysql'})

@app.route('/api/items/<storage_key>', methods=['GET'])
def get_items(storage_key):
    """获取某个项目的所有条目"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT item_id, data, updated_at FROM items WHERE storage_key = %s",
                (storage_key,)
            )
            rows = cur.fetchall()
            items = []
            for row in rows:
                item = json.loads(row['data']) if isinstance(row['data'], str) else row['data']
                item['id'] = row['item_id']
                items.append(item)
            return jsonify(items)
    finally:
        conn.close()

@app.route('/api/items/<storage_key>', methods=['POST'])
def save_items(storage_key):
    """保存某个项目的所有条目（全量替换）"""
    items = request.get_json()
    if not isinstance(items, list):
        return jsonify({'error': '需要数组'}), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            # 先删除旧数据
            cur.execute("DELETE FROM items WHERE storage_key = %s", (storage_key,))
            # 批量插入
            for item in items:
                item_id = item.get('id', '')
                data_json = json.dumps(item, ensure_ascii=False)
                cur.execute(
                    "INSERT INTO items (storage_key, item_id, data) VALUES (%s, %s, %s)",
                    (storage_key, item_id, data_json)
                )
        conn.commit()
        return jsonify({'ok': True, 'count': len(items)})
    finally:
        conn.close()

@app.route('/api/images/<img_key>', methods=['GET'])
def get_image(img_key):
    """获取图片 data URL"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT data_url FROM images WHERE img_key = %s", (img_key,))
            row = cur.fetchone()
            if row:
                return jsonify({'data_url': row['data_url']})
            return jsonify({'data_url': None}), 404
    finally:
        conn.close()

@app.route('/api/images/<img_key>', methods=['PUT'])
def save_image(img_key):
    """保存图片 data URL"""
    data = request.get_json()
    data_url = data.get('data_url', '')
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "REPLACE INTO images (img_key, data_url) VALUES (%s, %s)",
                (img_key, data_url)
            )
        conn.commit()
        return jsonify({'ok': True})
    finally:
        conn.close()

@app.route('/api/images/<img_key>', methods=['DELETE'])
def delete_image(img_key):
    """删除图片"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM images WHERE img_key = %s", (img_key,))
        conn.commit()
        return jsonify({'ok': True})
    finally:
        conn.close()

if __name__ == '__main__':
    init_db()
    print("🚀 22408 后端服务启动: http://localhost:5000")
    app.run(host='127.0.0.1', port=5000, debug=False)
