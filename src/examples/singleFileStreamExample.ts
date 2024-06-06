import fs from 'fs';
import path from 'path';
import { fileStreamUpload } from '../fileStreamUpload';

// Example usage
const exampleUsage = async () => {
   const filePath = 'C:\\Users\\Aquataze\\Desktop\\discordChannelBot\\catalog\\community\\1193300291862\\catalog.json';
   const parentFolderId = 'root'; // Replace with your Google Drive parent folder ID
   const fileName = path.basename(filePath);

   try {
      const buffer = await fs.promises.readFile(filePath);
      const result = await fileStreamUpload({ buffer, fileName, parentFolderId });
      console.log('Upload result:', result);
   } catch (error) {
      console.error('Error reading file or uploading:', error);
   }
};

exampleUsage();
