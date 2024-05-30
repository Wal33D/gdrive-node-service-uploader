import { google } from 'googleapis';
import { promises as fs } from 'fs';
import { DownloadFileParams } from './types';
import { validateFileIdOrUrl, getAuthClient } from './utils';

export const downloadFileFromGoogleDrive = async ({ fileId, downloadPath, url, onProgress }: DownloadFileParams) => {
   const validatedFileId = validateFileIdOrUrl({ fileId, url });

   downloadPath = downloadPath || process.env.DEFAULT_DOWNLOAD_PATH;
   if (!downloadPath) {
      throw new Error('Download path must be provided or set in DEFAULT_DOWNLOAD_PATH environment variable');
   }

   const auth = await getAuthClient();
   const drive = google.drive({ version: 'v3', auth });

   let status = false;
   let message = '';

   try {
      const dest = await fs.open(downloadPath, 'w');
      const res = await drive.files.get({ fileId: validatedFileId, alt: 'media' }, { responseType: 'stream' });

      const totalSize = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedSize = 0;

      res.data.on('data', (chunk) => {
         downloadedSize += chunk.length;
         if (onProgress) {
            onProgress((downloadedSize / totalSize) * 100);
         }
      });

      await new Promise<void>((resolve, reject) => {
         res.data
            .on('end', async () => {
               status = true;
               message = 'File downloaded successfully.';
               await dest.close();
               resolve();
            })
            .on('error', async (err: Error) => {
               message = `Error downloading file: ${err.message}`;
               await dest.close();
               reject(err);
            })
            .pipe(dest.createWriteStream());
      });
   } catch (error) {
      message = `Error during file download: ${(error as Error).message}`;
   }

   return { status, message, downloadPath };
};
