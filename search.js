const fs = require('fs');
const path = require('path');
const patterns = ['Student@123', 'Driver@123', 'Admin@123', 'busadmin@gmail.com', 'student1@college.edu'];
const ignoreDirs = ['node_modules', '.git', 'dist', '.next', '.expo'];

function searchFiles(dir) {
    if (ignoreDirs.includes(path.basename(dir))) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            searchFiles(fullPath);
        } else if (stat.isFile() && ['.ts', '.tsx', '.js', '.jsx', '.json'].includes(path.extname(fullPath))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const pattern of patterns) {
                if (content.includes(pattern)) {
                    console.log('Found in ' + fullPath + ' -> ' + pattern);
                }
            }
        }
    }
}
searchFiles(process.cwd());
