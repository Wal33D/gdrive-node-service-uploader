export interface UploadFileParams {
   filePath: string;
   onProgress?: (progress: number) => void;
}

export interface DownloadFileParams {
   fileId?: string;
   downloadPath?: string;
   url?: string;
   onProgress?: (progress: number) => void;
}

export interface DeleteFileParams {
   fileId?: string;
   url?: string;
}
