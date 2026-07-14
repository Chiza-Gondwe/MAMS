import os

base_dir = r"c:\Users\gondw\Downloads\MAMS"

replacements = {
    "church_profile.Organization": "church_profile.Organization",
    "Organization.objects": "Organization.objects",
    "Organization": "Organization",
    "organization = models.ForeignKey": "organization = models.ForeignKey",
    "organization=self.request.user.member_profile.organization": "organization=self.request.user.member_profile.organization",
    "organization=user.member_profile.organization": "organization=user.member_profile.organization",
    "organization=event.organization": "organization=event.organization",
    "member_profile__organization": "member_profile__organization",
    "organization=": "organization=",
    "organization.": "organization.",
    "organization_id": "organization_id",
    ".organization": ".organization",
}

for root, dirs, files in os.walk(base_dir):
    if "venv" in root or "node_modules" in root or ".git" in root or "__pycache__" in root:
        continue
    for f in files:
        if f.endswith(".py") or f.endswith(".jsx"):
            path = os.path.join(root, f)
            try:
                with open(path, "r", encoding="utf-8") as file:
                    content = file.read()
                
                new_content = content
                for old, new in replacements.items():
                    new_content = new_content.replace(old, new)
                
                if new_content != content:
                    with open(path, "w", encoding="utf-8") as file:
                        file.write(new_content)
                    print(f"Updated {path}")
            except Exception as e:
                pass
