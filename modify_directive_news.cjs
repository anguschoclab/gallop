const fs = require("fs");

let code = fs.readFileSync("src/core/narrative/directiveNewsGenerator.ts", "utf-8");

const additionalDistressHeadlines = `
        \`Storm Clouds Gather Over \${stable.name}\`,
        \`\${stable.name} on the Brink of Insolvency\`,
        \`Red Ink Flows at \${stable.name}\`,
        \`\${stable.name} Scrambles for Cash\`,
        \`Liquidity Crisis Strikes \${stable.name}\`,
        \`The Financial Squeeze is on for \${stable.name}\`,
`;

const additionalShiftHeadlines = `
        \`Strategic Overhaul at \${stable.name}\`,
        \`\${stable.name} Unveils New Operational Blueprint\`,
        \`A Fresh Start: \${stable.name} Transitions to \${newLabel}\`,
        \`\${stable.name} Maps Out a New Future\`,
        \`Changing Tides at \${stable.name}\`,
        \`\${stable.name} Commits to \${newLabel}\`,
`;

const additionalDistressBodies = `
        \`The financial situation at \${stable.name} has reached a boiling point. Moving away from \${oldLabel.toLowerCase()}, they are now firmly \${description}.\`,
        \`Creditors are reportedly circling as \${stable.name} faces severe financial distress. Their \${oldLabel.toLowerCase()} plans have been completely shelved.\`,
        \`It's an open secret in the paddock: \${stable.name} is out of money. The operation is now \${description}, a far cry from their recent \${oldLabel.toLowerCase()} ambitions.\`,
        \`\${stable.name}'s bankroll has officially run dry. The stable is currently \${description}, leaving their previous \${oldLabel.toLowerCase()} strategy in ruins.\`,
        \`A devastating financial squeeze has forced \${stable.name} to dramatically alter course. Instead of \${oldLabel.toLowerCase()}, they are now \${description}.\`,
        \`The ledger is bleeding red for \${stable.name}. Any hopes of continuing their \${oldLabel.toLowerCase()} campaign are dead, as they are now \${description}.\`,
`;

const additionalShiftBodies = `
        \`A major restructuring is underway as \${stable.name} drops its \${oldLabel.toLowerCase()} approach. The stable is now \${description}, signaling a new era for the operation.\`,
        \`The rumor mill was right: \${stable.name} has completely shifted gears. Moving on from \${oldLabel.toLowerCase()}, they are firmly focused on \${description}.\`,
        \`\${stable.name} has ripped up their playbook. Out is \${oldLabel.toLowerCase()}, and in is a new directive: they are now \${description}.\`,
        \`A new chapter begins for \${stable.name}. By stepping away from \${oldLabel.toLowerCase()}, the organization is dedicating its resources to \${description}.\`,
        \`The strategy room at \${stable.name} has produced a new blueprint. They have pivoted from \${oldLabel.toLowerCase()} and are currently \${description}.\`,
        \`Competitors are re-evaluating \${stable.name} following a surprise strategic shift. The stable has abandoned \${oldLabel.toLowerCase()} and is now entirely \${description}.\`,
`;

code = code.replace(
  /\`Budget Shortfalls Threaten \$\{stable\.name\}\`,/,
  `\`Budget Shortfalls Threaten \$\{stable.name\}\`,\n${additionalDistressHeadlines}`,
);

code = code.replace(
  /\`\$\{stable\.name\} Management Announces \$\{newLabel\}\`,/,
  `\`\$\{stable.name\} Management Announces \$\{newLabel\}\`,\n${additionalShiftHeadlines}`,
);

code = code.replace(
  /\`\$\{stable\.name\} is pulling the emergency brake\. Shedding their \$\{oldLabel\.toLowerCase\(\)\} directives, the operation is simply \$\{description\}\.\`,/,
  `\`\$\{stable.name\} is pulling the emergency brake. Shedding their \$\{oldLabel.toLowerCase\(\)\} directives, the operation is simply \$\{description\}.\`,\n${additionalDistressBodies}`,
);

code = code.replace(
  /\`Following internal reviews, \$\{stable\.name\} is taking a new path\. They are \$\{description\}, leaving their previous \$\{oldLabel\.toLowerCase\(\)\} strategy in the rearview mirror\.\`,/,
  `\`Following internal reviews, \$\{stable.name\} is taking a new path. They are \$\{description\}, leaving their previous \$\{oldLabel.toLowerCase\(\)\} strategy in the rearview mirror.\`,\n${additionalShiftBodies}`,
);

fs.writeFileSync("src/core/narrative/directiveNewsGenerator.ts", code, "utf-8");
console.log("done");
