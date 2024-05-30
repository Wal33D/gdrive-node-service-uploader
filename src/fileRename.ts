import { google } from 'googleapis';
import { FileParams, RenameFileResult } from './types';
import { getAuthClient, validateFileIdOrUrl } from './utils';

export const renameFileInGoogleDrive = async ({ fileId, fileUrl, fileName, newName }: FileParams): Promise<RenameFileResult> => {
   if (!fileId && !fileUrl && !fileName) {
      throw new Error('File ID, file URL, or file name must be provided.');
   }

   const auth = await getAuthClient();
   const drive = google.drive({ version: 'v3', auth });

   let validatedFileId: string | undefined;

   if (fileId) {
      validatedFileId = fileId;
   } else if (fileUrl) {
      validatedFileId = validateFileIdOrUrl({ fileUrl });
   } else if (fileName) {
      const res = await drive.files.list({
         q: `name='${fileName}' and trashed=false`,
         fields: 'files(id)'
      });

      if (res.data.files && res.data.files.length > 0) {
         validatedFileId = res.data.files[0].id;
      } else {
         return { status: false, message: 'File not found on Google Drive.' };
      }
   }

   if (!validatedFileId) {
      return { status: false, message: 'Valid file ID could not be determined.' };
   }

   try {
      const updateRes = await drive.files.update({
         fileId: validatedFileId,
         requestBody: {
            name: newName
         },
         fields: 'id, name, modifiedTime, webViewLink'
      });

      return {
         status: true,
         message: 'File renamed successfully.',
         id: updateRes.data.id,
         name: updateRes.data.name,
         modifiedTime: updateRes.data.modifiedTime,
         downloadUrl: updateRes.data.webViewLink
      };
   } catch (error) {
      return { status: false, message: `Error renaming file: ${(error as Error).message}` };
   }
};
