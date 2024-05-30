import dotenv from 'dotenv';
import { google, Auth } from 'googleapis';

dotenv.config();

let authClient: Auth.OAuth2Client | null = null;

export const getAuthClient = async (serviceAccountKeyFile?: string): Promise<Auth.OAuth2Client> => {
   if (authClient) {
      return authClient;
   }

   const keyFile = serviceAccountKeyFile || process.env.SERVICE_ACCOUNT_KEY_FILE;

   if (!keyFile) {
      throw new Error('Service account key file path is not defined.');
   }

   console.log('Authenticating with Google Drive...');
   const auth = new google.auth.GoogleAuth({
      keyFile: keyFile,
      scopes: ['https://www.googleapis.com/auth/drive.file']
   });

   authClient = (await auth.getClient()) as Auth.OAuth2Client;
   console.log('Authentication successful.');
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
   console.log(`File with ID: ${fileId} is now public.`);
};

export const extractFileIdFromUrl = ({ url }: { url: string }): string => {
   const match = url.match(/\/d\/(.*?)\/|id=(.*?)(&|$)/);
   if (match) {
      return match[1] || match[2];
   }
   throw new Error('Invalid Google Drive URL');
};

export const validateFileIdOrUrl = ({ fileId, url }: { fileId?: string; url?: string }): string => {
   if (!fileId && !url) {
      throw new Error('File ID or URL must be provided.');
   }
   if (url) {
      return extractFileIdFromUrl({ url });
   }
   return fileId!;
};
