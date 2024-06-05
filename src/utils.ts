import path from 'path';
import dotenv from 'dotenv';
import { FileStat } from './types';
import { google, Auth } from 'googleapis';

dotenv.config();

let authClient: Auth.OAuth2Client | null = null;

export const getAuthClient = async (serviceAccountKeyFile?: string): Promise<Auth.OAuth2Client> => {
   if (authClient) {
      return authClient;
   }

   const keyFile = serviceAccountKeyFile || process.env.SERVICE_ACCOUNT_KEY_FILE;
   const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON;

   if (!keyFile && !serviceAccountJson) {
      throw new Error('Service account key file path or SERVICE_ACCOUNT_JSON is not defined.');
   }

   const auth = new google.auth.GoogleAuth({
      ...(keyFile ? { keyFile: keyFile } : { credentials: JSON.parse(serviceAccountJson!) }),
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
   });

   authClient = (await auth.getClient()) as Auth.OAuth2Client;
   return authClient;
};

export const getFileDownloadUrl = async ({ drive, fileId }: { drive: any; fileId: string }) => {
   const file = await drive.files.get({
      fileId: fileId,
      fields: 'webViewLink'
   });
   return file.data.webViewLink;
};

export const makeFilePublic = async ({ drive, fileId }: { drive: any; fileId: string }) => {
   await drive.permissions.create({
      fileId: fileId,
      requestBody: {
         role: 'reader',
         type: 'anyone'
      }
   });
};

export const extractFileIdFromUrl = ({ fileUrl }: { fileUrl: string }): string => {
   const match = fileUrl.match(/\/d\/(.*?)\/|id=(.*?)(&|$)/);
   if (match) {
      return match[1] || match[2];
   }
   throw new Error('Invalid Google Drive URL');
};

export const validateFileIdOrUrl = ({ fileId, fileUrl }: { fileId?: string; fileUrl?: string }): string => {
   if (!fileId && !fileUrl) {
      throw new Error('File ID or URL must be provided.');
   }
   if (fileUrl) {
      return extractFileIdFromUrl({ fileUrl });
   }
   return fileId!;
};
export const makeFolderPublic = async ({ drive, folderId }: { drive: any; folderId: string }) => {
   await drive.permissions.create({
      fileId: folderId,
      requestBody: {
         role: 'reader',
         type: 'anyone'
      }
   });
};

export const formatDate = (dateString: string) => {
   if (!dateString) return '';
   const date = new Date(dateString);
   return date.toLocaleString('en-US', { timeZone: 'UTC' });
};
// Utility function to convert to direct download link
export function convertTodirectDownloadUrl(driveLink: string): string {
   const fileId = driveLink.match(/\/d\/(.*?)\//)?.[1];
   if (!fileId) {
      throw new Error('Invalid Google Drive link');
   }
   return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export const getFileStats = async (drive: any, folderId: string, destinationPath: string): Promise<FileStat[]> => {
   const files = await drive.files
      .list({
         q: `'${folderId}' in parents and trashed=false`,
         fields: 'files(id, name, mimeType, size, parents)'
      })
      .then((res: { data: { files: any } }) => res.data.files || []);

   const fileStats: FileStat[] = [];
   for (const file of files) {
      const filePath = path.join(destinationPath, file.name);
      if (file.mimeType === 'application/vnd.google-apps.folder') {
         const subFolderStats = await getFileStats(drive, file.id, filePath);
         fileStats.push(...subFolderStats);
      } else {
         const downloadUrl = await getFileDownloadUrl({ drive, fileId: file.id });
         const directDownloadUrl = convertTodirectDownloadUrl(downloadUrl);
         fileStats.push({
            fileName: file.name,
            filePath: filePath,
            fileSize: parseInt(file.size || '0'),
            fileUrl: downloadUrl,
            fileType: path.extname(filePath).substring(1),
            downloadUrl: directDownloadUrl
         });
      }
   }
   return fileStats;
};

export const findExistingFileId = async (drive: any, name: string, parentFolderId: string) => {
   const res = await drive.files.list({
      q: `name='${name}' and '${parentFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, parents, size, createdTime, modifiedTime, description)'
   });
   return res.data.files.length > 0 ? res.data.files[0].id : null;
};
