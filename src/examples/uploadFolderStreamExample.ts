import { folderStreamUpload } from '../folderStreamUpload';
import fs from 'fs';
import path from 'path';

const folderPath = 'C:\\Users\\Aquataze\\Desktop\\discordChannelBot\\catalog\\community\\271445623641';

const readFilesFromDirectory = async (directoryPath: string, excludeExtensions: string[] = []): Promise<{ buffer: Buffer; name: string }[]> => {
   const files: { buffer: Buffer; name: string }[] = [];

   const readDirectory = async (dirPath: string) => {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
         const entryPath = path.join(dirPath, entry.name);
         const fileExtension = path.extname(entryPath).substring(1);

         if (excludeExtensions.includes(fileExtension)) {
            continue;
         }

         if (entry.isDirectory()) {
            await readDirectory(entryPath);
         } else {
            try {
               const fileBuffer = await fs.promises.readFile(entryPath);
               const relativePath = path.relative(directoryPath, entryPath);
               files.push({ buffer: fileBuffer, name: relativePath });
               console.log(`Read file: ${relativePath}`);
            } catch (error) {
               console.error(`Error reading file ${entryPath}:`, error);
            }
         }
      }
   };

   await readDirectory(directoryPath);
   return files;
};

const uploadFolderStreamExample = async () => {
   try {
      const files = await readFilesFromDirectory(folderPath);
      const parentFolderId = 'root'; // Replace with your Google Drive parent folder ID
      const folderName = path.basename(folderPath);

      if (files.length === 0) {
         console.log('No files found in directory.');
         return;
      }

      const result = await folderStreamUpload({
         files,
         folderName,
         parentFolderId,
         excludeExtensions: ['png', 'jpg'] // Example exclusions, adjust as necessary
      });

      console.log('Upload result:', result);
   } catch (error) {
      console.error('Error uploading folder:', error);
   }
};

uploadFolderStreamExample();
