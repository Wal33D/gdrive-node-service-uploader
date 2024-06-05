import path from 'path';
import { google } from 'googleapis';
import { promises as fs } from 'fs';
import { UploadFileParams } from './types';
import { getAuthClient, getFileDownloadUrl, makeFilePublic } from './utils';

export const uploadFileToGoogleDrive = async ({ filePath, onProgress, description }: UploadFileParams) => {
   if (!filePath) {
      throw new Error('No file path provided for the file to upload.');
   }

   const auth = await getAuthClient();
   const drive = google.drive({ version: 'v3', auth });
   const fileName = path.basename(filePath);

   let status = false;
   let message = '';
   let downloadUrl = '';

   try {
      const res = await drive.files.list({
         q: `name='${fileName}' and trashed=false`,
         fields: 'files(id, name)'
      });

      const uploadFile = async (fileId?: string) => {
         const fileMetadata = {
            name: fileName,
            description: description || 'No description provided.'
         };
         const fileSize = (await fs.stat(filePath)).size;
         const media = {
            mimeType: 'application/zip',
            body: (await fs.open(filePath, 'r')).createReadStream()
         };

         let request;
         if (fileId) {
            request = drive.files.update({ fileId, requestBody: fileMetadata, media });
         } else {
            request = drive.files.create({ requestBody: fileMetadata, media, fields: 'id' });
         }

         const res = await new Promise<any>((resolve, reject) => {
            let uploadedSize = 0;

            media.body.on('data', (chunk: Buffer) => {
               uploadedSize += chunk.length;
               if (onProgress) {
                  onProgress((uploadedSize / fileSize) * 100);
               }
            });

            request.then(resolve).catch(reject);
         });

         if (res.data.id) {
            await makeFilePublic({ drive, fileId: res.data.id });
            downloadUrl = await getFileDownloadUrl({ drive, fileId: res.data.id });
            status = true;
            message = fileId ? 'File updated successfully.' : 'File uploaded successfully.';
         } else {
            message = 'File ID is null or undefined.';
         }
      };

      if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
         await uploadFile(res.data.files[0].id);
      } else {
         await uploadFile();
      }
   } catch (error) {
      message = `Error during file upload: ${(error as Error).message}`;
   }

   return { status, message, downloadUrl };
};
