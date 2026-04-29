const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.resolve(__dirname, 'contracts', 'RentalContract.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'RentalContract.sol': {
            content: source,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode'],
            },
        },
        optimizer: {
            enabled: true,
            runs: 200
        }
    },
};

console.log('Compiling...');

// Helper to handle absolute imports (Remix style urls)
function findImports(importPath) {
    if (importPath.startsWith('https://')) {
        // Since we are in a local environment, we should probably use the node_modules version
        // or just let it fail if not found. For now, try to map known ones.
        if (importPath.includes('@openzeppelin/contracts')) {
            const relative = importPath.split('@openzeppelin/contracts@')[1].split('/').slice(1).join('/');
            const localPath = path.resolve(__dirname, 'node_modules', '@openzeppelin', 'contracts', relative);
            if (fs.existsSync(localPath)) {
                return { contents: fs.readFileSync(localPath, 'utf8') };
            }
        }
    }
    return { error: 'File not found' };
}

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    output.errors.forEach((err) => {
        console.error(err.formattedMessage);
    });
    if (output.errors.some(e => e.severity === 'error')) {
        process.exit(1);
    }
}

const contract = output.contracts['RentalContract.sol']['RentalContract'];
const abi = JSON.stringify(contract.abi, null, 2);
const bytecode = contract.evm.bytecode.object;

fs.writeFileSync('build-abi.json', abi);
fs.writeFileSync('build-bytecode.txt', bytecode);

console.log('✅ Compilation successful!');
console.log('ABI saved to build-abi.json');
console.log('Bytecode saved to build-bytecode.txt');
