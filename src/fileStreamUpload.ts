import { google } from 'googleapis';
import { getAuthClient, getFileDownloadUrl, makeFilePublic, convertTodirectDownloadUrl } from './utils';
import { Readable } from 'stream';

interface UploadFileParams {
   buffer: Buffer;
   fileName: string;
   parentFolderId: string;
}

interface UploadFileResult {
   status: boolean;
   fileId?: string;
   fileUrl?: string;
   message: string;
}

const bufferToStream = (buffer: Buffer): Readable => {
   const readable = new Readable();
   readable._read = () => {};
   readable.push(buffer);
   readable.push(null);
   return readable;
};

const findExistingFileId = async (drive: any, name: string, parentFolderId: string) => {
   const res = await drive.files.list({
      q: `name='${name}' and '${parentFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, parents, size, createdTime, modifiedTime, description)'
   });
   return res.data.files.length > 0 ? res.data.files[0] : null;
};

export const fileStreamUpload = async ({ buffer, fileName, parentFolderId }: UploadFileParams): Promise<UploadFileResult> => {
   const auth = await getAuthClient();
   const drive = google.drive({ version: 'v3', auth });

   const fileSize = buffer.length;
   console.log(`Uploading file: ${fileName}, size: ${fileSize} bytes`);

   const existingFile = await findExistingFileId(drive, fileName, parentFolderId);

   if (existingFile && Number(existingFile.size) === fileSize) {
      console.log(`File ${fileName} already exists with the same size. Skipping upload.`);
      const downloadUrl = await getFileDownloadUrl({ drive, fileId: existingFile.id });
      const directDownloadLink = convertTodirectDownloadUrl(downloadUrl);
      return { status: true, fileId: existingFile.id, fileUrl: directDownloadLink, message: 'File already exists with the same size.' };
   }

   const fileMetadata: any = {
      name: fileName,
      parents: [parentFolderId]
   };
   const media = {
      mimeType: 'application/octet-stream',
      body: bufferToStream(buffer)
   };

   let res;
   try {
      if (existingFile) {
         res = await drive.files.update({
            fileId: existingFile.id,
            requestBody: fileMetadata,
            media,
            fields: 'id'
         });
      } else {
         res = await drive.files.create({
            requestBody: fileMetadata,
            media,
            fields: 'id'
         });
      }

      if (res.data.id) {
         await makeFilePublic({ drive, fileId: res.data.id });
         const downloadUrl = await getFileDownloadUrl({ drive, fileId: res.data.id });
         const directDownloadLink = convertTodirectDownloadUrl(downloadUrl);
         console.log(`Uploaded file ${fileName} successfully.`);
         return { status: true, fileId: res.data.id, fileUrl: directDownloadLink, message: 'File uploaded successfully.' };
      } else {
         throw new Error('File ID is null or undefined.');
      }
   } catch (error) {
      console.error(`Error uploading file ${fileName}:`, error);
      return { status: false, message: `Error uploading file ${fileName}: ${error.message}` };
   }
};
