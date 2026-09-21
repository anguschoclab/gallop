import re

with open('src/core/narrative/directiveNewsGenerator.ts', 'r') as f:
    content = f.read()
print(content.count('headline:'))
print(content.count('body:'))
