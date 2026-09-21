import re

with open('src/core/narrative/flavorStories.ts', 'r') as f:
    content = f.read()

categories = ['track', 'jockeys', 'breeding', 'weather', 'community', 'industry']
counts = {}

for category in categories:
    pattern = rf'{category}:\s*\[(.*?)\]'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        objects = match.group(1).count('category: "flavor"')
        counts[category] = objects

print(counts)
