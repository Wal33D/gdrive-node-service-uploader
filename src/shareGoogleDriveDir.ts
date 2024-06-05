import { google } from 'googleapis';
import { getAuthClient } from './utils';

const shareFileOrFolder = async (drive: any, fileId: string, email: string) => {
   try {
      await drive.permissions.create({
         fileId,
         requestBody: {
            role: 'reader',
            type: 'user',
            emailAddress: email
         }
      });
   } catch (error) {
      console.error(`Error sharing file/folder ID: ${fileId}. Error: ${error.message}`);
   }
};

const shareAllFilesAndFolders = async (drive: any, folderId: string, email: string) => {
   // Share the current folder
   await shareFileOrFolder(drive, folderId, email);

   // List all files and folders within the current folder
   let pageToken: string | null = null;
   do {
      const res = await drive.files.list({
         q: `'${folderId}' in parents and trashed=false`,
         fields: 'nextPageToken, files(id, name, mimeType)',
         pageToken: pageToken || undefined
      });

      const files = res.data.files || [];
      for (const file of files) {
         if (file.mimeType === 'application/vnd.google-apps.folder') {
            // Recursively share the subfolder
            await shareAllFilesAndFolders(drive, file.id, email);
         } else {
            // Share the file
            await shareFileOrFolder(drive, file.id, email);
         }
      }

      pageToken = res.data.nextPageToken || null;
   } while (pageToken);
};

export const shareGoogleDriveDir = async (email: string) => {
   const auth = await getAuthClient();
   const drive = google.drive({ version: 'v3', auth });

   try {
      // Get the root folder ID of the service account's Google Drive
      const res = await drive.files.get({
         fileId: 'root',
         fields: 'id, name'
      });

      const rootFolderId = res.data.id;

      // Log root folder information

      // Recursively share all files and folders starting from the root folder
      await shareAllFilesAndFolders(drive, rootFolderId, email);
   } catch (error) {
      console.error(`Error sharing root folder: ${error.message}`);
   }
};
