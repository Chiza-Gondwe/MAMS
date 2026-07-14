import os
import shutil

base_dir = r"c:\Users\gondw\Downloads\MAMS"

# Remove db.sqlite3
db_path = os.path.join(base_dir, "db.sqlite3")
if os.path.exists(db_path):
    os.remove(db_path)
    print("Deleted db.sqlite3")

# Remove all migrations folders contents except __init__.py
for root, dirs, files in os.walk(base_dir):
    if "migrations" in dirs:
        mig_dir = os.path.join(root, "migrations")
        for f in os.listdir(mig_dir):
            if f.endswith(".py") and f != "__init__.py":
                os.remove(os.path.join(mig_dir, f))
                print(f"Deleted migration: {os.path.join(mig_dir, f)}")
        
        # also clear pycache
        pycache = os.path.join(mig_dir, "__pycache__")
        if os.path.exists(pycache):
            shutil.rmtree(pycache)
            print(f"Deleted pycache: {pycache}")
