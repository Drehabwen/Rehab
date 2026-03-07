import os

def count_lines(directory, extensions):
    total_lines = 0
    total_files = 0
    file_types = {}
    
    for root, dirs, files in os.walk(directory):
        # Skip certain directories
        if any(skip in root for skip in ['node_modules', 'dist', '.git', '.trae', 'build', '__pycache__']):
            continue
            
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        lines = len(f.readlines())
                        total_lines += lines
                        total_files += 1
                        
                        ext = os.path.splitext(file)[1]
                        file_types[ext] = file_types.get(ext, 0) + 1
                except:
                    pass
    
    return total_lines, total_files, file_types

# Count frontend
frontend_lines, frontend_files, frontend_types = count_lines('src', ['.ts', '.tsx', '.js', '.jsx'])
print(f"前端代码：{frontend_files} 个文件，{frontend_lines:,} 行")

# Count backend
backend_lines, backend_files, backend_types = count_lines('backend', ['.py'])
print(f"后端代码：{backend_files} 个文件，{backend_lines:,} 行")

# Total
total_lines = frontend_lines + backend_lines
total_files = frontend_files + backend_files
print(f"\n总计：{total_files} 个文件，{total_lines:,} 行代码")
