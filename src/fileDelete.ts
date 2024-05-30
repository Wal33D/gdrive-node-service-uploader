import { google } from 'googleapis';
import { FileParams } from './types';
import { getAuthClient, validateFileIdOrUrl } from './utils';

export const deleteFileFromGoogleDrive = async ({ fileId, fileUrl, fileName }: FileParams) => {
   const auth = await getAuthClient();
   const drive = google.drive({ version: 'v3', auth });

   let validatedFileId: string | undefined;

   if (fileId) {
      validatedFileId = fileId;
   } else if (fileUrl) {
      validatedFileId = validateFileIdOrUrl({ fileUrl });
   } else if (fileName) {
      try {
         const res = await drive.files.list({
            q: `name='${fileName}' and trashed=false`,
            fields: 'files(id)'
         });

         if (res.data.files && res.data.files.length > 0) {
            validatedFileId = res.data.files[0].id;
         } else {
            return { status: false, message: 'File does not exist on Google Drive.' };
         }
      } catch (error) {
         return { status: false, message: `Error finding file by name: ${(error as Error).message}` };
      }
   }

   if (!validatedFileId) {
      return { status: false, message: 'File ID could not be determined.' };
   }

   let status = false;
   let message = '';

   try {
      await drive.files.delete({ fileId: validatedFileId });
      status = true;
      message = 'File deleted successfully.';
   } catch (error) {
      message = `Error during file deletion: ${(error as Error).message}`;
   }

   return { status, message };
};
