import { google } from 'googleapis';
import { DeleteFileParams } from './types';
import { getAuthClient, validateFileIdOrUrl } from './utils';

export const deleteFileFromGoogleDrive = async ({ fileId, url }: DeleteFileParams) => {
   const validatedFileId = validateFileIdOrUrl({ fileId, url });

   const auth = await getAuthClient();
   const drive = google.drive({ version: 'v3', auth });

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
