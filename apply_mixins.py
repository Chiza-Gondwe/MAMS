import os

base_dir = r"c:\Users\gondw\Downloads\MAMS"

for root, dirs, files in os.walk(base_dir):
    if "venv" in root or "node_modules" in root or ".git" in root or "__pycache__" in root:
        continue
    for f in files:
        if f == "views.py":
            path = os.path.join(root, f)
            try:
                with open(path, "r", encoding="utf-8") as file:
                    content = file.read()
                
                new_content = content
                
                # Replace ModelViewSet with BaseMultiTenantViewSet
                if "class " in new_content and "viewsets.ModelViewSet" in new_content:
                    if "from mams.mixins import BaseMultiTenantViewSet" not in new_content:
                        new_content = "from mams.mixins import BaseMultiTenantViewSet\n" + new_content
                    new_content = new_content.replace("viewsets.ModelViewSet", "BaseMultiTenantViewSet")
                    
                    # Remove get_queryset and perform_create if they just do basic stuff, 
                    # but actually let's just keep them if they do custom logic.
                    # Or let's manually clean up get_queryset later.

                if new_content != content:
                    with open(path, "w", encoding="utf-8") as file:
                        file.write(new_content)
                    print(f"Updated {path}")
            except Exception as e:
                pass
