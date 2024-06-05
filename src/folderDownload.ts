import path from 'path';
import { google } from 'googleapis';
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import { convertTodirectDownloadUrl, formatDate, getAuthClient, getFileDownloadUrl, getFileStats } from './utils';
import { DownloadFolderParams, FileStat, FolderResult } from './types';

const findFilesInFolder = async (drive: any, folderId: string): Promise<any[]> => {
   const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size, parents)'
   });
   return res.data.files || [];
};

const fileExistsAndMatches = async (filePath: string, expectedSize: number): Promise<boolean> => {
   try {
      const stats = await fsPromises.stat(filePath);
      return stats.size === expectedSize;
   } catch (err) {
      return false;
   }
};

const downloadFile = async (drive: any, fileId: string, destinationPath: string, expectedSize: number): Promise<void> => {
   if (await fileExistsAndMatches(destinationPath, expectedSize)) {
      return;
   }

   const dest = fs.createWriteStream(destinationPath);
   const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
   await new Promise((resolve, reject) => {
      res.data
         .on('end', () => {
            resolve(true);
         })
         .on('error', (err: Error) => {
            console.error('Error downloading file.', err);
            reject(err);
         })
         .pipe(dest);
   });
};

const downloadFolder = async (drive: any, folderId: string, destinationPath: string): Promise<FileStat[]> => {
   const folderMetadata = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, createdTime, modifiedTime'
   });

   const folderName = folderMetadata.data.name;
   const localFolderPath = path.join(destinationPath, folderName);

   await fsPromises.mkdir(localFolderPath, { recursive: true });

   const files = await findFilesInFolder(drive, folderId);
   const fileStats: FileStat[] = [];

   for (const file of files) {
      const filePath = path.join(localFolderPath, file.name);
      if (file.mimeType === 'application/vnd.google-apps.folder') {
         const subFolderStats = await downloadFolder(drive, file.id, localFolderPath);
         fileStats.push(...subFolderStats);
      } else {
         await downloadFile(drive, file.id, filePath, parseInt(file.size));
         const downloadUrl = await getFileDownloadUrl({ drive, fileId: file.id });
         const directDownloadUrl = convertTodirectDownloadUrl(downloadUrl);
         fileStats.push({
            fileName: file.name,
            filePath: filePath,
            fileSize: parseInt(file.size),
            fileUrl: downloadUrl,
            fileType: path.extname(filePath).substring(1),
            downloadUrl: directDownloadUrl
         });
      }
   }

   return fileStats;
};

const findFolderIdByUrl = async (drive: any, folderUrl: string): Promise<string> => {
   const folderIdMatch = folderUrl.match(/[-\w]{25,}/);
   if (folderIdMatch) {
      return folderIdMatch[0];
   }
   throw new Error('Invalid folder URL');
};

const findFolderIdByName = async (drive: any, folderName: string): Promise<string> => {
   const res = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
   });
   if (res.data.files.length > 0) {
      return res.data.files[0].id;
   }
   throw new Error('Folder not found');
};

export const folderDownload = async ({ folderId, folderUrl, folderName, destinationPath }: DownloadFolderParams): Promise<FolderResult> => {
   const auth = await getAuthClient();
   const drive = google.drive({ version: 'v3', auth });

   try {
      await fsPromises.mkdir(destinationPath, { recursive: true });

      if (!folderId) {
         if (folderUrl) {
            folderId = await findFolderIdByUrl(drive, folderUrl);
         } else if (folderName) {
            folderId = await findFolderIdByName(drive, folderName);
         } else {
            throw new Error('No folder identifier provided');
         }
      }

      const fileStats = await downloadFolder(drive, folderId, destinationPath);
      const folderMetadata = await drive.files.get({
         fileId: folderId,
         fields: 'id, name, createdTime, modifiedTime'
      });

      const finalPath = path.join(destinationPath, folderMetadata.data.name);
      const folderUrlResult = `https://drive.google.com/drive/folders/${folderId}`;

      // Integrate getFileStats
      const stats = await getFileStats(drive, folderId, destinationPath);

      return {
         status: true,
         folderId: folderMetadata.data.id,
         folderUrl: folderUrlResult,
         folderName: folderMetadata.data.name,
         fileCount: fileStats.length,
         destPath: finalPath,
         createdTime: formatDate(folderMetadata.data.createdTime),
         modifiedTime: formatDate(folderMetadata.data.modifiedTime),
         message: 'Folder downloaded successfully',
         fileStats: stats
      };
   } catch (error) {
      console.error(`Error during folder download: ${(error as Error).message}`);
      return {
         status: false,
         folderId: '',
         folderUrl: '',
         folderName: '',
         fileCount: 0,
         folderPath: '',
         createdTime: '',
         modifiedTime: '',
         message: `Error during folder download: ${(error as Error).message}`,
         fileStats: []
      } as FolderResult;
   }
};
