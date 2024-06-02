import { fileExists } from '../fileExists';

const fileId = '1cdhMpL2dLfsHndmf4V9FgDn01QK_v_05';
const fileUrl = 'https://drive.google.com/file/d/1cdhMpL2dLfsHndmf4V9FgDn01QK_v_05/view?usp=drivesdk';
const fileName = 'manic-miners-latest.zip';

const checkFileExample = async () => {
   try {
      // Example using fileName
      const resultByName = await fileExists({ fileName });
      console.log(resultByName.message);
      if (resultByName.exists) {
         console.log(resultByName);
         console.log(`ID: ${resultByName.fileId}, Name: ${resultByName.fileName}, Last Modified: ${resultByName.modifiedTime}`);
      }
   } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
   }
};

checkFileExample();
