export interface UploadFileParams {
   filePath: string;
   onProgress?: (progress: number) => void;
   description?: string;
}

export interface DownloadFileParams {
   fileId?: string;
   fileName?: string;
   fileUrl?: string;
   directDownloadLink?: boolean;
   downloadPath?: string;
   onProgress?: (progress: number) => void;
}

export interface FileParams {
   fileId?: string;
   fileUrl?: string;
   fileName?: string;
   newName?: string;
   directDownloadLink?: boolean; // New parameter
}

export interface FileExistsResult {
   exists: boolean;
   fileId?: string;
   fileName?: string;
   fileSize?: number;
   modifiedTime?: string;
   fileUrl?: string;
   directDownloadLink?: string; // New field
   message: string;
}

export interface RenameFileResult {
   status: boolean;
   message: string;
   id?: string;
   name?: string;
   modifiedTime?: string;
   downloadUrl?: string;
}

export interface UploadFolderParams {
   folderPath: string;
   excludeExtensions?: string[];
   description?: string;
}

export interface DownloadFolderParams {
   folderId?: string;
   folderName?: string;
   folderUrl?: string;
   destinationPath: string;
   fileName?: string;
   fileUrl?: string;
}

export interface FileStat {
   fileName: string;
   filePath: string;
   fileSize: number;
   fileUrl: string;
   fileType: string;
   downloadUrl: string;
}

export interface FolderResult {
   status: boolean;
   updated?: boolean;
   folderId: string;
   folderUrl: string;
   folderName: string;
   description?: string;
   fileCount: number;
   srcPath?: string;
   destPath?: string;
   createdTime: string;
   modifiedTime: string;
   message: string;
   fileStats: FileStat[];
}
