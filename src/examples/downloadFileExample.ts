import path from 'path';
import ProgressBar from 'progress';
import { downloadFileFromGoogleDrive } from '../fileDownload';

const fileId = '1cdhMpL2dLfsHndmf4V9FgDn01QK_v_05';
const fileUrl = 'https://drive.google.com/file/d/1cdhMpL2dLfsHndmf4V9FgDn01QK_v_05/view?usp=drivesdk';
const fileName = 'renamed_again_example_archive.zip';
const baseDir = path.resolve(__dirname, '..', '..');
const downloadPath = path.join(baseDir, 'example_archive.zip');

const downloadFileExample = async () => {
   try {
      const downloadProgressBar = new ProgressBar('Downloading [:bar] :percent :etas', {
         total: 100,
         width: 40,
         complete: '=',
         incomplete: ' '
      });

      // Example using fileName
      const resultByName = await downloadFileFromGoogleDrive({
         fileName,
         downloadPath,
         onProgress: (progress) => downloadProgressBar.update(progress / 100)
      });
      console.log(resultByName);
      console.log('\n' + resultByName.message);

      // Example using fileId
      const resultById = await downloadFileFromGoogleDrive({
         fileId,
         downloadPath,
         onProgress: (progress) => downloadProgressBar.update(progress / 100)
      });
      console.log(resultById);
      console.log('\n' + resultById.message);

      // Example using fileUrl
      const resultByUrl = await downloadFileFromGoogleDrive({
         fileUrl,
         downloadPath,
         onProgress: (progress) => downloadProgressBar.update(progress / 100)
      });
      console.log(resultByUrl);
      console.log('\n' + resultByUrl.message);
   } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
   }
};

downloadFileExample();
