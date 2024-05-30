import { fileExists } from '../fileExists';

const fileId = '17YGQ4jNm8WiJ4NmHmkX3BOfxtSDhEOtF';
const fileUrl = 'https://drive.google.com/file/d/1HRmETDPMHlHtHpIZCMJP0JjB9AeX_PgU/view?usp=drivesdk';
const fileName = 'example_archive.zip';

const checkFileExample = async () => {
   try {
      // Example using fileName
      const resultByName = await fileExists({ fileId });
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
