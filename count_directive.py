import re

with open('src/core/narrative/directiveNewsGenerator.ts', 'r') as f:
    content = f.read()

functions = ['generateDirectiveChangeNews']
for func in functions:
    pattern = rf'export function {func}.*?headline: (.*?)\n'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        print(f'{func} - headline: {match.group(1)}')

    pattern2 = rf'export function {func}.*?body: (.*?)\n'
    match2 = re.search(pattern2, content, re.DOTALL)
    if match2:
        print(f'{func} - body: {match2.group(1)}')
