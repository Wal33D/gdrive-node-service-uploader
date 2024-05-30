import path from 'path';
import ProgressBar from 'progress';
import { uploadFileToGoogleDrive } from './fileUpload';
import { deleteFileFromGoogleDrive } from './fileDelete';
import { downloadFileFromGoogleDrive } from './fileDownload';

const uploadAndDownloadExample = async () => {
   const baseDir = path.resolve(__dirname, '..'); // Navigate one directory up
   const filePath = path.join(baseDir, 'example_archive.zip');
   const downloadPath = path.join(baseDir, 'example_archive_downloaded.zip');

   try {
      const uploadProgressBar = new ProgressBar('Uploading [:bar] :percent :etas', {
         total: 100,
         width: 40,
         complete: '=',
         incomplete: ' '
      });

      const uploadResult = await uploadFileToGoogleDrive({
         filePath,
         onProgress: (progress: number) => {
            uploadProgressBar.update(progress / 100);
         }
      });
      console.log('\nUpload result:', uploadResult);

      if (uploadResult.status) {
         console.log('File uploaded successfully. Initiating download...');

         const downloadProgressBar = new ProgressBar('Downloading [:bar] :percent :etas', {
            total: 100,
            width: 40,
            complete: '=',
            incomplete: ' '
         });

         const downloadResult = await downloadFileFromGoogleDrive({
            fileId: uploadResult.downloadUrl.split('/')[5],
            downloadPath,
            onProgress: (progress: number) => {
               downloadProgressBar.update(progress / 100);
            }
         });

         console.log('\nDownload result:', downloadResult);

         if (downloadResult.status) {
            console.log('File downloaded successfully. Initiating deletion...');

            const deleteResult = await deleteFileFromGoogleDrive({
               url: uploadResult.downloadUrl // Using URL for deletion
            });

            console.log('Delete result:', deleteResult);
         } else {
            console.error('Download failed. Skipping deletion.');
         }
      } else {
         console.error('Upload failed. Skipping download and deletion.');
      }
   } catch (error) {
      console.error('Error during file operations:', error);
   }
};

uploadAndDownloadExample();
