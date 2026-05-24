import os
import json
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
POST_DIR = os.path.join(SCRIPT_DIR, '..', '..', 'assets', 'post')
POST_DIR = os.path.normpath(POST_DIR)

def extract_date(filepath):
    try:
        with open(filepath, encoding='utf-8') as f:
            tag_found = False
            for line in f:
                line = line.strip()
                if not line or line.startswith('---'):
                    continue
                if not tag_found and line.startswith('#') and not line.startswith('##'):
                    tag_found = True
                    continue
                if tag_found:
                    return line
    except Exception:
        pass
    return ''

def normalize_date(date_str):
    return re.sub(r'^\d+', lambda m: m.group().zfill(4), date_str)

files = [f for f in os.listdir(POST_DIR) if f.endswith('.md')]
files.sort(key=lambda f: f)
files.sort(key=lambda f: normalize_date(extract_date(os.path.join(POST_DIR, f))), reverse=True)

index_path = os.path.join(POST_DIR, 'index.json')
with open(index_path, 'w', encoding='utf-8') as out:
    json.dump(files, out, ensure_ascii=False)

print('Generated index.json:', files)