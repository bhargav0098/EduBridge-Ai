import os

def replace_localhost():
    target_dir = r"c:\Users\bharg\Downloads\deploy\Edubridge-AI-main\app\api"
    count = 0
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if 'http://localhost:8000' in content:
                    new_content = content.replace('http://localhost:8000', 'http://127.0.0.1:8000')
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated: {filepath}")
                    count += 1
    print(f"Total updated: {count}")

if __name__ == "__main__":
    replace_localhost()
