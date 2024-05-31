export interface UploadFileParams {
   filePath: string;
   onProgress?: (progress: number) => void;
   description?: string;
}

export interface DownloadFileParams {
   fileId?: string;
   fileName?: string;
   fileUrl?: string;
   downloadPath?: string;
   onProgress?: (progress: number) => void;
}

export interface FileParams {
   fileId?: string;
   fileUrl?: string;
   fileName?: string;
   newName?: string;
}

export interface FileExistsResult {
   exists: boolean;
   fileId?: string;
   fileName?: string;
   fileSize?: number;
   modifiedTime?: string;
   fileUrl?: string;
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
