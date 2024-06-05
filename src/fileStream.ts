import { google } from 'googleapis';
import { getAuthClient, validateFileIdOrUrl } from './utils';
import { DownloadFileParams } from './types';
import { Response } from 'express';

export const streamFileFromGoogleDrive = async ({ fileId, fileUrl, fileName }: DownloadFileParams, res: Response, onProgress?: (progress: number) => void) => {
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
      const driveResponse = await drive.files.list({
         q: `name='${fileName}' and trashed=false`,
         fields: 'files(id)'
      });

      if (driveResponse.data.files && driveResponse.data.files.length > 0) {
         validatedFileId = driveResponse.data.files[0].id;
      } else {
         throw new Error('File not found on Google Drive.');
      }
   }

   if (!validatedFileId) {
      throw new Error('Valid file ID could not be determined.');
   }

   try {
      // Fetch file metadata to get the file name and extension
      const metadataResponse = await drive.files.get({
         fileId: validatedFileId,
         fields: 'name'
      });

      const actualFileName = metadataResponse.data.name || 'download';

      const driveResponse = await drive.files.get({ fileId: validatedFileId, alt: 'media' }, { responseType: 'stream' });

      const totalSize = parseInt(driveResponse.headers['content-length'] || '0', 10);
      let downloadedSize = 0;

      res.setHeader('Content-Disposition', `attachment; filename="${actualFileName}"`);

      driveResponse.data.on('data', (chunk) => {
         downloadedSize += chunk.length;
         if (onProgress) {
            onProgress((downloadedSize / totalSize) * 100);
         }
      });

      driveResponse.data.pipe(res).on('error', (err: Error) => {
         res.status(500).send(`Error downloading file: ${err.message}`);
      });
   } catch (error) {
      throw new Error(`Error during file download: ${(error as Error).message}`);
   }
};
