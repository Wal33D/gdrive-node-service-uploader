import { google } from 'googleapis';
import { FileParams, FileExistsResult } from './types';
import { getAuthClient, validateFileIdOrUrl } from './utils';

export const fileExists = async ({ fileId, fileUrl, fileName }: FileParams): Promise<FileExistsResult> => {
   if (!fileId && !fileUrl && !fileName) {
      throw new Error('Either fileId, fileUrl, or fileName must be provided.');
   }

   const auth = await getAuthClient();
   const drive = google.drive({ version: 'v3', auth });

   let validatedFileId: string | undefined;

   if (fileId) {
      validatedFileId = fileId;
   } else if (fileUrl) {
      validatedFileId = validateFileIdOrUrl({ fileUrl });
   }

   try {
      if (validatedFileId) {
         const res = await drive.files.get({
            fileId: validatedFileId,
            fields: 'id, name, modifiedTime, webViewLink'
         });

         if (res.data) {
            return {
               exists: true,
               fileId: res.data.id,
               fileName: res.data.name,
               modifiedTime: res.data.modifiedTime,
               fileUrl: res.data.webViewLink,
               message: 'File exists on Google Drive.'
            };
         } else {
            return { exists: false, message: 'File does not exist on Google Drive.' };
         }
      } else if (fileName) {
         const res = await drive.files.list({
            q: `name='${fileName}' and trashed=false`,
            fields: 'files(id, name, modifiedTime, webViewLink)'
         });

         if (res.data.files && res.data.files.length > 0) {
            const file = res.data.files[0];
            return {
               exists: true,
               fileId: file.id,
               fileName: file.name,
               modifiedTime: file.modifiedTime,
               fileUrl: file.webViewLink,
               message: 'File exists on Google Drive.'
            };
         } else {
            return { exists: false, message: 'File does not exist on Google Drive.' };
         }
      }
   } catch (error) {
      throw new Error(`Error checking file existence: ${(error as Error).message}`);
   }
};
