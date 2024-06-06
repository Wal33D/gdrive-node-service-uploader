import { google } from 'googleapis';
import { FileStat, FolderResult, UploadFolderStreamParams } from './types';
import { convertTodirectDownloadUrl, formatDate, getAuthClient, getFileDownloadUrl, makeFilePublic, makeFolderPublic } from './utils';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

const findExistingFileId = async (drive: any, name: string, parentFolderId: string) => {
   const res = await drive.files.list({
      q: `name='${name}' and '${parentFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, parents, size, createdTime, modifiedTime, description)'
   });
   return res.data.files.length > 0 ? res.data.files[0] : null;
};

const bufferToStream = (buffer: Buffer): Readable => {
   const readable = new Readable();
   readable._read = () => {};
   readable.push(buffer);
   readable.push(null);
   return readable;
};

const uploadFileFromMemory = async (drive: any, file: { buffer: Buffer; name: string }, folderId: string) => {
   const fileName = file.name;
   const fileSize = file.buffer.length;
   console.log(`Uploading file: ${fileName}, size: ${fileSize} bytes`);

   const existingFile = await findExistingFileId(drive, fileName, folderId);

   if (existingFile && Number(existingFile.size) === fileSize) {
      console.log(`File ${fileName} already exists with the same size. Skipping upload.`);
      const downloadUrl = await getFileDownloadUrl({ drive, fileId: existingFile.id });
      const directDownloadLink = convertTodirectDownloadUrl(downloadUrl);
      return { status: true, fileId: existingFile.id, downloadUrl, directDownloadLink, updated: false };
   }

   const fileMetadata: any = {
      name: fileName,
      parents: [folderId]
   };
   const media = {
      mimeType: 'application/octet-stream',
      body: bufferToStream(file.buffer) // Convert buffer to readable stream
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
         return { status: true, fileId: res.data.id, downloadUrl, directDownloadLink, updated: true };
      } else {
         throw new Error('File ID is null or undefined.');
      }
   } catch (error) {
      console.error(`Error uploading file ${fileName}:`, error);
      throw error;
   }
};

const createOrUpdateDriveFolder = async (drive: any, folderName: string, parentFolderId: string) => {
   console.log(`Creating or updating folder: ${folderName} in parent folder ID: ${parentFolderId}`);

   // Validate the parent folder ID
   try {
      const parentFolder = await drive.files.get({
         fileId: parentFolderId,
         fields: 'id, name, mimeType'
      });
      if (!parentFolder.data || parentFolder.data.mimeType !== 'application/vnd.google-apps.folder') {
         throw new Error(`Parent folder ID ${parentFolderId} is not a valid folder.`);
      }
   } catch (error) {
      console.error(`Error validating parent folder ID ${parentFolderId}:`, error);
      throw error;
   }

   const existingFolder = await findExistingFileId(drive, folderName, parentFolderId);
   const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
   };

   let res;
   let updated = false;
   try {
      if (existingFolder) {
         res = await drive.files.update({
            fileId: existingFolder.id,
            requestBody: { name: folderName }, // Only update name
            addParents: parentFolderId,
            removeParents: existingFolder.parents.join(','),
            fields: 'id, webViewLink, createdTime, modifiedTime, description'
         });
         updated = true;
      } else {
         res = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id, webViewLink, createdTime, modifiedTime, description'
         });
      }

      if (res.data.id) {
         await makeFolderPublic({ drive, folderId: res.data.id });
         console.log(`Folder ${folderName} created/updated successfully.`);
         return {
            id: res.data.id,
            webViewLink: res.data.webViewLink,
            updated,
            createdTime: res.data.createdTime,
            modifiedTime: res.data.modifiedTime,
            description: res.data.description
         };
      } else {
         throw new Error('Failed to create or update folder.');
      }
   } catch (error) {
      console.error(`Error creating or updating folder ${folderName}:`, error);
      throw error;
   }
};

export const folderStreamUpload = async ({
   files,
   folderName,
   excludeExtensions = [],
   parentFolderId = 'root'
}: UploadFolderStreamParams): Promise<FolderResult> => {
   if (!files || !folderName || !parentFolderId) {
      throw new Error('No files, folder name, or parent folder ID provided for the folder to upload.');
   }

   const auth = await getAuthClient();
   const drive = google.drive({ version: 'v3', auth });

   let status = false;
   let message = '';
   let folderId = '';
   let folderUrl = '';
   let updated = false;
   let fileCount = 0;
   let createdTime = '';
   let modifiedTime = '';
   const fileStats: FileStat[] = [];

   try {
      const {
         id,
         webViewLink,
         updated: folderUpdated,
         createdTime: folderCreatedTime,
         modifiedTime: folderModifiedTime
      } = await createOrUpdateDriveFolder(drive, folderName, parentFolderId);
      folderId = id;
      folderUrl = webViewLink;
      updated = folderUpdated;
      createdTime = folderCreatedTime;
      modifiedTime = folderModifiedTime;

      for (const file of files) {
         const fileExtension = path.extname(file.name).substring(1);
         if (excludeExtensions.includes(fileExtension)) {
            continue;
         }

         const fileResult = await uploadFileFromMemory(drive, file, folderId);
         updated = updated || fileResult.updated;
         fileCount++;
         fileStats.push({
            fileName: file.name,
            fileSize: file.buffer.length,
            fileType: fileExtension,
            fileUrl: fileResult.directDownloadLink
         });
      }

      status = true;
      message = 'Folder uploaded or updated successfully.';
   } catch (error) {
      message = `Error during folder upload: ${(error as Error).message}`;
   }

   return {
      status,
      updated,
      folderId,
      folderUrl,
      folderName,
      fileCount,
      createdTime: formatDate(createdTime),
      modifiedTime: formatDate(modifiedTime),
      message,
      fileStats
   };
};
