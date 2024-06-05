const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const bumpVersion = (version) => {
   const parts = version.split('.').map(Number);
   parts[2] += 1;
   if (parts[2] >= 10) {
      parts[2] = 0;
      parts[1] += 1;
      if (parts[1] >= 10) {
         parts[1] = 0;
         parts[0] += 1;
      }
   }
   return parts.join('.');
};

const packageJsonPath = path.join(__dirname, 'package.json');

fs.readFile(packageJsonPath, 'utf8', (err, data) => {
   if (err) {
      console.error('Error reading package.json:', err);
      process.exit(1);
   }

   const packageJson = JSON.parse(data);
   const oldVersion = packageJson.version;
   packageJson.version = bumpVersion(oldVersion);

   fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8', (err) => {
      if (err) {
         console.error('Error writing package.json:', err);
         process.exit(1);
      }

      console.log(`Version bumped from ${oldVersion} to ${packageJson.version}`);

      exec('npm publish', (error, stdout, stderr) => {
         if (error) {
            console.error(`Error during npm publish: ${error.message}`);
            return;
         }
         if (stderr) {
            console.error(`npm publish stderr: ${stderr}`);
            return;
         }
         console.log(`npm publish stdout: ${stdout}`);
      });
   });
});
