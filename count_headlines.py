import re

with open('src/core/narrative/rivalryNewsGenerator.ts', 'r') as f:
    content = f.read()

functions = ['generateRivalryEmergenceNews', 'generateRegionLostNews', 'generateRivalryEscalationNews', 'generateStableIntroNews']
for func in functions:
    pattern = rf'export function {func}.*?headlines = \[(.*?)\]'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        headlines = match.group(1).count(',')
        print(f'{func} - headlines: {headlines}')

    pattern2 = rf'export function {func}.*?bodies = \[(.*?)\]'
    match2 = re.search(pattern2, content, re.DOTALL)
    if match2:
        bodies = match2.group(1).count(',')
        print(f'{func} - bodies: {bodies}')
