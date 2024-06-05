import { google } from 'googleapis';
import { getAuthClient } from './utils';

const BATCH_SIZE = 10;

const deleteFileOrFolder = async (drive: any, fileId: string, fileName: string) => {
   try {
      await drive.files.delete({
         fileId
      });
   } catch (error) {
      console.error(`Error deleting file/folder: ${fileName} (ID: ${fileId}). Error: ${error.message}`);
   }
};

const deleteFilesInBatch = async (drive: any, files: any[]) => {
   const promises = files.map((file) => deleteFileOrFolder(drive, file.id, file.name));
   await Promise.all(promises);
};

const deleteAllFilesAndFolders = async (drive: any, folderId: string) => {
   let pageToken: string | null = null;
   do {
      const res = await drive.files.list({
         q: `'${folderId}' in parents and trashed=false`,
         fields: 'nextPageToken, files(id, name, mimeType)',
         pageToken: pageToken || undefined
      });

      const files = res.data.files || [];
      const folders = files.filter((file: { mimeType: string }) => file.mimeType === 'application/vnd.google-apps.folder');
      const otherFiles = files.filter((file: { mimeType: string }) => file.mimeType !== 'application/vnd.google-apps.folder');

      // Delete files in batches asynchronously
      for (let i = 0; i < otherFiles.length; i += BATCH_SIZE) {
         const batch = otherFiles.slice(i, i + BATCH_SIZE);
         await deleteFilesInBatch(drive, batch);
      }

      // Recursively delete subfolders
      for (const folder of folders) {
         await deleteAllFilesAndFolders(drive, folder.id);
         await deleteFileOrFolder(drive, folder.id, folder.name);
      }

      pageToken = res.data.nextPageToken || null;
   } while (pageToken);
};

export const deleteAllFilesFromDrive = async () => {
   const auth = await getAuthClient();
   const drive = google.drive({ version: 'v3', auth });

   try {
      // Get the root folder ID of the service account's Google Drive
      const res = await drive.files.get({
         fileId: 'root',
         fields: 'id, name'
      });

      const rootFolderId = res.data.id;

      // Recursively delete all files and folders starting from the root folder
      await deleteAllFilesAndFolders(drive, rootFolderId);
   } catch (error) {
      console.error(`Error deleting files from root folder: ${error.message}`);
   }
};
