import re

with open('src/core/narrative/careerArcGenerator.ts', 'r') as f:
    content = f.read()

functions = ['generateRisingStarNews', 'generateContenderNews', 'generateChampionNews', 'generateBustNews']
for func in functions:
    pattern = rf'function {func}.*?headlines = \[(.*?)\]'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        headlines = match.group(1).count(',')
        print(f'{func} - headlines: {headlines}')

    pattern2 = rf'function {func}.*?bodies = \[(.*?)\]'
    match2 = re.search(pattern2, content, re.DOTALL)
    if match2:
        bodies = match2.group(1).count(',')
        print(f'{func} - bodies: {bodies}')
