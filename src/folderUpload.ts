import path from 'path';
import { google } from 'googleapis';
import { promises as fs } from 'fs';
import { FileStat, FolderResult, UploadFolderParams } from './types';
import { convertTodirectDownloadUrl, formatDate, getAuthClient, getFileDownloadUrl, makeFilePublic, makeFolderPublic, getFileStats } from './utils';

const findExistingFileId = async (drive: any, name: string, parentFolderId: string) => {
   const res = await drive.files.list({
      q: `name='${name}' and '${parentFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, parents, size, createdTime, modifiedTime, description)'
   });
   return res.data.files.length > 0 ? res.data.files[0] : null;
};

const getFolderDetails = async (drive: any, folderId: string) => {
   const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, size, createdTime, modifiedTime)'
   });
   const files = res.data.files || [];
   const fileCount = files.length;
   const totalSize = files.reduce((sum: number, file: { size: any }) => sum + Number(file.size || 0), 0);
   const createdTime = res.data.files.length > 0 ? files[0].createdTime : '';
   const modifiedTime = res.data.files.length > 0 ? files[0].modifiedTime : '';
   return { fileCount, totalSize, createdTime, modifiedTime };
};

const getLocalFolderDetails = async (folderPath: string, excludeExtensions: string[] = []) => {
   const entries = await fs.readdir(folderPath, { withFileTypes: true });
   let fileCount = 0;
   let totalSize = 0;
   const fileStats: FileStat[] = [];

   for (const entry of entries) {
      const entryPath = path.join(folderPath, entry.name);
      const fileExtension = path.extname(entryPath).substring(1);
      if (excludeExtensions.includes(fileExtension)) {
         continue;
      }

      if (entry.isFile()) {
         const stats = await fs.stat(entryPath);
         totalSize += stats.size;
         fileCount++;
         fileStats.push({
            fileName: entry.name,
            filePath: entryPath,
            fileSize: stats.size,
            fileUrl: '',
            fileType: fileExtension,
            downloadUrl: ''
         });
      } else if (entry.isDirectory()) {
         const { fileCount: subFileCount, totalSize: subTotalSize, fileStats: subFileStats } = await getLocalFolderDetails(entryPath, excludeExtensions);
         fileCount += subFileCount;
         totalSize += subTotalSize;
         fileStats.push(...subFileStats);
      }
   }

   return { fileCount, totalSize, fileStats };
};

const uploadFile = async (drive: any, filePath: string, folderId: string) => {
   const fileName = path.basename(filePath);
   const fileSize = (await fs.stat(filePath)).size;
   const existingFile = await findExistingFileId(drive, fileName, folderId);

   if (existingFile && Number(existingFile.size) === fileSize) {
      const downloadUrl = await getFileDownloadUrl({ drive, fileId: existingFile.id });
      const directDownloadLink = convertTodirectDownloadUrl(downloadUrl);
      return { status: true, fileId: existingFile.id, downloadUrl, directDownloadLink, updated: false };
   }

   const fileMetadata: any = {
      name: fileName
   };
   const media = {
      mimeType: 'application/octet-stream',
      body: (await fs.open(filePath, 'r')).createReadStream()
   };

   let res;
   if (existingFile) {
      res = await drive.files.update({
         fileId: existingFile.id,
         addParents: folderId,
         removeParents: existingFile.parents.join(','),
         requestBody: fileMetadata,
         media,
         fields: 'id'
      });
   } else {
      fileMetadata.parents = [folderId];
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
      return { status: true, fileId: res.data.id, downloadUrl, directDownloadLink, updated: true };
   } else {
      throw new Error('File ID is null or undefined.');
   }
};

const createOrUpdateDriveFolder = async (drive: any, folderName: string, description?: string, parentFolderId?: string) => {
   const existingFolder = await findExistingFileId(drive, folderName, parentFolderId || 'root');
   const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
   };
   if (description) {
      fileMetadata.description = description;
   }

   let res;
   let updated = false;
   if (existingFolder) {
      res = await drive.files.update({
         fileId: existingFolder.id,
         requestBody: fileMetadata,
         fields: 'id, webViewLink, createdTime, modifiedTime, description'
      });
      updated = true;
   } else {
      if (parentFolderId) {
         fileMetadata.parents = [parentFolderId];
      }
      res = await drive.files.create({
         requestBody: fileMetadata,
         fields: 'id, webViewLink, createdTime, modifiedTime, description'
      });
   }

   if (res.data.id) {
      await makeFolderPublic({ drive, folderId: res.data.id });
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
};

export const folderUpload = async ({ folderPath, description, excludeExtensions = [] }: UploadFolderParams): Promise<FolderResult> => {
   if (!folderPath) {
      throw new Error('No folder path provided for the folder to upload.');
   }

   const auth = await getAuthClient();
   const drive = google.drive({ version: 'v3', auth });
   const folderName = path.basename(folderPath);

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
         modifiedTime: folderModifiedTime,
         description: folderDescription
      } = await createOrUpdateDriveFolder(drive, folderName, description);
      folderId = id;
      folderUrl = webViewLink;
      updated = folderUpdated;
      createdTime = folderCreatedTime;
      modifiedTime = folderModifiedTime;

      const existingFolder = await findExistingFileId(drive, folderName, 'root');
      if (existingFolder) {
         const localFolderDetails = await getLocalFolderDetails(folderPath, excludeExtensions);
         const driveFolderDetails = await getFolderDetails(drive, existingFolder.id);

         if (localFolderDetails.fileCount === driveFolderDetails.fileCount && localFolderDetails.totalSize === driveFolderDetails.totalSize) {
            const fileStatsWithUrls = await Promise.all(
               localFolderDetails.fileStats.map(async (file: FileStat) => {
                  const existingFile = await findExistingFileId(drive, file.fileName, existingFolder.id);
                  const fileUrl = existingFile ? await getFileDownloadUrl({ drive, fileId: existingFile.id }) : '';
                  const downloadUrl = fileUrl ? convertTodirectDownloadUrl(fileUrl) : '';
                  return { ...file, fileUrl, downloadUrl };
               })
            );
            return {
               status: true,
               updated: false,
               folderId,
               folderUrl,
               folderName,
               description: folderDescription,
               fileCount: driveFolderDetails.fileCount,
               srcPath: folderPath,
               createdTime: formatDate(driveFolderDetails.createdTime),
               modifiedTime: formatDate(driveFolderDetails.modifiedTime),
               message: 'Folder already exists with the same content.',
               fileStats: fileStatsWithUrls
            };
         }
      }

      const uploadFolderRecursively = async (statusFolderPath: string, statusFolderId: string) => {
         const entries = await fs.readdir(statusFolderPath, { withFileTypes: true });

         for (const entry of entries) {
            const entryPath = path.join(statusFolderPath, entry.name);
            const fileExtension = path.extname(entryPath).substring(1);
            if (excludeExtensions.includes(fileExtension)) {
               continue;
            }

            if (entry.isDirectory()) {
               const subfolder = await createOrUpdateDriveFolder(drive, entry.name, undefined, statusFolderId);
               updated = updated || subfolder.updated;
               await uploadFolderRecursively(entryPath, subfolder.id);
            } else {
               const fileResult = await uploadFile(drive, entryPath, statusFolderId);
               updated = updated || fileResult.updated;
               fileCount++;
               fileStats.push({
                  fileName: entry.name,
                  filePath: entryPath,
                  fileSize: (await fs.stat(entryPath)).size,
                  fileUrl: fileResult.downloadUrl,
                  fileType: fileExtension,
                  downloadUrl: fileResult.directDownloadLink
               });
            }
         }
      };

      await uploadFolderRecursively(folderPath, folderId);

      // Integrate getFileStats here, avoiding duplicates
      const uploadedFileStats = await getFileStats(drive, folderId, folderPath);
      const uniqueFileStats = Array.from(new Map(fileStats.map((item) => [item.filePath, item])).values());
      uniqueFileStats.push(...uploadedFileStats);

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
      description,
      fileCount,
      srcPath: folderPath,
      createdTime: formatDate(createdTime),
      modifiedTime: formatDate(modifiedTime),
      message,
      fileStats: Array.from(new Map(fileStats.map((item) => [item.filePath, item])).values()) // Ensure no duplicates
   };
};
