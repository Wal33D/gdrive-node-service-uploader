import path from 'path';
import ProgressBar from 'progress';
import { uploadFileToGoogleDrive } from '../fileUpload';

const uploadExample = async () => {
   const baseDir = path.resolve(__dirname, '..', '..'); // Navigate one directory up
   const filePath = path.join(baseDir, 'example_archive.zip');

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
         console.log('File uploaded successfully.');
      } else {
         console.error('Upload failed.');
      }
   } catch (error) {
      console.error('Error during file upload:', error);
   }
};

uploadExample();
